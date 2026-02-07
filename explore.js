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
    if (aiResponseEl) aiResponseEl.textContent = text || "(No response)";
  });
}
