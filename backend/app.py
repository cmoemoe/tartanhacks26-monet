"""
Face analysis backend: accepts an image, runs MediaPipe Face Mesh,
returns face shape and lip fullness. Run: flask --app app run -p 5000
"""
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np

app = Flask(__name__)
CORS(app)

# MediaPipe face oval contour indices (ordered) — same as frontend face-geometry.js
FACE_OVAL_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109
]
LIPS_INDICES = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267,
    269, 270, 409, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80,
    81, 82, 13, 312, 311, 310, 415
]


def landmarks_to_points(landmarks, indices, w=1.0, h=1.0):
    out = []
    for i in indices:
        if i >= len(landmarks):
            continue
        lm = landmarks[i]
        out.append({"x": lm.x * w, "y": lm.y * h, "z": getattr(lm, "z", 0) or 0})
    return out


def contour_metrics(points):
    if not points:
        return None
    xs = [p["x"] for p in points]
    ys = [p["y"] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max_x - min_x
    height = max_y - min_y
    return {
        "width": width,
        "height": height,
        "aspectRatio": (width / height) if height > 0 else 0,
        "bbox": {"minX": min_x, "minY": min_y, "maxX": max_x, "maxY": max_y},
    }


def width_in_band(points, y_min, y_max):
    in_band = [p for p in points if y_min <= p["y"] <= y_max]
    if not in_band:
        return 0
    xs = [p["x"] for p in in_band]
    return max(xs) - min(xs)


def classify_face_shape(face_points, face_m):
    if not face_m or not face_points:
        return {"label": "oval", "confidence": 0}
    ar = face_m["aspectRatio"]
    bbox = face_m.get("bbox", {})
    min_y = bbox.get("minY", 0)
    max_y = bbox.get("maxY", 1)
    range_y = max_y - min_y
    top_band = (min_y, min_y + range_y * 0.25)
    bottom_band = (max_y - range_y * 0.25, max_y)
    top_w = width_in_band(face_points, top_band[0], top_band[1])
    bottom_w = width_in_band(face_points, bottom_band[0], bottom_band[1])
    ratio_top_bottom = (top_w / bottom_w) if bottom_w > 0 else 1

    label, score = "oval", 0.5
    if 0.95 < ar < 1.15:
        label, score = "round", 0.7
    elif ar > 1.0 and ratio_top_bottom < 0.85:
        label, score = "oblong", 0.65
    elif ratio_top_bottom > 1.2:
        label, score = "heart", 0.65
    elif ratio_top_bottom < 0.9 and ar < 0.95:
        label, score = "square", 0.6
    else:
        label, score = "oval", 0.6
    return {"label": label, "confidence": min(0.95, score)}


def classify_lip_fullness(face_m, lip_m):
    if not lip_m or not face_m:
        return {"label": "medium", "confidence": 0}
    lip_aspect = lip_m["aspectRatio"]
    face_area = (face_m.get("width") or 1) * (face_m.get("height") or 1)
    lip_area = (lip_m.get("width") or 0) * (lip_m.get("height") or 0)
    lip_to_face = (lip_area / face_area) if face_area > 0 else 0

    label, score = "medium", 0.5
    if lip_aspect > 4.5 or lip_to_face < 0.008:
        label, score = "thin", 0.65
    elif lip_aspect < 2.8 or lip_to_face > 0.02:
        label, score = "full", 0.65
    else:
        label, score = "medium", 0.6
    return {"label": label, "confidence": min(0.95, score)}


@app.route("/api/analyze-face", methods=["POST"])
def analyze_face():
    if "image" not in request.files:
        return jsonify({"error": "No image"}), 400
    file = request.files["image"]
    if not file.filename and not file.content_type:
        return jsonify({"error": "Invalid file"}), 400
    data = file.read()
    if not data:
        return jsonify({"error": "Empty image"}), 400
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Could not decode image"}), 400
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]

    mp_face_mesh = mp.solutions.face_mesh
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        return jsonify({
            "faceShape": {"label": "oval", "confidence": 0},
            "lipFullness": {"label": "medium", "confidence": 0},
        })

    landmarks = results.multi_face_landmarks[0].landmark
    face_points = landmarks_to_points(landmarks, FACE_OVAL_INDICES, w, h)
    lip_points = landmarks_to_points(landmarks, LIPS_INDICES, w, h)
    face_m = contour_metrics(face_points)
    lip_m = contour_metrics(lip_points)

    face_shape = classify_face_shape(face_points, face_m)
    lip_fullness = classify_lip_fullness(face_m, lip_m)

    return jsonify({
        "faceShape": face_shape,
        "lipFullness": lip_fullness,
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
