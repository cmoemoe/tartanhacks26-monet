/**
 * Recommendation engine: undertone-based palettes and look steps (lipstick, blush, eyeshadow).
 * Used by scanner (after analysis) and beauty report page (from stored report).
 */

function shade(name, color, reason) {
  return { id: crypto.randomUUID(), name, color, reason };
}

function rgb(r, g, b) {
  return { r, g, b };
}

const palettes = {
  warm: {
    lipstick: [shade("Peach Nude", rgb(0.86, 0.55, 0.44), "Plays up warm/yellow tones."), shade("Terracotta", rgb(0.72, 0.32, 0.24), "Warm earthy flattering."), shade("Warm Rose", rgb(0.80, 0.38, 0.46), "Balanced warm pink.")],
    blush: [shade("Apricot", rgb(0.92, 0.55, 0.36), "Brightens warm undertones."), shade("Peach", rgb(0.95, 0.62, 0.55), "Natural warm flush.")],
    eyeshadow: [shade("Bronze", rgb(0.55, 0.39, 0.24), "Warm metallic pop."), shade("Copper", rgb(0.72, 0.36, 0.22), "Enhances warmth."), shade("Olive Gold", rgb(0.46, 0.45, 0.22), "Soft warm glam.")],
  },
  cool: {
    lipstick: [shade("Mauve", rgb(0.67, 0.42, 0.55), "Cool pink-purple harmony."), shade("Berry", rgb(0.55, 0.20, 0.35), "Bold cool flattering."), shade("Blue-Red", rgb(0.72, 0.10, 0.22), "Classic cool red.")],
    blush: [shade("Cool Pink", rgb(0.92, 0.50, 0.65), "Fresh on cool undertones."), shade("Berry Blush", rgb(0.75, 0.30, 0.45), "Depth without turning orange.")],
    eyeshadow: [shade("Taupe", rgb(0.52, 0.48, 0.45), "Cool neutral base."), shade("Mauve Smoke", rgb(0.55, 0.36, 0.48), "Cool-toned definition."), shade("Charcoal", rgb(0.22, 0.22, 0.25), "Deep cool contrast.")],
  },
  neutral: {
    lipstick: [shade("Rose Nude", rgb(0.82, 0.46, 0.52), "Balanced and versatile."), shade("Classic Red", rgb(0.75, 0.14, 0.22), "Works across undertones."), shade("Pink Nude", rgb(0.90, 0.60, 0.66), "Soft everyday option.")],
    blush: [shade("Soft Rose", rgb(0.90, 0.55, 0.62), "Neutral flush."), shade("Peach-Rose", rgb(0.92, 0.58, 0.54), "Between warm/cool.")],
    eyeshadow: [shade("Champagne", rgb(0.78, 0.70, 0.54), "Easy lid highlight."), shade("Rose Gold", rgb(0.74, 0.52, 0.44), "Neutral glam."), shade("Soft Brown", rgb(0.45, 0.34, 0.28), "Universal crease.")],
  },
  olive: {
    lipstick: [shade("Brick Rose", rgb(0.66, 0.24, 0.30), "Flattering muted warmth."), shade("Caramel Nude", rgb(0.75, 0.46, 0.34), "Avoids too-pink effect."), shade("Muted Berry", rgb(0.55, 0.26, 0.36), "Color without clashing.")],
    blush: [shade("Muted Rose", rgb(0.80, 0.45, 0.52), "Olive-friendly flush."), shade("Mauve Peach", rgb(0.86, 0.52, 0.50), "Soft but not orange.")],
    eyeshadow: [shade("Khaki", rgb(0.46, 0.45, 0.32), "Olive harmony."), shade("Bronze Brown", rgb(0.50, 0.36, 0.26), "Natural definition."), shade("Smoky Plum", rgb(0.43, 0.28, 0.38), "Olive-friendly drama.")],
  },
};

/**
 * @param {{ undertone: string }} analysis - at least undertone (warm/cool/neutral/olive)
 * @returns {{ looks: Array<{ id: string, title: string, intensity: string, steps: Array<{ id: string, category: string, instruction: string, suggestedShades: Array<{ name: string, color: { r,g,b }, reason: string }> }> }} }
 */
export function recommend(analysis) {
  const u = analysis.undertone;
  const p = palettes[u] || palettes.neutral;
  const everyday = {
    id: `everyday-${u}`,
    title: "Everyday Look",
    intensity: "everyday",
    steps: [
      { id: "lip", category: "lipstick", instruction: "Pick a comfy shade for daytime.", suggestedShades: p.lipstick.slice(0, 2) },
      { id: "blush", category: "blush", instruction: "Apply lightly and blend upward for lift.", suggestedShades: p.blush },
      { id: "shadow", category: "eyeshadow", instruction: "Use a soft base + a slightly deeper crease color.", suggestedShades: p.eyeshadow.slice(0, 2) },
    ],
  };
  const glam = {
    id: `glam-${u}`,
    title: "Glam Look",
    intensity: "glam",
    steps: [
      { id: "lip-glam", category: "lipstick", instruction: "Choose a bolder shade and define the lip line.", suggestedShades: p.lipstick },
      { id: "shadow-glam", category: "eyeshadow", instruction: "Add depth at outer corner + shimmer on lid.", suggestedShades: p.eyeshadow },
    ],
  };
  return { looks: [everyday, glam] };
}
