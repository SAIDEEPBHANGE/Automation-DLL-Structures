import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MasterGraphPayload } from "../types/graph";

interface ThreeGraphCanvasProps {
  data: MasterGraphPayload | null;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
}

export const ThreeGraphCanvas: React.FC<ThreeGraphCanvasProps> = ({
  data,
  selectedNodeId,
  onNodeClick,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const lineMeshRef = useRef<THREE.LineSegments | null>(null);

  // Position & adjacency lookup
  const nodePositionsRef = useRef<Map<number, THREE.Vector3>>(new Map());
  const adjacencyRef = useRef<Map<number, Set<number>>>(new Map());
  const idToIndexRef = useRef<Map<number, number>>(new Map());
  const indexToIdRef = useRef<number[]>([]);

  // 1. Scene, Camera, WebGLRenderer, Controls, and Raycaster Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    // Adjusted near plane from 0.1 to 10 to eliminate near-clipping slicing
    const camera = new THREE.PerspectiveCamera(50, width / height, 10, 100000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Raycaster for precise node clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!renderer.domElement || !instancedMeshRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(instancedMeshRef.current);

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const clickedId = indexToIdRef.current[intersects[0].instanceId];
        onNodeClick(String(clickedId));
      } else {
        onNodeClick(null);
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current)
        return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [onNodeClick]);

  // 2. Build Geometries & Dynamically Calculate Camera Auto-Fit Distance
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !data) return;

    // Clean up previous buffers
    if (instancedMeshRef.current) {
      scene.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      instancedMeshRef.current = null;
    }
    if (lineMeshRef.current) {
      scene.remove(lineMeshRef.current);
      lineMeshRef.current.geometry.dispose();
      lineMeshRef.current = null;
    }

    const totalNodes = data.dlls.length;
    const nodePositions = new Map<number, THREE.Vector3>();
    const adjacency = new Map<number, Set<number>>();
    const idToIndex = new Map<number, number>();
    const indexToId: number[] = [];

    // Spherical Distribution
    const phi = Math.PI * (3 - Math.sqrt(5));
    const baseRadius = Math.max(1200, Math.sqrt(totalNodes) * 65);

    data.dlls.forEach((dll, idx) => {
      idToIndex.set(dll.id, idx);
      indexToId.push(dll.id);
      adjacency.set(dll.id, new Set());

      const y = 1 - (idx / (totalNodes - 1 || 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * idx;

      const pos = new THREE.Vector3(
        Math.cos(theta) * radiusAtY * baseRadius,
        y * baseRadius,
        Math.sin(theta) * radiusAtY * baseRadius,
      );
      nodePositions.set(dll.id, pos);
    });

    nodePositionsRef.current = nodePositions;
    adjacencyRef.current = adjacency;
    idToIndexRef.current = idToIndex;
    indexToIdRef.current = indexToId;

    // Create Instanced Spheres
    const sphereGeo = new THREE.SphereGeometry(12, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial();
    const instancedMesh = new THREE.InstancedMesh(
      sphereGeo,
      sphereMat,
      totalNodes,
    );

    const dummy = new THREE.Object3D();
    const defaultColor = new THREE.Color(0x3b82f6);
    const vendorColor = new THREE.Color(0x334155);

    data.dlls.forEach((dll, idx) => {
      const pos = nodePositions.get(dll.id)!;
      dummy.position.copy(pos);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);

      const isVendor =
        dll.name.startsWith("Microsoft.") ||
        dll.name.startsWith("Telerik.") ||
        dll.name.startsWith("CefSharp.") ||
        dll.name.startsWith("Xceed.");

      instancedMesh.setColorAt(idx, isVendor ? vendorColor : defaultColor);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor)
      instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // Build LineSegments for Edges
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    data.dllEdges.forEach((edge) => {
      const p1 = nodePositions.get(edge.s);
      const p2 = nodePositions.get(edge.t);

      if (p1 && p2) {
        adjacency.get(edge.s)?.add(edge.t);
        adjacency.get(edge.t)?.add(edge.s);

        linePositions.push(p1.x, p1.y, p1.z);
        linePositions.push(p2.x, p2.y, p2.z);

        lineColors.push(0.08, 0.12, 0.22);
        lineColors.push(0.08, 0.12, 0.22);
      }
    });

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    lineGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(lineColors, 3),
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
    });

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);
    lineMeshRef.current = lineMesh;

    // Calculate Dynamic Auto-Fit Camera Distance based on FOV
    const fovInRadians = (camera.fov * Math.PI) / 180;
    const requiredDistance = (baseRadius / Math.sin(fovInRadians / 2)) * 1.35;

    camera.position.set(0, 0, requiredDistance);
    controls.target.set(0, 0, 0);
    controls.minDistance = 50;
    controls.maxDistance = requiredDistance * 3;
    controls.update();
  }, [data]);

  // 3. Highlight Selected Node & Neighbors, and Fly Camera
  useEffect(() => {
    const instancedMesh = instancedMeshRef.current;
    if (!instancedMesh || !data) return;

    const idNum = selectedNodeId ? parseInt(selectedNodeId, 10) : null;
    const neighbors = idNum ? adjacencyRef.current.get(idNum) : null;

    const selectedColor = new THREE.Color(0xf59e0b); // Amber
    const neighborColor = new THREE.Color(0x38bdf8); // Sky blue
    const dimmedColor = new THREE.Color(0x111827); // Dimmed dark
    const defaultColor = new THREE.Color(0x3b82f6); // Normal blue
    const vendorColor = new THREE.Color(0x334155);

    data.dlls.forEach((dll, idx) => {
      if (!idNum) {
        const isVendor =
          dll.name.startsWith("Microsoft.") ||
          dll.name.startsWith("Telerik.") ||
          dll.name.startsWith("CefSharp.") ||
          dll.name.startsWith("Xceed.");
        instancedMesh.setColorAt(idx, isVendor ? vendorColor : defaultColor);
      } else if (dll.id === idNum) {
        instancedMesh.setColorAt(idx, selectedColor);
      } else if (neighbors && neighbors.has(dll.id)) {
        instancedMesh.setColorAt(idx, neighborColor);
      } else {
        instancedMesh.setColorAt(idx, dimmedColor);
      }
    });

    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    // Camera fly-to when a node is selected
    if (idNum && controlsRef.current && cameraRef.current) {
      const pos = nodePositionsRef.current.get(idNum);
      if (pos) {
        const controls = controlsRef.current;
        const camera = cameraRef.current;
        controls.target.copy(pos);
        camera.position.set(pos.x, pos.y, pos.z + 450);
        controls.update();
      }
    }
  }, [selectedNodeId, data]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        cursor: "grab",
      }}
    />
  );
};
