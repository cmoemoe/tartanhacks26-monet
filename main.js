// Homepage: auth + main feed + preference tabs
import { getSession, signOut } from "./lib/auth.js";
import { fetchFeed } from "./lib/posts.js";
import { isSupabaseConfigured } from "./lib/supabase.js";
import {
  getPreferences,
  updatePreferences,
  getSuggestedTabs,
  STYLE_OPTIONS,
  CONTENT_OPTIONS,
} from "./lib/preferences.js";

async function ensureAuth() {
  const session = await getSession();
  if (session || sessionStorage.getItem("beautyLoggedIn")) return session;
  window.location.href = "/login.html";
  return null;
}

function getPreferencesFallback() {
  const surveyDone = sessionStorage.getItem("beautySurveyDone") === "true";
  let style = [];
  let content = [];
  try {
    const s = sessionStorage.getItem("beautyStylePrefs");
    if (s) style = JSON.parse(s);
  } catch (_) {}
  try {
    const c = sessionStorage.getItem("beautyContentPrefs");
    if (c) content = JSON.parse(c);
  } catch (_) {}
  return { survey_completed: surveyDone, style_preferences: style, content_preferences: content };
}

let currentPreferences = { style_preferences: [], content_preferences: [] };

async function initHome() {
  const session = await ensureAuth();
  const userId = session?.user?.id;

  if (isSupabaseConfigured() && userId) {
    const { data } = await getPreferences(userId);
    if (data && !data.survey_completed) {
      window.location.href = "/survey.html";
      return;
    }
    if (data) currentPreferences = data;
  } else {
    const fallback = getPreferencesFallback();
    if (!fallback.survey_completed) {
      window.location.href = "/survey.html";
      return;
    }
    currentPreferences = fallback;
  }

  renderTabs();
  setupTabsScrollWheel();
  setupPrefsModal(userId);
  if (feedListEl) loadFeed();
}

function setupTabsScrollWheel() {
  const scrollEl = document.getElementById("feedTabsScroll");
  if (!scrollEl) return;
  scrollEl.addEventListener("wheel", (e) => {
    if (e.deltaY === 0) return;
    const canScrollLeft = scrollEl.scrollLeft > 0;
    const canScrollRight = scrollEl.scrollLeft < scrollEl.scrollWidth - scrollEl.clientWidth - 1;
    if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
      e.preventDefault();
      scrollEl.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

document.getElementById("logoutLink")?.addEventListener("click", async function (e) {
  e.preventDefault();
  if (isSupabaseConfigured()) await signOut();
  sessionStorage.removeItem("beautyLoggedIn");
  window.location.href = "/login.html";
});

const feedTabsEl = document.getElementById("feedTabs");
const feedTabsEditEl = document.getElementById("feedTabsEdit");

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function renderTabs() {
  if (!feedTabsEl) return;
  const styles = currentPreferences.style_preferences || [];
  const contents = currentPreferences.content_preferences || [];
  const tabIds = [...styles, ...contents];
  const prefTabs = tabIds.map((id) => `<span class="feedTab" data-tab="${escapeAttr(id)}" role="tab" aria-selected="false">${escapeHtml(id)}</span>`).join("");
  feedTabsEl.innerHTML =
    '<span class="feedTab active" data-tab="for-you" role="tab" aria-selected="true">For You</span>' +
    '<span class="feedTab" data-tab="following" role="tab" aria-selected="false">Following</span>' +
    prefTabs;
  feedTabsEl.querySelectorAll(".feedTab").forEach((tab) => {
    tab.addEventListener("click", () => {
      feedTabsEl.querySelectorAll(".feedTab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      feedTabsEl.querySelectorAll(".feedTab").forEach((t) => { if (t !== tab) t.setAttribute("aria-selected", "false"); });
    });
  });
}

function setupPrefsModal(userId) {
  const modal = document.getElementById("prefsModal");
  const backdrop = document.getElementById("prefsModalBackdrop");
  const closeBtn = document.getElementById("prefsModalClose");
  const saveBtn = document.getElementById("prefsModalSave");
  const styleChips = document.getElementById("prefsStyleChips");
  const contentChips = document.getElementById("prefsContentChips");
  const suggestedChips = document.getElementById("prefsSuggestedChips");
  const suggestedPlaceholder = document.getElementById("prefsSuggestedPlaceholder");

  function renderModalChips() {
    if (!styleChips || !contentChips) return;
    const styles = currentPreferences.style_preferences || [];
    const contents = currentPreferences.content_preferences || [];
    styleChips.innerHTML = STYLE_OPTIONS.map(
      (opt) =>
        `<label class="surveyChip"><input type="checkbox" name="prefStyle" value="${escapeAttr(opt)}" ${styles.includes(opt) ? "checked" : ""} /><span class="surveyChipLabel">${escapeHtml(opt)}</span></label>`
    ).join("");
    contentChips.innerHTML = CONTENT_OPTIONS.map(
      (opt) =>
        `<label class="surveyChip"><input type="checkbox" name="prefContent" value="${escapeAttr(opt)}" ${contents.includes(opt) ? "checked" : ""} /><span class="surveyChipLabel">${escapeHtml(opt)}</span></label>`
    ).join("");
  }

  async function openModal() {
    renderModalChips();
    const suggested = userId ? await getSuggestedTabs(userId) : { suggestedStyles: [], suggestedContent: [] };
    const suggestedIds = [...(suggested.suggestedStyles || []), ...(suggested.suggestedContent || [])];
    if (suggestedPlaceholder) suggestedPlaceholder.style.display = suggestedIds.length ? "none" : "block";
    if (suggestedChips) {
      suggestedChips.style.display = suggestedIds.length ? "flex" : "none";
      suggestedChips.innerHTML = suggestedIds.length
        ? suggestedIds.map((id) => `<label class="surveyChip surveyChipSuggested"><input type="checkbox" name="prefSuggested" value="${escapeAttr(id)}" /><span class="surveyChipLabel">${escapeHtml(id)}</span></label>`).join("")
        : "";
    }
    if (modal) {
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal() {
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }
  }

  async function saveModal() {
    const styleValues = Array.from(document.querySelectorAll('input[name="prefStyle"]:checked')).map((el) => el.value);
    const contentValues = Array.from(document.querySelectorAll('input[name="prefContent"]:checked')).map((el) => el.value);
    const suggestedValues = Array.from(document.querySelectorAll('input[name="prefSuggested"]:checked')).map((el) => el.value);
    const newStyles = [...new Set([...styleValues, ...suggestedValues.filter((v) => STYLE_OPTIONS.includes(v))])];
    const newContents = [...new Set([...contentValues, ...suggestedValues.filter((v) => CONTENT_OPTIONS.includes(v))])];
    currentPreferences = { ...currentPreferences, style_preferences: newStyles, content_preferences: newContents };
    if (isSupabaseConfigured() && userId) {
      await updatePreferences(userId, { style_preferences: newStyles, content_preferences: newContents });
    } else {
      sessionStorage.setItem("beautyStylePrefs", JSON.stringify(newStyles));
      sessionStorage.setItem("beautyContentPrefs", JSON.stringify(newContents));
    }
    renderTabs();
    closeModal();
  }

  feedTabsEditEl?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);
  saveBtn?.addEventListener("click", saveModal);
}

initHome();

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function formatFeedDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 60000;
  if (diff < 1) return "Just now";
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  if (diff < 43200) return `${Math.floor(diff / 1440)}d ago`;
  return d.toLocaleDateString();
}

const feedListEl = document.getElementById("feedList");

function renderPinMedia(post) {
  const type = post.post_type || (post.image_url ? "image" : "blog");
  const urls = post.media_urls?.length ? post.media_urls : (post.image_url ? [post.image_url] : []);

  if (type === "video" && post.video_url) {
    const thumb = post.image_url || urls[0] || "";
    const thumbStyle = thumb ? ` style="background-image: url('${escapeHtml(thumb)}');"` : "";
    return `<div class="feedPinMedia feedPinVideoWrap"${thumbStyle}><span class="feedPinPlayIcon" aria-hidden="true"></span><video class="feedPinVideo" src="${escapeHtml(post.video_url)}" controls playsinline muted loop></video></div>`;
  }
  if (type === "slideshow" && urls.length > 0) {
    const first = urls[0];
    return `<div class="feedPinMedia feedPinImg" style="background-image: url('${escapeHtml(first)}');"></div>`;
  }
  if (type === "blog") {
    const body = post.caption ? escapeHtml(post.caption || "") : "";
    return `<div class="feedPinMedia feedPinBlog"><p class="feedPinBlogBody">${body}</p></div>`;
  }
  const imgUrl = post.image_url || urls[0];
  if (imgUrl) {
    return `<div class="feedPinMedia feedPinImg" style="background-image: url('${escapeHtml(imgUrl)}');"></div>`;
  }
  return `<div class="feedPinMedia feedPinPlaceholder"></div>`;
}

async function loadFeed() {
  if (!feedListEl) return;
  const { data, error } = await fetchFeed();
  if (error) {
    feedListEl.innerHTML = `<div class="hint">Feed unavailable. Add Supabase to load posts.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    feedListEl.innerHTML = `<div class="hint">No posts yet. Share a look from Upload!</div>`;
    return;
  }
  feedListEl.innerHTML = data
    .map((post) => {
      const author = post.profiles || {};
      const name = author.full_name || author.username || "Someone";
      const cap = (post.caption || "").trim();
      const titleWords = cap ? cap.split(/\s+/).slice(0, 4).join(" ") : "";
      const title = titleWords ? titleWords.replace(/\s*[.,!?;:…\-–—]+$/, "").trim() || titleWords : "Untitled";
      const media = renderPinMedia(post);
      const sponsored = post.sponsored ? '<span class="feedPinSponsored">Sponsored</span>' : "";
      return `
        <article class="feedPin" data-post-type="${escapeHtml(post.post_type || "image")}">
          <a href="/post.html?id=${escapeHtml(post.id)}" class="feedPinLink">
            <div class="feedPinThumbWrap">
              ${media}
              ${sponsored}
            </div>
            <p class="feedPinTitle">${escapeHtml(title)}</p>
          </a>
          <div class="feedPinFooter">
            <div class="feedPinAvatar" style="background: linear-gradient(135deg, #ffd6e8, #d8e8ff);">${name.charAt(0)}</div>
            <span class="feedPinUsername">${escapeHtml(name)}</span>
            <button type="button" class="feedPinLike" aria-label="Like"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          </div>
        </article>
      `;
    })
    .join("");

  feedListEl.querySelectorAll(".feedPinVideoWrap").forEach((wrap) => {
    const video = wrap.querySelector(".feedPinVideo");
    if (!video) return;
    wrap.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".feedPinPlayIcon")) return;
      wrap.classList.add("is-playing");
      video.play().catch(() => {});
    });
    video.addEventListener("pause", () => wrap.classList.remove("is-playing"));
  });
}

// Feed is loaded from initHome() after survey/preferences check
