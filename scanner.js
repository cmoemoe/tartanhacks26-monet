// Face Scanner page: camera, analyze, save beauty report to profile
import { getSession } from "./lib/auth.js";
import { updateBeautyReport } from "./lib/posts.js";
import { updatePreferences } from "./lib/preferences.js";
import { getFaceGeometry, classifyFaceShape, classifyLipFullness } from "./lib/face-geometry.js";
import { isFaceApiConfigured, analyzeFrameWithBackend } from "./lib/face-api.js";
import { recommend } from "./lib/recommend.js";

async function ensureAuth() {
  const session = await getSession();
  if (session || sessionStorage.getItem("beautyLoggedIn")) return;
  window.location.href = "/login.html";
}

ensureAuth();

document.getElementById("scannerReturnBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "/profile.html";
});

const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay ? overlay.getContext("2d", { willReadFrequently: true }) : null;

const btnGetStarted = document.getElementById("btnGetStarted");
const scannerScanningBar = document.getElementById("scannerScanningBar");
const progressBarEl = document.getElementById("scannerProgressBar");
const scannerFramePlaceholder = document.getElementById("scannerFramePlaceholder");
const scannerFrameLive = document.getElementById("scannerFrameLive");

const SAMPLE_POINTS = [234, 454, 10];

let faceMesh = null;
let camera = null;
let latestResults = null;

function setStatus(text) {
  // Status no longer shown in step UI; keep for any debug
}

function showStep(stepNum) {
  document.querySelectorAll(".scannerStep").forEach((el) => el.classList.remove("active"));
  const step = document.getElementById(`scannerStep${stepNum}`);
  if (step) step.classList.add("active");
  if (progressBarEl) progressBarEl.style.width = "0%";
}

function animateProgress(durationMs = 2000) {
  if (!progressBarEl) return;
  progressBarEl.style.width = "0%";
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const p = Math.min(1, elapsed / durationMs);
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    progressBarEl.style.width = `${ease * 100}%`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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
  if (!video || !overlay) return;
  const rect = video.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
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
  if (!ctx || !overlay) return;
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

function stopAll() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  if (video && video.srcObject) {
    for (const track of video.srcObject.getTracks()) track.stop();
    video.srcObject = null;
  }
  faceMesh = null;
  latestResults = null;
  if (ctx && overlay) ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (btnGetStarted) btnGetStarted.disabled = false;
  showStep(1);
}

let scanningTimerId = null;

function moveCameraToStep2() {
  if (video && overlay && scannerFrameLive) {
    scannerFrameLive.appendChild(video);
    scannerFrameLive.appendChild(overlay);
  }
}

async function initCamera() {
  if (!video) return;
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
  });

  camera = new Camera(video, {
    onFrame: async () => { await faceMesh.send({ image: video }); },
    width: 1280,
    height: 720,
  });
  camera.start();
}

initCamera();

btnGetStarted?.addEventListener("click", () => {
  if (!video) return;
  showStep(2);
  if (btnGetStarted) btnGetStarted.disabled = true;
  moveCameraToStep2();
  if (scannerScanningBar) scannerScanningBar.textContent = "Scanning...";
  if (scanningTimerId) clearTimeout(scanningTimerId);
  scanningTimerId = setTimeout(() => {
    scanningTimerId = null;
    runAnalysis();
  }, 3000);
});

window.addEventListener("resize", () => {
  if (video && video.srcObject) resizeOverlay();
});

async function runAnalysis() {
  if (!latestResults?.multiFaceLandmarks?.length) return;
  showStep(3);
  animateProgress(2000);

  let analysis = analyzeCurrentFrame(latestResults.multiFaceLandmarks[0]);
  if (isFaceApiConfigured()) {
    const backend = await analyzeFrameWithBackend(overlay);
    if (backend?.faceShape) analysis = { ...analysis, faceShape: backend.faceShape };
    if (backend?.lipFullness) analysis = { ...analysis, lipFullness: backend.lipFullness };
  }

  const session = await getSession();
  const userId = session?.user?.id;
  const recs = recommend(analysis);
  if (userId) {
    const reportForProfile = {
      undertone: analysis.undertone,
      confidence: analysis.confidence,
      faceShape: analysis.faceShape,
      lipFullness: analysis.lipFullness,
      sampledSkinRGB: analysis.sampledSkinRGB,
      looks: recs.looks.map((l) => ({ title: l.title })),
    };
    await updateBeautyReport(userId, reportForProfile);
    const fromSurvey = new URLSearchParams(window.location.search).get("fromSurvey") === "1";
    if (fromSurvey) await updatePreferences(userId, { has_initial_face_report: true });
  }

  if (progressBarEl) progressBarEl.style.width = "100%";
  await new Promise((r) => setTimeout(r, 300));
  showStep(4);
}

document.getElementById("btnViewResults")?.addEventListener("click", () => {
  showStep(5);
});

