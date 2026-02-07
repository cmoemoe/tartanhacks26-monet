// Face Scanner page: camera, analyze, save beauty report to profile
import { getSession } from "./lib/auth.js";
import { updateBeautyReport } from "./lib/posts.js";
import { updatePreferences } from "./lib/preferences.js";
import { getFaceGeometry, classifyFaceShape, classifyLipFullness } from "./lib/face-geometry.js";
import { isFaceApiConfigured, analyzeFrameWithBackend } from "./lib/face-api.js";

async function ensureAuth() {
  const session = await getSession();
  if (session || sessionStorage.getItem("beautyLoggedIn")) return;
  window.location.href = "/login.html";
}

ensureAuth();

document.getElementById("backLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/profile.html";
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
const faceShapeEl = document.getElementById("faceShape");
const lipFullnessEl = document.getElementById("lipFullness");
const looksEl = document.getElementById("looks");

const SAMPLE_POINTS = [234, 454, 10];

let faceMesh = null;
let camera = null;
let latestResults = null;

// Recommendation engine (same as original main.js)
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

function recommend(analysis) {
  const u = analysis.undertone;
  const p = palettes[u] || palettes.neutral;
  const everyday = { id: `everyday-${u}`, title: "Everyday Look", intensity: "everyday", steps: [{ id: "lip", category: "lipstick", instruction: "Pick a comfy shade for daytime.", suggestedShades: p.lipstick.slice(0, 2) }, { id: "blush", category: "blush", instruction: "Apply lightly and blend upward for lift.", suggestedShades: p.blush }, { id: "shadow", category: "eyeshadow", instruction: "Use a soft base + a slightly deeper crease color.", suggestedShades: p.eyeshadow.slice(0, 2) }] };
  const glam = { id: `glam-${u}`, title: "Glam Look", intensity: "glam", steps: [{ id: "lip-glam", category: "lipstick", instruction: "Choose a bolder shade and define the lip line.", suggestedShades: p.lipstick }, { id: "shadow-glam", category: "eyeshadow", instruction: "Add depth at outer corner + shimmer on lid.", suggestedShades: p.eyeshadow }] };
  return { looks: [everyday, glam] };
}

function setStatus(text) {
  statusEl.textContent = text;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function moveTowardCenter(point, center, factor = 0.5) {
  return { x: point.x + (center.x - point.x) * factor, y: point.y + (center.y - point.y) * factor, z: point.z ?? 0 };
}

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

function samplePatchMedian(imgData, cx, cy, radius) {
  const { width, height, data } = imgData;
  const rs = [], gs = [], bs = [];
  const x0 = Math.max(0, cx - radius);
  const x1 = Math.min(width - 1, cx + radius);
  const y0 = Math.max(0, cy - radius);
  const y1 = Math.min(height - 1, cy + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
      if (maxc > 0.97 || minc < 0.04) continue;
      rs.push(r); gs.push(g); bs.push(b);
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
  const rs = colors.map(c => c.r).sort((a, b) => a - b);
  const gs = colors.map(c => c.g).sort((a, b) => a - b);
  const bs = colors.map(c => c.b).sort((a, b) => a - b);
  const mid = Math.floor(colors.length / 2);
  return { r: rs[mid], g: gs[mid], b: bs[mid] };
}

function analyzeCurrentFrame(landmarks) {
  const w = overlay.width;
  const h = overlay.height;
  const faceCenter = landmarks[1];
  const imgData = ctx.getImageData(0, 0, w, h);
  const samples = [];
  for (const idx of SAMPLE_POINTS) {
    const p = landmarks[idx];
    if (!p) continue;
    const adjusted = moveTowardCenter(p, faceCenter, 0.15);
    const cx = Math.round((1 - adjusted.x) * w);
    const cy = Math.round(adjusted.y * h);
    const patch = samplePatchMedian(imgData, cx, cy, Math.round(18 * (devicePixelRatio || 1)));
    if (patch) samples.push(patch);
  }
  const sampled = samples.length ? medianColor(samples) : { r: 0.6, g: 0.5, b: 0.45 };
  const { undertone, confidence } = classifyUndertone(sampled);
  const geometry = getFaceGeometry(landmarks, { width: w, height: h });
  const faceShape = classifyFaceShape(geometry);
  const lipFullness = classifyLipFullness(geometry);
  return { undertone, confidence, sampledSkinRGB: sampled, faceShape, lipFullness, geometry };
}

function resizeOverlay() {
  const rect = video.getBoundingClientRect();
  overlay.width = Math.floor(rect.width * (devicePixelRatio || 1));
  overlay.height = Math.floor(rect.height * (devicePixelRatio || 1));
}

function drawGeometryContours(geometry, w) {
  const stroke = (points, color, lineWidth = 1.5) => {
    if (!points.length) return;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = (1 - points[i].x / w) * w;
      const y = points[i].y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * (devicePixelRatio || 1);
    ctx.stroke();
  };
  stroke(geometry.faceShape, "rgba(120,200,255,0.5)");
  stroke(geometry.lipShape, "rgba(255,100,120,0.7)");
  stroke(geometry.leftEye, "rgba(200,255,200,0.6)");
  stroke(geometry.rightEye, "rgba(200,255,200,0.6)");
  stroke(geometry.nose, "rgba(255,220,150,0.5)");
  stroke(geometry.leftEyebrow, "rgba(255,255,180,0.6)");
  stroke(geometry.rightEyebrow, "rgba(255,255,180,0.6)");
}

function drawOverlay(results) {
  const w = overlay.width;
  const h = overlay.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const landmarks = results.multiFaceLandmarks?.[0];
  if (!landmarks) {
    ctx.restore();
    return;
  }
  const geometry = getFaceGeometry(landmarks, { width: w, height: h });
  drawGeometryContours(geometry, w);
  for (const idx of SAMPLE_POINTS) {
    const p = moveTowardCenter(landmarks[idx], landmarks[1], 0.15);
    if (!p) continue;
    const x = (1 - p.x) * w;
    const y = p.y * h;
    ctx.beginPath();
    ctx.arc(x, y, 6 * (devicePixelRatio || 1), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2 * (devicePixelRatio || 1);
    ctx.stroke();
  }
  ctx.restore();
}

function renderAnalysis(analysis) {
  undertoneEl.textContent = capitalize(analysis.undertone);
  confidenceEl.textContent = `${Math.round(analysis.confidence * 100)}%`;
  if (faceShapeEl) faceShapeEl.textContent = analysis.faceShape ? capitalize(analysis.faceShape.label) : "—";
  if (lipFullnessEl) lipFullnessEl.textContent = analysis.lipFullness ? capitalize(analysis.lipFullness.label) : "—";
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
        text.innerHTML = `<div style="font-weight:800;font-size:12px">${escapeHtml(s.name)}</div><div style="color:#b8b8c6;font-size:11px">${escapeHtml(s.reason)}</div>`;
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

btnStart.addEventListener("click", async () => {
  setStatus("Starting camera…");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  resizeOverlay();
  requestAnimationFrame(() => resizeOverlay());
  setTimeout(resizeOverlay, 120);

  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });
  faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
  faceMesh.onResults((results) => {
    latestResults = results;
    drawOverlay(results);
    btnAnalyze.disabled = !(results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0);
  });

  camera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({ image: video }); },
    width: 1280,
    height: 720,
  });
  camera.start();

  btnStart.disabled = true;
  btnStop.disabled = false;
  setStatus("Camera started. Center your face and click Analyze.");
});

btnStop.addEventListener("click", stopAll);

window.addEventListener("resize", () => {
  if (video.srcObject) resizeOverlay();
});

btnAnalyze.addEventListener("click", async () => {
  if (!latestResults?.multiFaceLandmarks?.length) {
    setStatus("No face landmarks yet — hold still facing camera.");
    return;
  }
  let analysis = analyzeCurrentFrame(latestResults.multiFaceLandmarks[0]);
  if (isFaceApiConfigured()) {
    setStatus("Sending frame to backend…");
    const backend = await analyzeFrameWithBackend(overlay);
    if (backend?.faceShape) analysis = { ...analysis, faceShape: backend.faceShape };
    if (backend?.lipFullness) analysis = { ...analysis, lipFullness: backend.lipFullness };
    setStatus("Camera started. Center your face and click Analyze.");
  }
  renderAnalysis(analysis);
  const recs = recommend(analysis);
  renderRecommendations(recs);

  const session = await getSession();
  const userId = session?.user?.id;
  if (userId) {
    setStatus("Saving beauty report to your profile…");
    const reportForProfile = {
      undertone: analysis.undertone,
      confidence: analysis.confidence,
      faceShape: analysis.faceShape,
      lipFullness: analysis.lipFullness,
      sampledSkinRGB: analysis.sampledSkinRGB,
      looks: recs.looks.map((l) => ({ title: l.title })),
    };
    const { error } = await updateBeautyReport(userId, reportForProfile);
    if (error) {
      setStatus("Report saved locally. Could not save to profile: " + error);
    } else {
      setStatus("Beauty report saved to your profile. You can view it on Profile.");
      const fromSurvey = new URLSearchParams(window.location.search).get("fromSurvey") === "1";
      if (fromSurvey) {
        await updatePreferences(userId, { has_initial_face_report: true });
        window.location.href = "/index.html";
        return;
      }
    }
  } else {
    setStatus("Analysis complete. Log in to save the report to your profile.");
  }
});
