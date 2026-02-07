// Full beauty report page: load current user's report and display
import { getSession } from "./lib/auth.js";
import { fetchProfile } from "./lib/posts.js";
import { recommend } from "./lib/recommend.js";

async function ensureAuth() {
  const session = await getSession();
  if (session || sessionStorage.getItem("beautyLoggedIn")) return session;
  window.location.href = "/login.html";
  return null;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const cardEl = document.getElementById("beautyReportPageCard");

async function loadReport() {
  if (!cardEl) return;
  const session = await ensureAuth();
  const userId = session?.user?.id;
  if (!userId) {
    cardEl.innerHTML = '<div class="hint">Log in to view your beauty report.</div>';
    return;
  }
  const { data: profile } = await fetchProfile(userId);
  const report = profile?.beauty_report;
  if (!report) {
    cardEl.innerHTML = '<div class="hint">No report yet. Use Face Scanner from your profile to create one.</div>';
    return;
  }
  const u = report.undertone ? capitalize(report.undertone) : "—";
  const conf = report.confidence != null ? `${Math.round(report.confidence * 100)}%` : "—";
  const face = report.faceShape?.label ? capitalize(report.faceShape.label) : "—";
  const lip = report.lipFullness?.label ? capitalize(report.lipFullness.label) : "—";
  const skin = report.sampledSkinRGB
    ? `rgb(${Math.round((report.sampledSkinRGB.r ?? 0) * 255)}, ${Math.round((report.sampledSkinRGB.g ?? 0) * 255)}, ${Math.round((report.sampledSkinRGB.b ?? 0) * 255)})`
    : "transparent";
  const updated = report.updatedAt ? new Date(report.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";
  const looksList = (report.looks || []).map((l) => escapeHtml(l.title || l)).join(", ") || "—";

  // Recompute full recommendations from stored undertone (same logic as scanner)
  const analysis = { undertone: report.undertone || "neutral" };
  const recs = recommend(analysis);

  function shadeToRgb(c) {
    if (!c || typeof c.r !== "number") return "transparent";
    const r = Math.round((c.r ?? 0) * 255);
    const g = Math.round((c.g ?? 0) * 255);
    const b = Math.round((c.b ?? 0) * 255);
    return `rgb(${r},${g},${b})`;
  }

  const recommendationsHtml = recs.looks
    .map(
      (look) => `
    <section class="beautyReportLook" aria-labelledby="look-${escapeHtml(look.id)}">
      <h2 class="beautyReportLookTitle" id="look-${escapeHtml(look.id)}">${escapeHtml(look.title)}</h2>
      ${(look.steps || [])
        .map(
          (step) => `
      <div class="beautyReportStep">
        <p class="beautyReportStepInstruction">${escapeHtml(step.instruction)}</p>
        <div class="beautyReportStepCategory">${escapeHtml(step.category)}</div>
        <ul class="beautyReportShades" aria-label="Suggested shades">
          ${(step.suggestedShades || [])
            .map(
              (s) => `
          <li class="beautyReportShade">
            <span class="beautyReportShadeSwatch" style="background:${shadeToRgb(s.color)};" aria-hidden="true"></span>
            <span class="beautyReportShadeName">${escapeHtml(s.name)}</span>
            <span class="beautyReportShadeReason">${escapeHtml(s.reason || "")}</span>
          </li>`
            )
            .join("")}
        </ul>
      </div>`
        )
        .join("")}
    </section>`
    )
    .join("");

  cardEl.innerHTML = `
    <div class="beautyReportGrid beautyReportPageGrid">
      <div class="beautyReportRow">
        <span class="label">Undertone</span>
        <span class="value">${escapeHtml(u)}</span>
      </div>
      <div class="beautyReportRow">
        <span class="label">Confidence</span>
        <span class="value">${escapeHtml(conf)}</span>
      </div>
      <div class="beautyReportRow">
        <span class="label">Face shape</span>
        <span class="value">${escapeHtml(face)}</span>
      </div>
      <div class="beautyReportRow">
        <span class="label">Lip fullness</span>
        <span class="value">${escapeHtml(lip)}</span>
      </div>
      <div class="beautyReportRow">
        <span class="label">Skin sample</span>
        <span class="beautyReportSwatch" style="background:${skin};"></span>
      </div>
      <div class="beautyReportRow">
        <span class="label">Suggested looks</span>
        <span class="value">${looksList}</span>
      </div>
      ${updated ? `<p class="beautyReportUpdated">Last updated: ${escapeHtml(updated)}</p>` : ""}
    </div>
    <section class="beautyReportRecommendations" aria-labelledby="recommendations-heading">
      <h2 class="beautyReportRecommendationsTitle" id="recommendations-heading">Daily makeup color recommendations</h2>
      ${recommendationsHtml}
    </section>
  `;
}

loadReport();
