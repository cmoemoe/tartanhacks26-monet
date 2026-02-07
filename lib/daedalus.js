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
      messages: [
        {
          role: "system",
          content: `You are a helpful beauty and makeup advisor. You MUST respond with ONLY a single JSON object (no markdown, no code fence). Use this exact shape:
{
  "intro": "1-2 sentences of advice or context for the user.",
  "products": [
    {
      "name": "Full product name",
      "site": "Sephora",
      "url": "https://www.sephora.com/...",
      "price": "$24.00",
      "imageUrl": "https://..."
    }
  ]
}

Rules:
- For each product you recommend, include name, site (e.g. Sephora, Ulta, Amazon, or brand name), url (real purchase/search URL from that site), and price (e.g. "$24" or "From $18"; use "See site" if unknown).
- Prefer Sephora and Ulta when the product is sold there. Use real working URLs (sephora.com, ulta.com).
- imageUrl: use a real product image URL if you know one (e.g. from the retailer's CDN); otherwise omit the field or use empty string.
- Always include at least one product. Return ONLY the JSON object, no other text.`,
        },
        { role: "user", content: question },
      ],
      max_tokens: 2048,
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
