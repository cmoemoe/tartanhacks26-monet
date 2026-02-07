import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { getSession, signOut } from "./lib/auth.js";
import { fetchProfile, fetchUserPosts } from "./lib/posts.js";

const profileAvatar = document.getElementById("profileAvatar");
const profileInfo = document.getElementById("profileInfo");
const profileBio = document.getElementById("profileBio");
const profileStats = document.getElementById("profileStats");
const profileLooksGrid = document.getElementById("profileLooksGrid");
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
        .map(
          (p) =>
            `<div class="profileLookThumb" style="background-image: url('${escapeHtml(p.image_url)}'); background-size: cover; background-position: center;"></div>`
        )
        .join("");
    }
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
