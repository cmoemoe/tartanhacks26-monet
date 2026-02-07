# Face analysis backend

Accepts a single image (JPEG), runs MediaPipe Face Mesh, and returns **face shape** (oval, round, square, heart, oblong) and **lip fullness** (thin, medium, full).

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

## Run

From the `backend` folder (with venv activated):

```bash
python -m flask --app app run -p 5000
```

Or run the app directly:

```bash
python app.py
```

## API

- **POST /api/analyze-face**  
  Body: `multipart/form-data` with field `image` (JPEG file).  
  Response: `{ "faceShape": { "label": "oval", "confidence": 0.6 }, "lipFullness": { "label": "medium", "confidence": 0.6 } }`

- **GET /health**  
  Returns `{ "status": "ok" }`.

## Frontend

In the project root `.env` set `VITE_FACE_API_URL=http://localhost:5000` and restart the dev server. The face scanner will send the current frame when you click **Analyze** and use the backend’s face shape and lip fullness in the results.
