import type { SearchWorkerRequest, SearchWorkerResponse } from "../types/search";

const listeners = new Set<(message: SearchWorkerResponse) => void>();
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/searchWorker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<SearchWorkerResponse>) => {
      listeners.forEach((listener) => listener(event.data));
    });
  }
  return worker;
}

export function subscribeToSearchWorker(listener: (message: SearchWorkerResponse) => void) {
  listeners.add(listener);
  getWorker();
  return () => {
    listeners.delete(listener);
  };
}

export function postSearchWorkerMessage(message: SearchWorkerRequest) {
  getWorker().postMessage(message);
}
