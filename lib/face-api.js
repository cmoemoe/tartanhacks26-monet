/**
 * Send current frame to face-analysis backend and get face shape / lip fullness.
 * Set VITE_FACE_API_URL in .env to enable (e.g. http://localhost:5000).
 */

const FACE_API_URL = import.meta.env.VITE_FACE_API_URL ?? "";

export function isFaceApiConfigured() {
  return !!FACE_API_URL;
}

/**
 * POST canvas image to backend; returns { faceShape: { label, confidence }, lipFullness: { label, confidence } } or null.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ faceShape?: { label: string, confidence: number }, lipFullness?: { label: string, confidence: number } } | null>}
 */
export async function analyzeFrameWithBackend(canvas) {
  if (!isFaceApiConfigured()) return null;
  const url = `${FACE_API_URL.replace(/\/$/, "")}/api/analyze-face`;
  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });
    if (!blob) return null;
    const form = new FormData();
    form.append("image", blob, "frame.jpg");
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      faceShape: data.faceShape ?? null,
      lipFullness: data.lipFullness ?? null,
    };
  } catch {
    return null;
  }
}
