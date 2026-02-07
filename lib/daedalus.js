const DAEDALUS_API_URL = import.meta.env.VITE_DAEDALUS_API_URL ?? "https://api.dedaluslabs.ai";
const DAEDALUS_API_KEY = import.meta.env.VITE_DAEDALUS_API_KEY ?? "";
const DAEDALUS_MODEL = import.meta.env.VITE_DAEDALUS_MODEL ?? "google/gemini-1.5-flash";

export function isDaedalusConfigured() {
  return !!DAEDALUS_API_KEY;
}

/**
 * Build a short description of the user's beauty report for the AI context.
 * @param {object} report - beauty_report from profile (undertone, faceShape, lipFullness, etc.)
 * @returns {string}
 */
function formatBeautyReportForContext(report) {
  if (!report || typeof report !== "object") return "";
  const parts = [];
  if (report.undertone) parts.push(`Undertone: ${report.undertone}`);
  if (report.confidence != null) parts.push(`Undertone confidence: ${Math.round(report.confidence * 100)}%`);
  if (report.faceShape?.label) parts.push(`Face shape: ${report.faceShape.label}`);
  if (report.lipFullness?.label) parts.push(`Lip fullness: ${report.lipFullness.label}`);
  if (report.looks?.length) {
    const lookTitles = report.looks.map((l) => l.title).filter(Boolean);
    if (lookTitles.length) parts.push(`Suggested looks from analysis: ${lookTitles.join(", ")}`);
  }
  if (!parts.length) return "";
  return `User's face analysis (use this to personalize recommendations):\n${parts.join("\n")}\n\n`;
}

export async function askDaedalus(question, options = {}) {
  if (!isDaedalusConfigured()) {
    return {
      error:
        "Dedalus not configured. Set VITE_DAEDALUS_API_KEY in .env (get a key at https://www.dedaluslabs.ai/dashboard/api-keys).",
    };
  }
  const beautyReport = options?.beautyReport;
  const faceContext = formatBeautyReportForContext(beautyReport);

  const systemContent = `${faceContext}You are a helpful beauty and makeup advisor. You MUST respond with ONLY a single JSON object (no markdown, no code fence). Use this exact shape:
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
- Use the user's face data above (undertone, face shape, lip fullness) to tailor product recommendations—e.g. suggest shades and formulas that suit their undertone and face shape.
- Use the web search tool to find current product pages on Sephora, Ulta, and other retailers. Use ONLY URLs returned by search in the url and imageUrl fields—do not invent or guess URLs.
- For each product you recommend, include name, site (e.g. Sephora, Ulta, Amazon), url (real purchase URL from search results), and price (e.g. "$24" or "See site" if unknown).
- Prefer Sephora and Ulta when the product is sold there. imageUrl: use a real product image URL from search results when available; otherwise omit the field.
- Always include at least one product. Return ONLY the JSON object, no other text.`;

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
        { role: "system", content: systemContent },
        { role: "user", content: question },
      ],
      max_tokens: 2048,
      mcp_servers: ["dedalus-labs/brave-search"],
      max_turns: 5,
      auto_execute_tools: true,
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
