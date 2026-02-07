// Beauty Assistant MVP (Web)
// - Webcam + MediaPipe FaceMesh
// - sample skin around a few landmark points
// - simple undertone heuristic
// - rule-based rec engine

if (!sessionStorage.getItem("beautyLoggedIn")) {
  window.location.href = "/login.html";
}

document.getElementById("logoutLink")?.addEventListener("click", function (e) {
  e.preventDefault();
  sessionStorage.removeItem("beautyLoggedIn");
  window.location.href = "/login.html";
});

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d", { willReadFrequently: true });

const btnStart = document.getElementById("btnStart");
const btnAnalyze = document.getElementById("btnAnalyze");
const btnStop = document.getElementById("btnStop");
const statusEl = document.getElementById("status");

const undertoneEl = document.getElementById("undertone");
const confidenceEl = document.getElementById("confidence");
const skinSwatchEl = document.getElementById("skinSwatch");
const looksEl = document.getElementById("looks");

// -------------------- Data "structs" --------------------
/**
 * @typedef {"warm"|"cool"|"neutral"|"olive"} Undertone
 * @typedef {{r:number,g:number,b:number}} ColorRGB
 * @typedef {{undertone:Undertone, confidence:number, sampledSkinRGB:ColorRGB}} FaceAnalysis
 * @typedef {{id:string,name:string,color:ColorRGB,reason:string}} ShadeSuggestion
 * @typedef {{"lipstick"|"blush"|"eyeshadow"}} MakeupCategory
 * @typedef {{id:string,category:MakeupCategory,instruction:string,suggestedShades:ShadeSuggestion[]}} MakeupStep
 * @typedef {{id:string,title:string,intensity:"everyday"|"glam",steps:MakeupStep[]}} LookRecommendation
 * @typedef {{looks:LookRecommendation[]}} RecommendationSet
 */

// -------------------- Recommendation engine --------------------
class RecommendationEngine {
  /**
   * @param {FaceAnalysis} analysis
   * @returns {RecommendationSet}
   */
  recommend(analysis) {
    const u = analysis.undertone;

    const palettes = {
      warm: {
        lipstick: [
          shade("Peach Nude", rgb(0.86, 0.55, 0.44), "Plays up warm/yellow tones."),
          shade("Terracotta", rgb(0.72, 0.32, 0.24), "Warm earthy flattering."),
          shade("Warm Rose", rgb(0.80, 0.38, 0.46), "Balanced warm pink."),
        ],
        blush: [
          shade("Apricot", rgb(0.92, 0.55, 0.36), "Brightens warm undertones."),
          shade("Peach", rgb(0.95, 0.62, 0.55), "Natural warm flush."),
        ],
        eyeshadow: [
          shade("Bronze", rgb(0.55, 0.39, 0.24), "Warm metallic pop."),
          shade("Copper", rgb(0.72, 0.36, 0.22), "Enhances warmth."),
          shade("Olive Gold", rgb(0.46, 0.45, 0.22), "Soft warm glam."),
        ],
      },
      cool: {
        lipstick: [
          shade("Mauve", rgb(0.67, 0.42, 0.55), "Cool pink-purple harmony."),
          shade("Berry", rgb(0.55, 0.20, 0.35), "Bold cool flattering."),
          shade("Blue-Red", rgb(0.72, 0.10, 0.22), "Classic cool red."),
        ],
        blush: [
          shade("Cool Pink", rgb(0.92, 0.50, 0.65), "Fresh on cool undertones."),
          shade("Berry Blush", rgb(0.75, 0.30, 0.45), "Depth without turning orange."),
        ],
        eyeshadow: [
          shade("Taupe", rgb(0.52, 0.48, 0.45), "Cool neutral base."),
          shade("Mauve Smoke", rgb(0.55, 0.36, 0.48), "Cool-toned definition."),
          shade("Charcoal", rgb(0.22, 0.22, 0.25), "Deep cool contrast."),
        ],
      },
      neutral: {
        lipstick: [
          shade("Rose Nude", rgb(0.82, 0.46, 0.52), "Balanced and versatile."),
          shade("Classic Red", rgb(0.75, 0.14, 0.22), "Works across undertones."),
          shade("Pink Nude", rgb(0.90, 0.60, 0.66), "Soft everyday option."),
        ],
        blush: [
          shade("Soft Rose", rgb(0.90, 0.55, 0.62), "Neutral flush."),
          shade("Peach-Rose", rgb(0.92, 0.58, 0.54), "Between warm/cool."),
        ],
        eyeshadow: [
          shade("Champagne", rgb(0.78, 0.70, 0.54), "Easy lid highlight."),
          shade("Rose Gold", rgb(0.74, 0.52, 0.44), "Neutral glam."),
          shade("Soft Brown", rgb(0.45, 0.34, 0.28), "Universal crease."),
        ],
      },
      olive: {
        lipstick: [
          shade("Brick Rose", rgb(0.66, 0.24, 0.30), "Flattering muted warmth."),
          shade("Caramel Nude", rgb(0.75, 0.46, 0.34), "Avoids too-pink effect."),
          shade("Muted Berry", rgb(0.55, 0.26, 0.36), "Color without clashing."),
        ],
        blush: [
          shade("Muted Rose", rgb(0.80, 0.45, 0.52), "Olive-friendly flush."),
          shade("Mauve Peach", rgb(0.86, 0.52, 0.50), "Soft but not orange."),
        ],
        eyeshadow: [
          shade("Khaki", rgb(0.46, 0.45, 0.32), "Olive harmony."),
          shade("Bronze Brown", rgb(0.50, 0.36, 0.26), "Natural definition."),
          shade("Smoky Plum", rgb(0.43, 0.28, 0.38), "Olive-friendly drama."),
        ],
      }
    };

    const p = palettes[u];

    const everyday = {
      id: `everyday-${u}`,
      title: "Everyday Look",
      intensity: "everyday",
      steps: [
        {
          id: "lip",
          category: "lipstick",
          instruction: "Pick a comfy shade for daytime.",
          suggestedShades: p.lipstick.slice(0, 2),
        },
        {
          id: "blush",
          category: "blush",
          instruction: "Apply lightly and blend upward for lift.",
          suggestedShades: p.blush,
        },
        {
          id: "shadow",
          category: "eyeshadow",
          instruction: "Use a soft base + a slightly deeper crease color.",
          suggestedShades: p.eyeshadow.slice(0, 2),
        },
      ],
    };

    const glam = {
      id: `glam-${u}`,
      title: "Glam Look",
      intensity: "glam",
      steps: [
        {
          id: "lip-glam",
          category: "lipstick",
          instruction: "Choose a bolder shade and define the lip line.",
          suggestedShades: p.lipstick,
        },
        {
          id: "shadow-glam",
          category: "eyeshadow",
          instruction: "Add depth at outer corner + shimmer on lid.",
          suggestedShades: p.eyeshadow,
        },
      ],
    };

    // If confidence low, add note by slightly broadening suggestions (still MVP)
    return { looks: [everyday, glam] };
  }
}

// -------------------- Face + color analysis --------------------

// MediaPipe landmarks indices we’ll sample around (MVP choices):
// - Left cheek-ish: 234
// - Right cheek-ish: 454
// - Forehead-ish: 10
// These are not perfect, but work well enough for a demo.
const SAMPLE_POINTS = [234, 454, 10];

const engine = new RecommendationEngine();

let faceMesh = null;
let camera = null;
let latestResults = null;

btnStart.addEventListener("click", async () => {
  await startCameraAndFaceMesh();
});

btnStop.addEventListener("click", async () => {
  stopAll();
});

btnAnalyze.addEventListener("click", () => {
  if (!latestResults?.multiFaceLandmarks?.length) {
    setStatus("No face landmarks yet — hold still facing camera.");
    return;
  }
  const analysis = analyzeCurrentFrame(latestResults.multiFaceLandmarks[0]);
  renderAnalysis(analysis);
  const recs = engine.recommend(analysis);
  renderRecommendations(recs);
});

async function startCameraAndFaceMesh() {
  setStatus("Starting camera…");

  // Request webcam
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  video.srcObject = stream;

  await video.play();

  // Size overlay to displayed video
  resizeOverlay();
  requestAnimationFrame(() => resizeOverlay());
  setTimeout(resizeOverlay, 120);



  // Setup FaceMesh
  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });


  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  faceMesh.onResults((results) => {
    latestResults = results;
    drawOverlay(results);
    btnAnalyze.disabled = !(results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0);
  });

  // Use MediaPipe Camera helper (drives frames into FaceMesh)
  camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 1280,
    height: 720,
  });

  camera.start();

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus("Camera started. Center your face and click Analyze.");
}

function stopAll() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  if (video.srcObject) {
    for (const track of video.srcObject.getTracks()) track.stop();
    video.srcObject = null;
  }
  faceMesh = null;
  latestResults = null;

  ctx.clearRect(0, 0, overlay.width, overlay.height);

  btnStart.disabled = false;
  btnAnalyze.disabled = true;
  btnStop.disabled = true;

  setStatus("Stopped.");
}

function resizeOverlay() {
  // Match actual pixel size for crisp drawing/sampling
  const rect = video.getBoundingClientRect();
  overlay.width = Math.floor(rect.width * devicePixelRatio);
  overlay.height = Math.floor(rect.height * devicePixelRatio);
}

window.addEventListener("resize", () => {
  if (video.srcObject) resizeOverlay();
});

function drawOverlay(results) {
  // Draw current video frame to overlay (for sampling from same pixels)
  const w = overlay.width;
  const h = overlay.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // draw mirrored video into canvas (selfie view)
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const landmarks = results.multiFaceLandmarks?.[0];
  if (!landmarks) {
    ctx.restore();
    return;
  }

  // Draw a few sampling point markers
  for (const idx of SAMPLE_POINTS) {
    const p = moveTowardCenter(landmarks[idx], landmarks[1], 0.15);
    if (!p) continue;
    const x = (1 - p.x) * w; // because we mirrored
    const y = p.y * h;

    ctx.beginPath();
    ctx.arc(x, y, 6 * devicePixelRatio, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Analyze the current frame by sampling small patches around selected landmarks.
 * @param {Array<{x:number,y:number,z:number}>} landmarks
 * @returns {FaceAnalysis}
 */
function analyzeCurrentFrame(landmarks) {
  const faceCenter = landmarks[1];
  const w = overlay.width;
  const h = overlay.height;

  // We sample from overlay canvas since it already has the current frame drawn
  const imgData = ctx.getImageData(0, 0, w, h);

  /** @type {ColorRGB[]} */
  const samples = [];

  for (const idx of SAMPLE_POINTS) {
    const p = landmarks[idx];
    if (!p) continue;

    // Move point inward toward face center
    const adjusted = moveTowardCenter(p, faceCenter, 0.15);

    const cx = Math.round((1 - adjusted.x) * w); // mirrored
    const cy = Math.round(adjusted.y * h);

    const patch = samplePatchMedian(
      imgData,
      cx,
      cy,
      Math.round(18 * devicePixelRatio)
    );

    if (patch) samples.push(patch);
  }


  // Fallback if somehow no samples
  const sampled = samples.length ? medianColor(samples) : { r: 0.6, g: 0.5, b: 0.45 };

  const { undertone, confidence } = classifyUndertone(sampled);

  return {
    undertone,
    confidence,
    sampledSkinRGB: sampled,
  };
}

/**
 * Sample a square patch centered at (cx, cy) and return a median RGB.
 * Skips very dark/light pixels to reduce highlight/shadow impact.
 */
function samplePatchMedian(imgData, cx, cy, radius) {
  const { width, height, data } = imgData;

  const rs = [];
  const gs = [];
  const bs = [];

  const x0 = Math.max(0, cx - radius);
  const x1 = Math.min(width - 1, cx + radius);
  const y0 = Math.max(0, cy - radius);
  const y1 = Math.min(height - 1, cy + radius);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);

      // Skip extremes
      if (maxc > 0.97 || minc < 0.04) continue;

      rs.push(r);
      gs.push(g);
      bs.push(b);
    }
  }

  if (rs.length < 30) return null;

  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);

  const mid = Math.floor(rs.length / 2);
  return { r: rs[mid], g: gs[mid], b: bs[mid] };
}

function medianColor(colors) {
  const rs = colors.map(c => c.r).sort((a,b)=>a-b);
  const gs = colors.map(c => c.g).sort((a,b)=>a-b);
  const bs = colors.map(c => c.b).sort((a,b)=>a-b);
  const mid = Math.floor(colors.length / 2);
  return { r: rs[mid], g: gs[mid], b: bs[mid] };
}

/**
 * Undertone heuristic (MVP):
 * - warm: (r+g)/2 > b
 * - cool: b > (r+g)/2
 * - olive: g biased while not strongly warm/cool
 * - neutral: otherwise
 */
function classifyUndertone(rgb) {
  const r = clamp01(rgb.r);
  const g = clamp01(rgb.g);
  const b = clamp01(rgb.b);

  const warmIndex = (r + g) / 2 - b;
  const greenBias = g - (r + b) / 2;

  let undertone = "neutral";
  if (greenBias > 0.06 && Math.abs(warmIndex) < 0.10) undertone = "olive";
  else if (warmIndex > 0.05) undertone = "warm";
  else if (warmIndex < -0.05) undertone = "cool";

  const confidence = clamp01(Math.max(0.35, Math.min(0.95, Math.abs(warmIndex) * 1.8 + Math.abs(greenBias) * 1.2)));

  return { undertone, confidence };
}

// -------------------- UI rendering --------------------
function renderAnalysis(analysis) {
  undertoneEl.textContent = capitalize(analysis.undertone);
  confidenceEl.textContent = `${Math.round(analysis.confidence * 100)}%`;
  skinSwatchEl.style.background = `rgb(${Math.round(analysis.sampledSkinRGB.r * 255)}, ${Math.round(analysis.sampledSkinRGB.g * 255)}, ${Math.round(analysis.sampledSkinRGB.b * 255)})`;
}

function renderRecommendations(recs) {
  looksEl.innerHTML = "";

  for (const look of recs.looks) {
    const lookDiv = document.createElement("div");
    lookDiv.className = "look";

    const title = document.createElement("div");
    title.className = "lookTitle";
    title.textContent = `${look.title} (${capitalize(look.intensity)})`;
    lookDiv.appendChild(title);

    for (const step of look.steps) {
      const stepDiv = document.createElement("div");
      stepDiv.className = "step";

      const stepTitle = document.createElement("div");
      stepTitle.className = "stepTitle";
      stepTitle.textContent = capitalize(step.category);
      stepDiv.appendChild(stepTitle);

      const instr = document.createElement("div");
      instr.className = "hint";
      instr.textContent = step.instruction;
      stepDiv.appendChild(instr);

      const chips = document.createElement("div");
      chips.className = "chips";

      for (const s of step.suggestedShades) {
        const chip = document.createElement("div");
        chip.className = "chip";

        const dot = document.createElement("div");
        dot.className = "dot";
        dot.style.background = `rgb(${Math.round(s.color.r * 255)}, ${Math.round(s.color.g * 255)}, ${Math.round(s.color.b * 255)})`;

        const text = document.createElement("div");
        text.innerHTML = `<div style="font-weight:800;font-size:12px">${escapeHtml(s.name)}</div>
                          <div style="color:#b8b8c6;font-size:11px">${escapeHtml(s.reason)}</div>`;

        chip.appendChild(dot);
        chip.appendChild(text);
        chips.appendChild(chip);
      }

      stepDiv.appendChild(chips);
      lookDiv.appendChild(stepDiv);
    }

    looksEl.appendChild(lookDiv);
  }
}

// -------------------- helpers --------------------
function setStatus(text) {
  statusEl.textContent = text;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function rgb(r, g, b) {
  return { r, g, b };
}

function shade(name, color, reason) {
  return { id: crypto.randomUUID(), name, color, reason };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function moveTowardCenter(point, center, factor = 0.5) {
  return {
    x: point.x + (center.x - point.x) * factor,
    y: point.y + (center.y - point.y) * factor,
    z: point.z ?? 0,
  };
}
