import { askAI, isAIConfigured, getAIBackend } from "./lib/ai.js";
import { getSession } from "./lib/auth.js";
import { fetchProfile, fetchFeed, searchPosts } from "./lib/posts.js";

const searchInput = document.getElementById("searchInput");
const exploreSearchForm = document.getElementById("exploreSearchForm");
const exploreSearchResults = document.getElementById("exploreSearchResults");
const exploreSearchResultsList = document.getElementById("exploreSearchResultsList");
const exploreSearchResultsTitle = document.getElementById("exploreSearchResultsTitle");
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

function getPostTitleShort(caption) {
  const cap = (caption || "").trim();
  if (!cap) return "Untitled";
  const words = cap.split(/\s+/).slice(0, 4).join(" ");
  return words.replace(/\s*[.,!?;:…\-–—]+$/, "").trim() || words;
}

function renderSearchPinMedia(post) {
  const type = post.post_type || (post.image_url ? "image" : "blog");
  const urls = post.media_urls?.length ? post.media_urls : (post.image_url ? [post.image_url] : []);
  if (type === "video" && post.video_url) {
    const thumb = post.image_url || urls[0] || "";
    const thumbStyle = thumb ? ` style="background-image: url('${escapeAttr(thumb)}');"` : "";
    return `<div class="feedPinMedia feedPinVideoWrap"${thumbStyle}><span class="feedPinPlayIcon" aria-hidden="true"></span><video class="feedPinVideo" src="${escapeAttr(post.video_url)}" controls playsinline muted loop></video></div>`;
  }
  if (type === "slideshow" && urls.length > 0) {
    return `<div class="feedPinMedia feedPinImg" style="background-image: url('${escapeAttr(urls[0])}');"></div>`;
  }
  if (type === "blog") {
    const body = post.caption ? escapeHtml((post.caption || "").slice(0, 200)) : "";
    return `<div class="feedPinMedia feedPinBlog"><p class="feedPinBlogBody">${body}</p></div>`;
  }
  const url = post.image_url || urls[0];
  if (url) return `<div class="feedPinMedia feedPinImg" style="background-image: url('${escapeAttr(url)}');"></div>`;
  return `<div class="feedPinMedia feedPinPlaceholder"></div>`;
}

searchInput?.addEventListener("input", () => {
  if (exploreSearchResults && !searchInput?.value?.trim()) {
    exploreSearchResults.hidden = true;
  }
});

searchInput?.addEventListener("search", () => {
  if (exploreSearchResults && !searchInput?.value?.trim()) {
    exploreSearchResults.hidden = true;
  }
});

exploreSearchForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = searchInput?.value?.trim() || "";
  if (!exploreSearchResultsList) return;
  if (!q) {
    exploreSearchResults.hidden = true;
    return;
  }
  exploreSearchResults.hidden = false;
  exploreSearchResultsList.innerHTML = '<div class="hint">Searching…</div>';
  const { data, error } = await searchPosts(q);
  if (error) {
    exploreSearchResultsList.innerHTML = `<div class="hint">Search failed. Try again.</div>`;
    return;
  }
  if (!data?.length) {
    exploreSearchResultsList.innerHTML = `<div class="hint">No posts match "${escapeHtml(q)}".</div>`;
    if (exploreSearchResultsTitle) exploreSearchResultsTitle.textContent = "Search results";
    return;
  }
  if (exploreSearchResultsTitle) exploreSearchResultsTitle.textContent = `Search results (${data.length})`;
  exploreSearchResultsList.innerHTML = data
    .map((post) => {
      const author = post.profiles || {};
      const name = author.full_name || author.username || "Someone";
      const title = getPostTitleShort(post.caption);
      const media = renderSearchPinMedia(post);
      return `
        <article class="feedPin" data-post-type="${escapeAttr(post.post_type || "image")}">
          <a href="/post.html?id=${escapeAttr(post.id)}" class="feedPinLink">
            <div class="feedPinThumbWrap">${media}</div>
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
  exploreSearchResultsList.querySelectorAll(".feedPinVideoWrap").forEach((wrap) => {
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
});

const askAiTitle = document.getElementById("askAiTitle");
if (askAiTitle) askAiTitle.textContent = "Monet Beauty Assistant";

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
      askAiSubmit.innerHTML = "…";
    }
    if (aiResponseEl) aiResponseEl.textContent = "Thinking…";
    if (aiResponseCard) aiResponseCard.classList.remove("hidden");

    const session = await getSession();
    const userId = session?.user?.id;
    let beautyReport = null;
    if (userId) {
      const { data: profile } = await fetchProfile(userId);
      beautyReport = profile?.beauty_report ?? null;
    }

    const { text, error } = await askAI(question, { beautyReport });

    if (askAiSubmit) {
      askAiSubmit.disabled = false;
      askAiSubmit.innerHTML = '<svg class="askAiBtnIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
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

document.querySelectorAll(".exploreAiPromptChip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prompt = btn.getAttribute("data-prompt");
    if (prompt && askAiInput) {
      askAiInput.value = prompt;
      if (askAiForm) askAiForm.requestSubmit();
    }
  });
});

const exploreFeedList = document.getElementById("exploreFeedList");

async function loadExploreFeed() {
  if (!exploreFeedList) return;
  const { data, error } = await fetchFeed();
  if (error) {
    exploreFeedList.innerHTML = `<div class="hint">Feed unavailable. Add Supabase to load posts.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    exploreFeedList.innerHTML = `<div class="hint">No posts yet. Share a look from Upload!</div>`;
    return;
  }
  exploreFeedList.innerHTML = data
    .map((post) => {
      const author = post.profiles || {};
      const name = author.full_name || author.username || "Someone";
      const title = getPostTitleShort(post.caption);
      const media = renderSearchPinMedia(post);
      return `
        <article class="feedPin" data-post-type="${escapeAttr(post.post_type || "image")}">
          <a href="/post.html?id=${escapeAttr(post.id)}" class="feedPinLink">
            <div class="feedPinThumbWrap">${media}</div>
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
  exploreFeedList.querySelectorAll(".feedPinVideoWrap").forEach((wrap) => {
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

loadExploreFeed();

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
