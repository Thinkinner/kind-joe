import type { WebGLRenderer } from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** Subtle terminal-style bloom; threshold keeps basemap from blowing out. */
export const GLOBE_BLOOM_DESKTOP = {
  strength: 0.48,
  radius: 0.32,
  threshold: 0.88,
} as const;

/** Stronger bloom — heavier GPU; prefer GLOBE_BLOOM_NEON for daily use. */
export const GLOBE_BLOOM_SIGNAL = {
  strength: 0.78,
  radius: 0.52,
  threshold: 0.82,
} as const;

/** Neon read on markers without full-screen bloom cost of GLOBE_BLOOM_SIGNAL. */
export const GLOBE_BLOOM_NEON = {
  strength: 0.5,
  radius: 0.34,
  threshold: 0.88,
} as const;

export function syncBloomDrawingBufferSize(
  bloomPass: UnrealBloomPass,
  renderer: WebGLRenderer,
): void {
  renderer.getDrawingBufferSize(bloomPass.resolution);
}

export function addGlobeBloomPass(
  composer: EffectComposer,
  renderer: WebGLRenderer,
  params: { strength: number; radius: number; threshold: number },
): UnrealBloomPass {
  const v = new Vector2();
  renderer.getDrawingBufferSize(v);
  const bloom = new UnrealBloomPass(v, params.strength, params.radius, params.threshold);
  composer.addPass(bloom);
  return bloom;
}

export function removeGlobeBloomPass(
  composer: EffectComposer,
  bloomPass: UnrealBloomPass,
): void {
  const i = composer.passes.indexOf(bloomPass);
  if (i >= 0) {
    composer.passes.splice(i, 1);
  }
  bloomPass.dispose();
}
