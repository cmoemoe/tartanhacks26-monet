const DAEDALUS_API_URL = import.meta.env.VITE_DAEDALUS_API_URL ?? "https://api.dedaluslabs.ai";
const DAEDALUS_API_KEY = import.meta.env.VITE_DAEDALUS_API_KEY ?? "";
const DAEDALUS_MODEL = import.meta.env.VITE_DAEDALUS_MODEL ?? "openai/gpt-4o-mini";

export function isDaedalusConfigured() {
  return !!DAEDALUS_API_KEY;
}

export async function askDaedalus(question) {
  if (!isDaedalusConfigured()) {
    return {
      error:
        "Dedalus not configured. Set VITE_DAEDALUS_API_KEY in .env (get a key at https://www.dedaluslabs.ai/dashboard/api-keys).",
    };
  }
  const url = `${DAEDALUS_API_URL.replace(/\/$/, "")}/v1/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAEDALUS_API_KEY}`,
    },
    body: JSON.stringify({
      model: DAEDALUS_MODEL,
      messages: [{ role: "user", content: question }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text || res.statusText };
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (content == null) {
    return { error: "Unexpected Dedalus response shape." };
  }
  return { text: String(content), error: null };
}
