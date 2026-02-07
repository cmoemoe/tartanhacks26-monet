import { askAI, isAIConfigured, getAIBackend } from "./lib/ai.js";
import { getSession } from "./lib/auth.js";

const searchInput = document.getElementById("searchInput");
const askAiForm = document.getElementById("askAiForm");
const askAiInput = document.getElementById("askAiInput");
const askAiSubmit = document.getElementById("askAiSubmit");
const aiResponseEl = document.getElementById("aiResponse");
const aiResponseCard = document.getElementById("aiResponseCard");

async function checkAuth() {
  const session = await getSession();
  if (!session && !sessionStorage.getItem("beautyLoggedIn")) window.location.href = "/login.html";
}
checkAuth();

const askAiTitle = document.getElementById("askAiTitle");
if (askAiTitle) {
  const backend = getAIBackend();
  askAiTitle.textContent = backend ? `Ask AI (${backend === "dedalus" ? "Dedalus" : "Flowise"})` : "Ask AI";
}

if (askAiForm) {
  askAiForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = askAiInput?.value?.trim();
    if (!question) return;

    if (!isAIConfigured()) {
      if (aiResponseEl) aiResponseEl.innerHTML = "<p>AI not configured. Set VITE_DAEDALUS_API_KEY (Dedalus) or VITE_FLOWISE_* (Flowise) in .env.</p>";
      if (aiResponseCard) aiResponseCard.classList.remove("hidden");
      return;
    }

    if (askAiSubmit) {
      askAiSubmit.disabled = true;
      askAiSubmit.textContent = "…";
    }
    if (aiResponseEl) aiResponseEl.textContent = "Thinking…";
    if (aiResponseCard) aiResponseCard.classList.remove("hidden");

    const { text, error } = await askAI(question);

    if (askAiSubmit) {
      askAiSubmit.disabled = false;
      askAiSubmit.textContent = "Ask AI";
    }

    if (error) {
      if (aiResponseEl) aiResponseEl.textContent = error;
      return;
    }

    const parsed = parseProductResponse(text);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
      if (aiResponseEl) aiResponseEl.innerHTML = renderProductCards(parsed.intro, parsed.products);
    } else {
      if (aiResponseEl) aiResponseEl.textContent = text || "(No response)";
    }
  });
}

function parseProductResponse(text) {
  if (!text || typeof text !== "string") return null;
  let raw = text.trim();
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) raw = codeMatch[1].trim();
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && Array.isArray(data.products)) return data;
  } catch (_) {}
  return null;
}

function renderProductCards(intro, products) {
  const introHtml = intro
    ? `<p class="aiProductIntro">${escapeHtml(intro)}</p>`
    : "";
  const cardsHtml = products
    .map((p) => {
      const name = escapeHtml(p.name || "Product");
      const site = escapeHtml(p.site || "Store");
      const url = (p.url && p.url.startsWith("http")) ? p.url : "#";
      const price = escapeHtml(p.price != null ? String(p.price) : "See site");
      const imageUrl = p.imageUrl && p.imageUrl.startsWith("http") ? p.imageUrl : null;
      const imgHtml = imageUrl
        ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(name)}" class="aiProductCardImg" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.classList.add('show');" /><span class="aiProductCardPlaceholder">Product</span>`
        : `<span class="aiProductCardPlaceholder show">Product</span>`;
      return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="aiProductCard">
        <div class="aiProductCardImgWrap">${imgHtml}</div>
        <span class="aiProductCardSite">${site}</span>
        <span class="aiProductCardName">${name}</span>
        <span class="aiProductCardPrice">${price}</span>
      </a>`;
    })
    .join("");
  return `${introHtml}<div class="aiProductCards">${cardsHtml}</div>`;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
