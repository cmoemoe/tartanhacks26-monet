# Backend setup: Supabase + Flowise / Dedalus

You can power the Explore **Ask AI** feature with either **Dedalus Labs** (cloud API) or **Flowise** (self‑hosted chatflows). If both are configured, **Dedalus is used** when `VITE_DAEDALUS_API_KEY` is set.

## Quick fix: "Could not find the 'beauty_report' column"

If the Face Scanner shows **Report saved locally. Could not save to profile: Could not find the 'beauty_report' column**, add the column in Supabase:

1. Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.
2. Run this (or the contents of `supabase/migrations/add_beauty_report.sql`):

```sql
alter table public.profiles
  add column if not exists beauty_report jsonb default null;
```

3. Run **Analyze** again on the Face Scanner page; the report will save to your profile.

## Dedalus (recommended if you prefer a hosted API)

[Dedalus Labs](https://www.dedaluslabs.ai/) provides an OpenAI-compatible chat API with multiple providers (OpenAI, Anthropic, Google, etc.).

1. Sign up at [dedaluslabs.ai](https://www.dedaluslabs.ai) and create an API key in the [Dashboard](https://www.dedaluslabs.ai/dashboard/api-keys).
2. Add to `.env`:
   - `VITE_DAEDALUS_API_KEY=your-api-key`
   - Optional: `VITE_DAEDALUS_API_URL=https://api.dedaluslabs.ai` (default)
   - Optional: `VITE_DAEDALUS_MODEL=google/gemini-1.5-flash` (default; or e.g. `google/gemini-1.5-pro`, `openai/gpt-4o-mini`)
3. Restart the dev server (`npm run dev`). The Explore page will show **Ask AI (Dedalus)** and use Dedalus for questions.

## Flowise version (if redirect to /undefined or 403)

Use a specific Flowise version so the UI works:

1. **Check your installed version**
   ```bash
   flowise --version
   ```

2. **Uninstall and install Flowise 3.0.2** (global)
   ```bash
   npm uninstall -g flowise
   npm install -g flowise@3.0.2
   ```

3. **Run again**
   ```bash
   flowise start
   ```
   Then open **http://localhost:3000** or **http://localhost:3000/flow**.

If you run Flowise from this project (`npm run flowise`), you can pin the version in `package.json`: set `"flowise": "3.0.2"` in `devDependencies`, then run `npm install` and `npm run flowise`.

## Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of `supabase/schema.sql`.
3. If you already have a `profiles` table without a `beauty_report` column, run `supabase/migrations/add_beauty_report.sql` in the SQL Editor to add it (for the Face Scanner beauty report).
4. If you already have a `posts` table, run `supabase/migrations/add_post_types.sql` in the SQL Editor to add slideshow, video, and blog support (post_type, media_urls, video_url; image_url nullable).
5. In **Storage**, create a bucket named **posts**, set it to **Public**, and add policies (public read; authenticated insert; user-scoped update/delete). Allow both image and video file types for slideshows and short videos.
6. Copy your project URL and anon key from **Settings > API** into `.env`:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`

## Flowise (self‑hosted chatflows)

Use Flowise when you want to run your own chatflow (e.g. custom chains, local models). If `VITE_DAEDALUS_API_KEY` is set, Dedalus is used instead; remove or leave Flowise vars unset to use only Dedalus.

1. Create a Chatflow in the Flowise UI and get its **Chatflow ID** from the URL (e.g. `http://localhost:3000/flow/abc-123` → ID is `abc-123`).
2. Add to `.env`: `VITE_FLOWISE_API_URL=http://localhost:3000` and `VITE_FLOWISE_CHATFLOW_ID=your-chatflow-id`.
3. If you get **403 Forbidden**, open **http://localhost:3000/signin** or create a user: `npx flowise user --email "you@example.com" --password "YourPassword123!"`

### Ask AI error: "Ending nodes not found"

If the Explore **Ask AI** returns `chatflowsService.checkIfChatflowIsValidForStreaming - Ending nodes not found`, the chatflow has no valid **ending node** for streaming. Fix it in Flowise:

1. Open your chatflow in the Flowise UI (**http://localhost:3000/flow** → select your flow).
2. The flow must end with a node that produces the reply (e.g. **Chat Models → OpenAI** or **ChatOpenAI**, or another LLM node that returns the final message).
3. Add or connect:
   - **Add a Chat Model node:** In the node panel, add **Chat Models → OpenAI** (or **ChatOpenAI**). Open the node and set your OpenAI API key in its credentials.
   - **Wire input → model:** Connect your **Message Chain** (or the node that receives the user question) into the Chat Model node. The Chat Model must be the **last** node in the chain (nothing after it that produces the final answer).
   - **Single path:** There must be one clear path from the question input to the Chat Model, with no disconnected branches. The flow’s “end” must be the Chat Model output.
4. Save and test in Flowise’s built-in chat. Then try **Ask AI** in the beauty app again.

Using a **Basic LLM Chain** or **Conversation Chain** template when creating the flow usually gives a valid ending node.

## Run the app

```bash
npm install
npm run dev
```

## Facial geometry (and OpenCV)

The face scanner uses **MediaPipe Face Mesh** in the browser and **`lib/face-geometry.js`** to derive facial geometry from 468 landmarks: face shape (oval), lip shape, left/right eye shape, nose shape, and left/right eyebrow shape. Each region has ordered contour points and simple metrics (center, width, height, aspect ratio). No OpenCV is required for this.

If you want to use **OpenCV** for facial geometry:

- **Browser (opencv.js):** OpenCV compiled to WebAssembly can run in the browser, but it typically provides face *detection* (bounding box) and optionally 5-point landmarks, not the dense 468-point mesh. You can use [opencv.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) for detection and then keep using MediaPipe for landmarks, or process contours with OpenCV on top of MediaPipe points.
- **Backend (Python + OpenCV/dlib):** Send a snapshot (e.g. `canvas.toDataURL('image/jpeg')`) from the scanner to a small API that runs OpenCV and dlib (or MediaPipe) to compute 68- or 468-point landmarks, then return JSON. Your frontend can call that API and pass the returned landmarks into `getFaceGeometry()` (using the same index convention) or use the backend’s own geometry output.

## Face analysis backend (face shape + lip fullness)

An optional Python backend can receive the current camera frame and return **face shape** and **lip fullness** so the app can use server-side analysis (e.g. MediaPipe/OpenCV on the server).

1. **Create a virtualenv and install dependencies**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```

2. **Run the backend** (from the `backend` folder, with venv activated)
   ```bash
   python -m flask --app app run -p 5000
   ```
   Or: `python app.py` (runs on port 5000).

3. **Point the frontend at the backend**  
   In the project root `.env` add:
   ```env
   VITE_FACE_API_URL=http://localhost:5000
   ```
   Restart `npm run dev`. When you click **Analyze**, the app will POST the current frame to `POST /api/analyze-face` and use the returned `faceShape` and `lipFullness` in the results (overwriting the in-browser classification when the backend responds).
