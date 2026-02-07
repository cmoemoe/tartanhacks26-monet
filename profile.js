import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { getSession, signOut } from "./lib/auth.js";
import { fetchProfile, fetchUserPosts } from "./lib/posts.js";

const profileAvatar = document.getElementById("profileAvatar");
const profileInfo = document.getElementById("profileInfo");
const profileBio = document.getElementById("profileBio");
const profileStats = document.getElementById("profileStats");
const profileLooksGrid = document.getElementById("profileLooksGrid");
const profileBeautyReport = document.getElementById("profileBeautyReport");
const profileLogout = document.getElementById("profileLogout");

async function checkAuth() {
  const session = await getSession();
  if (!session && !sessionStorage.getItem("beautyLoggedIn")) window.location.href = "/login.html";
  return session;
}

async function loadProfile() {
  const session = await checkAuth();
  const userId = session?.user?.id;
  if (!userId && !isSupabaseConfigured()) {
    if (profileInfo) profileInfo.querySelector("h1").textContent = "Your profile";
    if (profileStats) {
      const postsEl = profileStats.querySelector(".profileStat strong");
      if (postsEl) postsEl.textContent = "0";
    }
    return;
  }
  if (!userId) return;

  const { data: profile } = await fetchProfile(userId);
  const { data: posts } = await fetchUserPosts(userId);
  const postCount = posts?.length ?? 0;

  if (profile) {
    const name = profile.full_name || profile.username || "Your profile";
    if (profileAvatar) {
      profileAvatar.textContent = name.charAt(0).toUpperCase();
      profileAvatar.style.background = "linear-gradient(135deg, #ffd6e8, #d8e8ff)";
    }
    if (profileInfo) {
      profileInfo.querySelector("h1").textContent = name;
      profileInfo.querySelector(".sub").textContent =
        (profile.undertone ? `Undertone: ${profile.undertone}` : "Undertone: Not set") +
        (profile.username ? ` · @${profile.username}` : "");
    }
    if (profileBio) profileBio.querySelector("p").textContent = profile.bio || "Add a bio in settings. Share your undertone and favorite looks!";
    if (profileStats) {
      const statEls = profileStats.querySelectorAll(".profileStat");
      if (statEls[0]) statEls[0].querySelector("strong").textContent = String(postCount);
      if (statEls[1]) statEls[1].querySelector("strong").textContent = String(profile.followers_count ?? 0);
      if (statEls[2]) statEls[2].querySelector("strong").textContent = String(profile.following_count ?? 0);
    }
  }

  if (profileLooksGrid) {
    if (!posts?.length) {
      profileLooksGrid.innerHTML = '<div class="hint" style="grid-column:1/-1;">No posts yet.</div>';
    } else {
      profileLooksGrid.innerHTML = posts
        .map((p) => {
          const type = p.post_type || (p.image_url ? "image" : "blog");
          let style = "";
          let extra = "";
          if (type === "video" && p.video_url) {
            style = "background: linear-gradient(135deg, #1a1a2e, #16213e);";
            extra = '<span class="profileLookThumbPlay" aria-hidden="true">▶</span>';
          } else if (type === "blog") {
            style = "background: linear-gradient(135deg, #f0f0f5, #e8e8f0);";
            extra = '<span class="profileLookThumbBlog">📝</span>';
          } else {
            const url = p.image_url || p.media_urls?.[0];
            if (url) style = `background-image: url('${escapeHtml(url)}'); background-size: cover; background-position: center;`;
          }
          return `<div class="profileLookThumb" style="${style}">${extra}</div>`;
        })
        .join("");
    }
  }

  if (profileBeautyReport) {
    const report = profile?.beauty_report;
    if (!report) {
      profileBeautyReport.innerHTML = '<div class="hint">No report yet. Use Face Scanner and click Analyze to create one.</div>';
      return;
    }
    const u = report.undertone ? report.undertone.charAt(0).toUpperCase() + report.undertone.slice(1) : "—";
    const conf = report.confidence != null ? `${Math.round(report.confidence * 100)}%` : "—";
    const face = report.faceShape?.label ? report.faceShape.label.charAt(0).toUpperCase() + report.faceShape.label.slice(1) : "—";
    const lip = report.lipFullness?.label ? report.lipFullness.label.charAt(0).toUpperCase() + report.lipFullness.label.slice(1) : "—";
    const skin = report.sampledSkinRGB
      ? `rgb(${Math.round((report.sampledSkinRGB.r ?? 0) * 255)}, ${Math.round((report.sampledSkinRGB.g ?? 0) * 255)}, ${Math.round((report.sampledSkinRGB.b ?? 0) * 255)})`
      : "transparent";
    const updated = report.updatedAt ? new Date(report.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";
    const looksList = (report.looks || []).map((l) => escapeHtml(l.title || l)).join(", ") || "—";
    profileBeautyReport.innerHTML = `
      <div class="beautyReportGrid">
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
    `;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

profileLogout?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (isSupabaseConfigured()) await signOut();
  sessionStorage.removeItem("beautyLoggedIn");
  window.location.href = "/login.html";
});

loadProfile();
