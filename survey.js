import { getSession } from "./lib/auth.js";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { STYLE_OPTIONS, CONTENT_OPTIONS, updatePreferences } from "./lib/preferences.js";

async function ensureAuth() {
  const session = await getSession();
  if (session || sessionStorage.getItem("beautyLoggedIn")) return session;
  window.location.href = "/login.html";
  return null;
}

const surveyForm = document.getElementById("surveyForm");
const styleChips = document.getElementById("styleChips");
const contentChips = document.getElementById("contentChips");
const surveySubmit = document.getElementById("surveySubmit");
const surveyError = document.getElementById("surveyError");

function setError(msg) {
  if (surveyError) surveyError.textContent = msg;
}

function renderChips(container, options, name) {
  if (!container) return;
  container.innerHTML = options
    .map(
      (opt) =>
        `<label class="surveyChip">
          <input type="checkbox" name="${name}" value="${escapeAttr(opt)}" />
          <span class="surveyChipLabel">${escapeHtml(opt)}</span>
        </label>`
    )
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function escapeAttr(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

renderChips(styleChips, STYLE_OPTIONS, "style");
renderChips(contentChips, CONTENT_OPTIONS, "content");

surveyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId && isSupabaseConfigured()) {
    setError("Please log in again.");
    return;
  }

  const styleValues = Array.from(surveyForm.querySelectorAll('input[name="style"]:checked')).map((el) => el.value);
  const contentValues = Array.from(surveyForm.querySelectorAll('input[name="content"]:checked')).map((el) => el.value);
  const doScanNow = surveyForm.querySelector('input[name="scanner"]:checked')?.value === "now";

  surveySubmit.disabled = true;
  surveySubmit.textContent = "…";

  if (isSupabaseConfigured() && userId) {
    const { error } = await updatePreferences(userId, {
      style_preferences: styleValues,
      content_preferences: contentValues,
      survey_completed: true,
      has_initial_face_report: false,
    });
    if (error) {
      setError(error);
      surveySubmit.disabled = false;
      surveySubmit.textContent = "Continue";
      return;
    }
  } else {
    sessionStorage.setItem("beautyStylePrefs", JSON.stringify(styleValues));
    sessionStorage.setItem("beautyContentPrefs", JSON.stringify(contentValues));
    sessionStorage.setItem("beautySurveyDone", "true");
  }

  // "Do initial scan now" → scanner; "Do this later" → home
  if (doScanNow) {
    window.location.href = "/scanner.html?fromSurvey=1";
    return;
  }
  window.location.href = "/index.html";
});

ensureAuth();
