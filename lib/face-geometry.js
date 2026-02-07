/**
 * Facial geometry from MediaPipe Face Mesh (468 landmarks).
 *
 * Uses the same landmark groupings as MediaPipe's face_mesh_connections:
 * face oval, lips, left/right eye, nose, left/right eyebrow. No OpenCV required
 * in the browser—you already have dense landmarks from Face Mesh.
 *
 * To use OpenCV instead (e.g. backend): send a frame to a Python/Node service
 * that runs OpenCV + dlib (or MediaPipe) and returns 68/468 landmarks, then
 * pass those into getFaceGeometry() with the same index convention, or use
 * opencv.js in the browser for face detection only (bounding box, not landmarks).
 */

// Connection pairs (from MediaPipe face_mesh_connections) — (indexA, indexB)
const FACEMESH_FACE_OVAL = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
  [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
  [54, 103], [103, 67], [67, 109], [109, 10]
];

const FACEMESH_LIPS = [
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375],
  [375, 291], [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270],
  [270, 409], [409, 291], [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402],
  [402, 318], [318, 324], [324, 308], [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312],
  [312, 311], [311, 310], [310, 415], [415, 308]
];

const FACEMESH_LEFT_EYE = [
  [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382], [382, 362],
  [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]
];

const FACEMESH_RIGHT_EYE = [
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
  [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133]
];

const FACEMESH_LEFT_EYEBROW = [
  [276, 283], [283, 282], [282, 295], [295, 285], [300, 293], [293, 334], [334, 296], [296, 336]
];

const FACEMESH_RIGHT_EYEBROW = [
  [46, 53], [53, 52], [52, 65], [65, 55], [70, 63], [63, 105], [105, 66], [66, 107]
];

const FACEMESH_NOSE = [
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2], [98, 97],
  [97, 2], [2, 326], [326, 327], [327, 294], [294, 278], [278, 344], [344, 440], [440, 275],
  [275, 4], [4, 45], [45, 220], [220, 115], [115, 48], [48, 64], [64, 98]
];

/** Walk edges to get ordered contour indices (no duplicates, cyclic). */
function contourIndicesFromEdges(edges) {
  if (!edges.length) return [];
  const adj = new Map();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  const out = [];
  let cur = edges[0][0];
  const seen = new Set();
  for (let i = 0; i < edges.flat(1).length; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    out.push(cur);
    const next = adj.get(cur);
    if (!next) break;
    const n = next.find((c) => !seen.has(c));
    if (n == null) break;
    cur = n;
  }
  return out;
}

/**
 * Get landmark point in normalized coords; optionally scale to pixel coords.
 * @param {Array<{x:number,y:number,z?:number}>} landmarks - MediaPipe multiFaceLandmarks[0]
 * @param {number} index - Landmark index (0..467)
 * @param {{ width?: number, height?: number }} [pixel] - If set, scale x,y to pixels (e.g. overlay size)
 */
function getPoint(landmarks, index, pixel = null) {
  const p = landmarks[index];
  if (!p) return null;
  let x = p.x, y = p.y, z = p.z ?? 0;
  if (pixel?.width != null && pixel?.height != null) {
    x = x * pixel.width;
    y = y * pixel.height;
  }
  return { x, y, z };
}

/**
 * Build ordered array of points for a contour from landmark indices.
 */
function contourPoints(landmarks, indices, pixel = null) {
  const points = [];
  for (const i of indices) {
    const p = getPoint(landmarks, i, pixel);
    if (p) points.push(p);
  }
  return points;
}

/**
 * Compute simple metrics for a contour (center, width, height, aspect ratio).
 */
function contourMetrics(points) {
  if (!points.length) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let cx = 0, cy = 0;
  for (const p of points) {
    cx += p.x; cy += p.y;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  cx /= points.length; cy /= points.length;
  const w = maxX - minX, h = maxY - minY;
  return {
    center: { x: cx, y: cy },
    width: w,
    height: h,
    aspectRatio: h > 0 ? w / h : 0,
    bbox: { minX, minY, maxX, maxY },
  };
}

/**
 * Extract facial geometry from MediaPipe Face Mesh landmarks.
 *
 * @param {Array<{x:number,y:number,z?:number}>} landmarks - multiFaceLandmarks[0] (468 points)
 * @param {{ width?: number, height?: number }} [pixel] - Optional: scale points to pixel coords (e.g. overlay width/height)
 * @returns {{
 *   faceShape: Array<{x,y,z}>,
 *   lipShape: Array<{x,y,z}>,
 *   leftEye: Array<{x,y,z}>,
 *   rightEye: Array<{x,y,z}>,
 *   nose: Array<{x,y,z}>,
 *   leftEyebrow: Array<{x,y,z}>,
 *   rightEyebrow: Array<{x,y,z}>,
 *   metrics: { faceShape, lipShape, leftEye, rightEye, nose, leftEyebrow, rightEyebrow }
 * }}
 */
export function getFaceGeometry(landmarks, pixel = null) {
  if (!landmarks || landmarks.length < 468) {
    return {
      faceShape: [], lipShape: [], leftEye: [], rightEye: [], nose: [],
      leftEyebrow: [], rightEyebrow: [],
      metrics: {},
    };
  }

  const faceIndices = contourIndicesFromEdges(FACEMESH_FACE_OVAL);
  const lipIndices = contourIndicesFromEdges(FACEMESH_LIPS);
  const leftEyeIndices = contourIndicesFromEdges(FACEMESH_LEFT_EYE);
  const rightEyeIndices = contourIndicesFromEdges(FACEMESH_RIGHT_EYE);
  const leftEyebrowIndices = contourIndicesFromEdges(FACEMESH_LEFT_EYEBROW);
  const rightEyebrowIndices = contourIndicesFromEdges(FACEMESH_RIGHT_EYEBROW);
  const noseIndices = contourIndicesFromEdges(FACEMESH_NOSE);

  const faceShape = contourPoints(landmarks, faceIndices, pixel);
  const lipShape = contourPoints(landmarks, lipIndices, pixel);
  const leftEye = contourPoints(landmarks, leftEyeIndices, pixel);
  const rightEye = contourPoints(landmarks, rightEyeIndices, pixel);
  const nose = contourPoints(landmarks, noseIndices, pixel);
  const leftEyebrow = contourPoints(landmarks, leftEyebrowIndices, pixel);
  const rightEyebrow = contourPoints(landmarks, rightEyebrowIndices, pixel);

  const metrics = {
    faceShape: contourMetrics(faceShape),
    lipShape: contourMetrics(lipShape),
    leftEye: contourMetrics(leftEye),
    rightEye: contourMetrics(rightEye),
    nose: contourMetrics(nose),
    leftEyebrow: contourMetrics(leftEyebrow),
    rightEyebrow: contourMetrics(rightEyebrow),
  };

  return {
    faceShape,
    lipShape,
    leftEye,
    rightEye,
    nose,
    leftEyebrow,
    rightEyebrow,
    metrics,
  };
}

/**
 * Key landmark indices useful for beauty/analysis (nose tip, lip corners, etc.).
 * MediaPipe indices: 1=nose tip, 13/14 lip bottom, 61/291 lip corners, 33/263 eye corners, etc.
 */
export const KEY_POINT_INDICES = {
  noseTip: 1,
  noseBridge: 6,
  lipLeft: 61,
  lipRight: 291,
  lipTop: 13,
  lipBottom: 14,
  leftEyeInner: 133,
  leftEyeOuter: 263,
  rightEyeInner: 362,
  rightEyeOuter: 33,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  forehead: 10,
};

/**
 * Get a few key points as {x,y,z} for quick access (e.g. sampling, guides).
 */
export function getKeyPoints(landmarks, pixel = null) {
  if (!landmarks) return {};
  const out = {};
  for (const [name, index] of Object.entries(KEY_POINT_INDICES)) {
    const p = getPoint(landmarks, index, pixel);
    if (p) out[name] = p;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Face shape & lip fullness classification
// ---------------------------------------------------------------------------

/** @typedef {"oval"|"round"|"square"|"heart"|"oblong"} FaceShapeLabel */
/** @typedef {"thin"|"medium"|"full"} LipFullnessLabel */

/**
 * Compute approximate width of face contour in a vertical band (yMin..yMax).
 */
function widthInBand(points, yMin, yMax) {
  const inBand = points.filter((p) => p.y >= yMin && p.y <= yMax);
  if (!inBand.length) return 0;
  const xs = inBand.map((p) => p.x);
  return Math.max(...xs) - Math.min(...xs);
}

/**
 * Classify face shape from face oval geometry.
 * @param {{ metrics: { faceShape?: { aspectRatio: number, bbox?: { minY, maxY } }, lipShape?: object }, faceShape: Array<{x,y}> }} geometry - from getFaceGeometry
 * @returns {{ label: FaceShapeLabel, confidence: number }}
 */
export function classifyFaceShape(geometry) {
  const faceM = geometry?.metrics?.faceShape;
  const facePoints = geometry?.faceShape;
  if (!faceM || !facePoints?.length) {
    return { label: "oval", confidence: 0 };
  }

  const ar = faceM.aspectRatio; // width/height
  const { minY, maxY } = faceM.bbox || { minY: 0, maxY: 1 };
  const range = maxY - minY;
  const topBand = [minY, minY + range * 0.25];
  const bottomBand = [maxY - range * 0.25, maxY];
  const topW = widthInBand(facePoints, topBand[0], topBand[1]);
  const bottomW = widthInBand(facePoints, bottomBand[0], bottomBand[1]);
  const ratioTopBottom = bottomW > 0 ? topW / bottomW : 1;

  let label = "oval";
  let score = 0.5;

  if (ar > 0.95 && ar < 1.15) {
    label = "round";
    score = 0.7;
  } else if (ar > 1.0 && ratioTopBottom < 0.85) {
    label = "oblong";
    score = 0.65;
  } else if (ratioTopBottom > 1.2) {
    label = "heart";
    score = 0.65;
  } else if (ratioTopBottom < 0.9 && ar < 0.95) {
    label = "square";
    score = 0.6;
  } else {
    label = "oval";
    score = 0.6;
  }

  return { label, confidence: Math.min(0.95, score) };
}

/**
 * Classify lip fullness from lip contour metrics (relative to face size).
 * @param {{ metrics: { faceShape?: { width, height }, lipShape?: { width, height, aspectRatio } } }} geometry
 * @returns {{ label: LipFullnessLabel, confidence: number }}
 */
export function classifyLipFullness(geometry) {
  const faceM = geometry?.metrics?.faceShape;
  const lipM = geometry?.metrics?.lipShape;
  if (!lipM || !faceM) {
    return { label: "medium", confidence: 0 };
  }

  const lipAspect = lipM.aspectRatio; // width/height — thin lips tend to be wide & flat (high); full lips have more height (lower)
  const faceArea = (faceM.width || 1) * (faceM.height || 1);
  const lipArea = (lipM.width || 0) * (lipM.height || 0);
  const lipToFaceRatio = faceArea > 0 ? lipArea / faceArea : 0;

  let label = "medium";
  let score = 0.5;

  if (lipAspect > 4.5 || lipToFaceRatio < 0.008) {
    label = "thin";
    score = 0.65;
  } else if (lipAspect < 2.8 || lipToFaceRatio > 0.02) {
    label = "full";
    score = 0.65;
  } else {
    label = "medium";
    score = 0.6;
  }

  return { label, confidence: Math.min(0.95, score) };
}
