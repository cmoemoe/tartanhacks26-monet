# Backend setup: Supabase + Flowise

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
3. In **Storage**, create a bucket named **posts**, set it to **Public**, and add policies (public read; authenticated insert; user-scoped update/delete).
4. Copy your project URL and anon key from **Settings > API** into `.env`:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`

## Flowise (after version fix)

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
