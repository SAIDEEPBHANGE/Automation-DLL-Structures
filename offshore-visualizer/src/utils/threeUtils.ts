import * as THREE from "three";

export const NODE_RADIUS = 12;

export const COLORS = {
  selected: new THREE.Color(0xf59e0b),
  neighbor: new THREE.Color(0x38bdf8),
  dimmed: new THREE.Color(0x111827),
  normal: new THREE.Color(0x3b82f6),
  vendor: new THREE.Color(0x334155),
  edgeDefault: new THREE.Color(0.08, 0.12, 0.22),
  edgeActive: new THREE.Color(0.96, 0.62, 0.04),
  edgeHidden: new THREE.Color(0, 0, 0),
};

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function computeBaseRadius(totalNodes: number): number {
  return Math.max(1200, Math.sqrt(totalNodes) * 65);
}

export function fibonacciSpherePosition(idx: number, total: number, radius: number): THREE.Vector3 {
  const phi = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (idx / (total - 1 || 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = phi * idx;
  return new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius);
}

/** Distance that fits the whole sphere for both portrait and landscape viewports. */
export function computeFramingDistance(radius: number, fovDeg: number, aspect: number): number {
  const vHalf = (fovDeg * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.35;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Name badge shown above the focal node and its direct neighbors. */
export function createLabelSprite(text: string, isFocal: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = isFocal ? "rgba(245, 158, 11, 0.95)" : "rgba(15, 23, 42, 0.92)";
    roundRect(ctx, 16, 16, 480, 96, 24);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = isFocal ? "#ffffff" : "#38bdf8";
    ctx.stroke();
    ctx.fillStyle = isFocal ? "#000000" : "#ffffff";
    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.length > 28 ? `${text.slice(0, 27)}…` : text, 256, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(isFocal ? 600 : 450, isFocal ? 150 : 112, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function createIdMaterial(id: number): THREE.SpriteMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
    ctx.strokeText(String(id), 64, 34);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(id), 64, 34);
  }
  return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
}

/**
 * Draws the numeric ID on the surface of every bubble near the camera.
 * Materials are cached per ID and only the closest nodes get a sprite.
 */
export class IdLabelPool {
  private readonly materials = new Map<number, THREE.SpriteMaterial>();
  private readonly active = new Map<number, THREE.Sprite>();
  private readonly idle: THREE.Sprite[] = [];

  private readonly group: THREE.Group;
  private readonly maxDistance: number;
  private readonly maxLabels: number;

  constructor(group: THREE.Group, maxDistance = 1000, maxLabels = 150) {
    this.group = group;
    this.maxDistance = maxDistance;
    this.maxLabels = maxLabels;
  }

  update(camera: THREE.Camera, ids: number[], positions: THREE.Vector3[], radii: Float32Array) {
    const cam = camera.position;
    const max2 = this.maxDistance * this.maxDistance;
    const near: Array<{ i: number; d: number }> = [];
    for (let i = 0; i < ids.length; i++) {
      const d = positions[i].distanceToSquared(cam);
      if (d < max2) near.push({ i, d });
    }
    near.sort((a, b) => a.d - b.d);
    const keep = new Set<number>();
    const dir = new THREE.Vector3();

    near.slice(0, this.maxLabels).forEach(({ i }) => {
      const id = ids[i];
      keep.add(id);
      let sprite = this.active.get(id);
      if (!sprite) {
        sprite = this.acquire(id);
        this.active.set(id, sprite);
        this.group.add(sprite);
      }
      const r = radii[i];
      dir.copy(cam).sub(positions[i]).normalize();
      sprite.position.copy(positions[i]).addScaledVector(dir, r * 1.08);
      sprite.scale.set(r * 2.2, r * 1.1, 1);
    });

    this.active.forEach((sprite, id) => {
      if (!keep.has(id)) {
        this.group.remove(sprite);
        this.idle.push(sprite);
        this.active.delete(id);
      }
    });
  }

  private acquire(id: number): THREE.Sprite {
    let mat = this.materials.get(id);
    if (!mat) {
      mat = createIdMaterial(id);
      this.materials.set(id, mat);
    }
    const sprite = this.idle.pop() ?? new THREE.Sprite(mat);
    sprite.material = mat;
    sprite.renderOrder = 10;
    return sprite;
  }

  dispose() {
    this.active.forEach((s) => this.group.remove(s));
    this.active.clear();
    this.idle.length = 0;
    this.materials.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    this.materials.clear();
  }
}
