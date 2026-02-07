const FLOWISE_URL = import.meta.env.VITE_FLOWISE_API_URL ?? "";
const FLOWISE_CHATFLOW_ID = import.meta.env.VITE_FLOWISE_CHATFLOW_ID ?? "";

export function isFlowiseConfigured() {
  return !!(FLOWISE_URL && FLOWISE_CHATFLOW_ID);
}

export async function askFlowise(question) {
  if (!isFlowiseConfigured()) {
    return {
      error: "Flowise not configured. Set VITE_FLOWISE_API_URL and VITE_FLOWISE_CHATFLOW_ID in .env",
    };
  }
  const url = `${FLOWISE_URL.replace(/\/$/, "")}/api/v1/prediction/${FLOWISE_CHATFLOW_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text || res.statusText };
  }
  const data = await res.json();
  const text =
    data?.text ??
    data?.result ??
    (typeof data?.data === "string" ? data.data : data?.data?.text) ??
    (data?.output ?? data?.message) ??
    JSON.stringify(data);
  return { text: String(text), error: null };
}
