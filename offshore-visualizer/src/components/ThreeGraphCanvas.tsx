import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box, Paper, Typography } from "@mui/material";
import type { MasterGraphPayload } from "../types/graph";
import { buildAdjacency } from "../utils/graphUtils";
import { isVendorDll } from "../utils/dllClassifier";
import { prefersReducedMotion } from "../utils/motion";
import {
  COLORS,
  IdLabelPool,
  NODE_RADIUS,
  computeBaseRadius,
  computeFramingDistance,
  createLabelSprite,
  easeInOutCubic,
  fibonacciSpherePosition,
} from "../utils/threeUtils";

interface ThreeGraphCanvasProps {
  data: MasterGraphPayload | null;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
}

interface CameraTween {
  start: number;
  duration: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

const FOCUS_DISTANCE = 450;
const TWEEN_MS = 700;

export const ThreeGraphCanvas: React.FC<ThreeGraphCanvasProps> = ({
  data,
  selectedNodeId,
  onNodeClick,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const lineMeshRef = useRef<THREE.LineSegments | null>(null);
  const badgeGroupRef = useRef<THREE.Group | null>(null);
  const idPoolRef = useRef<IdLabelPool | null>(null);
  const onNodeClickRef = useRef(onNodeClick);

  const positionsRef = useRef<THREE.Vector3[]>([]);
  const indexToIdRef = useRef<number[]>([]);
  const idToIndexRef = useRef<Map<number, number>>(new Map());
  const idToNameRef = useRef<Map<number, string>>(new Map());
  const adjacencyRef = useRef<Map<number, Set<number>>>(new Map());
  const edgesRef = useRef<Array<[number, number]>>([]);
  const overviewRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const curScaleRef = useRef<Float32Array>(new Float32Array(0));
  const targetScaleRef = useRef<Float32Array>(new Float32Array(0));
  const radiiRef = useRef<Float32Array>(new Float32Array(0));
  const focalIndexRef = useRef<number>(-1);
  const tweenRef = useRef<CameraTween | null>(null);
  const hadSelectionRef = useRef(false);

  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // 1. Scene, renderer, controls, interaction, animation loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    const badgeGroup = new THREE.Group();
    const idGroup = new THREE.Group();
    scene.add(badgeGroup, idGroup);
    badgeGroupRef.current = badgeGroup;
    const idPool = new IdLabelPool(idGroup);
    idPoolRef.current = idPool;

    const camera = new THREE.PerspectiveCamera(50, width / height, 10, 100000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pickIndex = (clientX: number, clientY: number): number | null => {
      const mesh = instancedMeshRef.current;
      if (!mesh) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObject(mesh)[0];
      return hit?.instanceId ?? null;
    };

    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      // Ignore orbit drags
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const idx = pickIndex(e.clientX, e.clientY);
      onNodeClickRef.current(idx === null ? null : String(indexToIdRef.current[idx]));
    };

    let lastMove = 0;
    let lastHoverId = -1;
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.buttons !== 0) return;
      const now = performance.now();
      if (now - lastMove < 60) return;
      lastMove = now;
      const idx = pickIndex(e.clientX, e.clientY);
      const id = idx === null ? -1 : indexToIdRef.current[idx];
      if (id === lastHoverId) return;
      lastHoverId = id;
      renderer.domElement.style.cursor = id === -1 ? "grab" : "pointer";
      const rect = container.getBoundingClientRect();
      setHover(
        id === -1
          ? null
          : {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              label: `${idToNameRef.current.get(id) ?? "DLL"} (#${id})`,
            },
      );
    };
    const onPointerLeave = () => {
      lastHoverId = -1;
      setHover(null);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const dummy = new THREE.Object3D();
    let raf = 0;
    let frame = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const reduced = prefersReducedMotion();

      const tween = tweenRef.current;
      if (tween) {
        const t = Math.min(1, (now - tween.start) / tween.duration);
        const k = easeInOutCubic(t);
        camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
        if (t >= 1) tweenRef.current = null;
      }

      const mesh = instancedMeshRef.current;
      if (mesh) {
        const cur = curScaleRef.current;
        const target = targetScaleRef.current;
        const radii = radiiRef.current;
        const focal = focalIndexRef.current;
        let dirty = false;
        for (let i = 0; i < cur.length; i++) {
          let goal = target[i];
          if (i === focal && !reduced) goal *= 1 + 0.1 * Math.sin(now / 280);
          const diff = goal - cur[i];
          if (Math.abs(diff) > 0.0005) {
            cur[i] = reduced ? goal : cur[i] + diff * 0.18;
            dummy.position.copy(positionsRef.current[i]);
            dummy.scale.setScalar(cur[i]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            radii[i] = NODE_RADIUS * cur[i];
            dirty = true;
          }
        }
        if (dirty) mesh.instanceMatrix.needsUpdate = true;
        if (frame % 3 === 0) {
          idPool.update(camera, indexToIdRef.current, positionsRef.current, radii);
        }
      }

      frame++;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) animate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      idPool.dispose();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  // 2. Build instanced bubbles and edges
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !data) return;

    if (instancedMeshRef.current) {
      scene.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      (instancedMeshRef.current.material as THREE.Material).dispose();
      instancedMeshRef.current.dispose();
      instancedMeshRef.current = null;
    }
    if (lineMeshRef.current) {
      scene.remove(lineMeshRef.current);
      lineMeshRef.current.geometry.dispose();
      (lineMeshRef.current.material as THREE.Material).dispose();
      lineMeshRef.current = null;
    }

    const total = data.dlls.length;
    const baseRadius = computeBaseRadius(total);
    const positions: THREE.Vector3[] = [];
    const indexToId: number[] = [];
    const idToIndex = new Map<number, number>();
    const idToName = new Map<number, string>();

    data.dlls.forEach((dll, idx) => {
      positions.push(fibonacciSpherePosition(idx, total, baseRadius));
      indexToId.push(dll.id);
      idToIndex.set(dll.id, idx);
      idToName.set(dll.id, dll.name);
    });

    positionsRef.current = positions;
    indexToIdRef.current = indexToId;
    idToIndexRef.current = idToIndex;
    idToNameRef.current = idToName;
    adjacencyRef.current = buildAdjacency(data);
    curScaleRef.current = new Float32Array(total).fill(1);
    targetScaleRef.current = new Float32Array(total).fill(1);
    radiiRef.current = new Float32Array(total).fill(NODE_RADIUS);
    focalIndexRef.current = -1;
    hadSelectionRef.current = false;
    tweenRef.current = null;

    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(NODE_RADIUS, 16, 16),
      new THREE.MeshBasicMaterial(),
      total,
    );
    const dummy = new THREE.Object3D();
    data.dlls.forEach((dll, idx) => {
      dummy.position.copy(positions[idx]);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.setColorAt(idx, isVendorDll(dll.name) ? COLORS.vendor : COLORS.normal);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    instancedMeshRef.current = mesh;

    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const edges: Array<[number, number]> = [];
    data.dllEdges.forEach((edge) => {
      const a = idToIndex.get(edge.s);
      const b = idToIndex.get(edge.t);
      if (a === undefined || b === undefined) return;
      const p1 = positions[a];
      const p2 = positions[b];
      linePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      const c = COLORS.edgeDefault;
      lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      edges.push([edge.s, edge.t]);
    });
    edgesRef.current = edges;

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    const lines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 }),
    );
    scene.add(lines);
    lineMeshRef.current = lines;

    const distance = computeFramingDistance(baseRadius, camera.fov, camera.aspect);
    camera.position.set(0, 0, distance);
    controls.target.set(0, 0, 0);
    controls.minDistance = 50;
    controls.maxDistance = distance * 3;
    controls.update();
    overviewRef.current = { pos: camera.position.clone(), target: new THREE.Vector3() };
  }, [data]);

  // 3. Selection: colors, scales, edges, name badges, camera fly-to
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    const badgeGroup = badgeGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!mesh || !badgeGroup || !camera || !controls || !data) return;

    while (badgeGroup.children.length > 0) {
      const child = badgeGroup.children[0] as THREE.Sprite;
      child.material.map?.dispose();
      child.material.dispose();
      badgeGroup.remove(child);
    }

    const idNum = selectedNodeId ? parseInt(selectedNodeId, 10) : null;
    const neighbors = idNum !== null ? adjacencyRef.current.get(idNum) : undefined;
    const target = targetScaleRef.current;

    data.dlls.forEach((dll, idx) => {
      if (idNum === null) {
        mesh.setColorAt(idx, isVendorDll(dll.name) ? COLORS.vendor : COLORS.normal);
        target[idx] = 1;
      } else if (dll.id === idNum) {
        mesh.setColorAt(idx, COLORS.selected);
        target[idx] = 2;
      } else if (neighbors?.has(dll.id)) {
        mesh.setColorAt(idx, COLORS.neighbor);
        target[idx] = 1.4;
      } else {
        mesh.setColorAt(idx, COLORS.dimmed);
        target[idx] = 1;
      }
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    focalIndexRef.current = idNum !== null ? (idToIndexRef.current.get(idNum) ?? -1) : -1;

    const lines = lineMeshRef.current;
    const colorAttr = lines?.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (colorAttr) {
      edgesRef.current.forEach(([s, t], k) => {
        const c =
          idNum === null
            ? COLORS.edgeDefault
            : s === idNum || t === idNum
              ? COLORS.edgeActive
              : COLORS.edgeHidden;
        colorAttr.setXYZ(k * 2, c.r, c.g, c.b);
        colorAttr.setXYZ(k * 2 + 1, c.r, c.g, c.b);
      });
      colorAttr.needsUpdate = true;
    }

    const startTween = (toPos: THREE.Vector3, toTarget: THREE.Vector3) => {
      const duration = prefersReducedMotion() ? 0 : TWEEN_MS;
      if (duration === 0) {
        camera.position.copy(toPos);
        controls.target.copy(toTarget);
        tweenRef.current = null;
        return;
      }
      tweenRef.current = {
        start: performance.now(),
        duration,
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget,
      };
    };

    if (idNum !== null) {
      const focalPos = positionsRef.current[idToIndexRef.current.get(idNum) ?? -1];
      if (focalPos) {
        const addBadge = (id: number, isFocal: boolean) => {
          const p = positionsRef.current[idToIndexRef.current.get(id) ?? -1];
          if (!p) return;
          const sprite = createLabelSprite(`#${id} ${idToNameRef.current.get(id) ?? ""}`, isFocal);
          sprite.position.set(p.x, p.y + (isFocal ? 60 : 40), p.z);
          badgeGroup.add(sprite);
        };
        addBadge(idNum, true);
        neighbors?.forEach((n) => addBadge(n, false));

        const outward = focalPos.clone();
        if (outward.lengthSq() === 0) outward.set(0, 0, 1);
        outward.normalize();
        startTween(focalPos.clone().addScaledVector(outward, FOCUS_DISTANCE), focalPos.clone());
        hadSelectionRef.current = true;
      }
    } else if (hadSelectionRef.current && overviewRef.current) {
      startTween(overviewRef.current.pos.clone(), overviewRef.current.target.clone());
      hadSelectionRef.current = false;
    }
  }, [selectedNodeId, data]);

  return (
    <Box ref={mountRef} sx={{ position: "absolute", inset: 0, overflow: "hidden", cursor: "grab" }}>
      {hover && (
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            left: hover.x + 14,
            top: hover.y + 14,
            px: 1,
            py: 0.5,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <Typography variant="caption">{hover.label}</Typography>
        </Paper>
      )}
    </Box>
  );
};
