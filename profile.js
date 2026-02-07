import { isSupabaseConfigured } from "./lib/supabase.js";
import { getSession, signOut } from "./lib/auth.js";
import { fetchProfile, fetchUserPosts, deletePost } from "./lib/posts.js";

const profileName = document.getElementById("profileName");
const profileHandle = document.getElementById("profileHandle");
const profileBanner = document.getElementById("profileBanner");
const profileStatFollowing = document.getElementById("profileStatFollowing");
const profileStatFollowers = document.getElementById("profileStatFollowers");
const profileStatPosts = document.getElementById("profileStatPosts");
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
    if (profileName) profileName.textContent = "Your profile";
    if (profileStatPosts) profileStatPosts.textContent = "0";
    return;
  }
  if (!userId) return;

  const { data: profile } = await fetchProfile(userId);
  const { data: posts } = await fetchUserPosts(userId);
  const postCount = posts?.length ?? 0;

  if (profile) {
    const name = profile.full_name || profile.username || "Your profile";
    const handle = profile.username ? `@${profile.username}` : "";
    if (profileName) profileName.textContent = name;
    if (profileHandle) profileHandle.textContent = handle || "@username";
    if (profileBanner) {
      if (profile.avatar_url) {
        profileBanner.style.backgroundImage = `url(${profile.avatar_url})`;
        profileBanner.style.backgroundSize = "cover";
        profileBanner.style.backgroundPosition = "center";
      } else {
        profileBanner.style.background = "linear-gradient(135deg, #e8d5d5 0%, #d5d5e8 50%, #d5e8e0 100%)";
      }
    }
    if (profileStatFollowing) profileStatFollowing.textContent = String(profile.following_count ?? 0);
    if (profileStatFollowers) profileStatFollowers.textContent = formatCount(profile.followers_count ?? 0);
    if (profileStatPosts) profileStatPosts.textContent = String(postCount);
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
          const title = getPostTitle(p.caption);
          const views = p.likes_count != null ? `${formatCount(p.likes_count)} views` : "0 views";
          const overlay = `<div class="profileLookOverlay"><span class="profileLookOverlayTitle">${escapeHtml(title)}</span><span class="profileLookOverlayMeta">${escapeHtml(views)}</span></div>`;
          return `<div class="profileLookThumbWrap"><a href="/post.html?id=${escapeHtml(p.id)}" class="profileLookThumbLink"><div class="profileLookThumb" style="${style}">${extra}${overlay}</div></a><button type="button" class="profileLookDelete" data-post-id="${escapeHtml(p.id)}" aria-label="Delete post">×</button></div>`;
        })
        .join("");
      profileLooksGrid.querySelectorAll(".profileLookDelete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-post-id");
          if (!id || !confirm("Delete this post?")) return;
          const { error } = await deletePost(id);
          if (error) alert(error);
          else loadProfile();
        });
      });
    }
  }

  const reportUpdated = new URLSearchParams(window.location.search).get("reportUpdated") === "1";
  const bannerEl = document.getElementById("beautyReportUpdatedBanner");
  const seeMoreWrapEl = document.getElementById("beautyReportSeeMoreWrap");
  if (bannerEl) bannerEl.hidden = !reportUpdated;

  if (profileBeautyReport) {
    const report = profile?.beauty_report;
    if (!report) {
      profileBeautyReport.innerHTML = '<div class="hint">No report yet. Use Face Scanner to create one.</div>';
      if (seeMoreWrapEl) seeMoreWrapEl.hidden = true;
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
    if (seeMoreWrapEl) seeMoreWrapEl.hidden = false;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function getPostTitle(caption) {
  if (!caption || typeof caption !== "string") return "Look";
  const words = caption.trim().split(/\s+/).slice(0, 4);
  const raw = words.join(" ").replace(/[.,!?;:]$/, "");
  return raw || "Look";
}

function formatCount(n) {
  const num = Number(n);
  if (num >= 1e6) return `${(num / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(num);
}

profileLogout?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (isSupabaseConfigured()) await signOut();
  sessionStorage.removeItem("beautyLoggedIn");
  window.location.href = "/login.html";
});

loadProfile();
