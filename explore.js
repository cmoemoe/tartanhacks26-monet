import { askFlowise, isFlowiseConfigured } from "./lib/flowise.js";
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

if (askAiForm) {
  askAiForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = askAiInput?.value?.trim();
    if (!question) return;

    if (!isFlowiseConfigured()) {
      if (aiResponseEl) aiResponseEl.innerHTML = "<p>AI not configured. Set VITE_FLOWISE_API_URL and VITE_FLOWISE_CHATFLOW_ID in .env and run Flowise.</p>";
      if (aiResponseCard) aiResponseCard.classList.remove("hidden");
      return;
    }

    if (askAiSubmit) {
      askAiSubmit.disabled = true;
      askAiSubmit.textContent = "…";
    }
    if (aiResponseEl) aiResponseEl.textContent = "Thinking…";
    if (aiResponseCard) aiResponseCard.classList.remove("hidden");

    const { text, error } = await askFlowise(question);

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
