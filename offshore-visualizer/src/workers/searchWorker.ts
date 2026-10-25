/// <reference lib="webworker" />

import type { RawDllDetail } from "../types/detail";
import type {
  SearchIndex as SearchIndexType,
} from "../utils/searchIndex";
import {
  addRowsToIndex,
  createSearchIndex,
  flattenDll,
  runQueryAsync,
} from "../utils/searchIndex";
import type {
  SearchProgress,
  SearchWorkerRequest,
  SearchWorkerResponse,
} from "../types/search";
import { resolveDetailUrl } from "../utils/graphUtils";
import type { Suite } from "../utils/graphUtils";

interface SuiteIndexState {
  generatedAt: string;
  index: SearchIndexType;
  loaded: Set<number>;
  total: number;
  failed: number;
  lastError?: string;
  complete: boolean;
  indexing: boolean;
  latestQueryId: number;
}

const states = new Map<Suite, SuiteIndexState>();
const workerScope = self as DedicatedWorkerGlobalScope;

function send(message: SearchWorkerResponse) {
  workerScope.postMessage(message);
}

function progress(suite: Suite, state: SuiteIndexState): SearchProgress {
  return {
    suite,
    indexed: state.loaded.size,
    total: state.total,
    failed: state.failed,
    lastError: state.lastError,
    complete: state.complete,
  };
}

async function indexSuite(
  suite: Suite,
  state: SuiteIndexState,
  dlls: Array<{ id: number; name: string; detailFile?: string }>,
) {
  if (state.indexing || state.complete) return;
  state.indexing = true;
  let next = 0;
  const loadNext = async () => {
    while (next < dlls.length) {
      const dll = dlls[next++];
      if (state.loaded.has(dll.id)) continue;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${resolveDetailUrl(suite, dll).replace(/^\/+/, "")}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = (await response.json()) as RawDllDetail;
        addRowsToIndex(state.index, flattenDll(raw));
      } catch (error) {
        state.failed += 1;
        state.lastError = `${dll.name}: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        state.loaded.add(dll.id);
        send({ type: "progress", progress: progress(suite, state) });
      }
    }
  };

  await Promise.all(Array.from({ length: 6 }, () => loadNext()));
  state.complete = true;
  state.indexing = false;
  send({ type: "progress", progress: progress(suite, state) });
}

async function query(request: Extract<SearchWorkerRequest, { type: "query" }>) {
  const state = states.get(request.suite);
  if (!state) {
    send({ type: "error", suite: request.suite, message: "Search index has not been initialized." });
    return;
  }
  state.latestQueryId = request.queryId;
  const { queryId } = request;
  const result = await runQueryAsync(
    state.index,
    request.text,
    request.filters,
    request.offset,
    queryId,
    () => state.latestQueryId !== queryId,
  );
  if (result && state.latestQueryId === queryId) {
    send({ type: "results", result, partial: !state.complete });
  }
}

workerScope.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const request = event.data;
  if (request.type === "index") {
    let state = states.get(request.suite);
    if (!state || state.generatedAt !== request.generatedAt) {
      state = {
        generatedAt: request.generatedAt,
        index: createSearchIndex(),
        loaded: new Set(),
        total: request.dlls.length,
        failed: 0,
        complete: false,
        indexing: false,
        latestQueryId: 0,
      };
      states.set(request.suite, state);
    }
    send({ type: "progress", progress: progress(request.suite, state) });
    void indexSuite(request.suite, state, request.dlls);
    return;
  }
  void query(request);
};
