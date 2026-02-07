import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { uploadPostImage, uploadPostVideo, insertPost } from "./lib/posts.js";

const uploadForm = document.getElementById("uploadForm");
const uploadZoneWrap = document.getElementById("uploadZoneWrap");
const uploadZone = document.getElementById("uploadZone");
const uploadInput = document.getElementById("uploadInput");
const uploadCaption = document.getElementById("uploadCaption");
const uploadCaptionWrap = document.getElementById("uploadCaptionWrap");
const uploadTags = document.getElementById("uploadTags");
const uploadSubmit = document.getElementById("uploadSubmit");
const uploadError = document.getElementById("uploadError");
const uploadPreview = document.getElementById("uploadPreview");
const uploadZoneLabel = document.getElementById("uploadZoneLabel");
const uploadSlideshowPreviews = document.getElementById("uploadSlideshowPreviews");
const uploadVideoZone = document.getElementById("uploadVideoZone");
const uploadVideoInput = document.getElementById("uploadVideoInput");
const uploadVideoInner = document.getElementById("uploadVideoInner");
const uploadVideoPreview = document.getElementById("uploadVideoPreview");
const uploadBlogZone = document.getElementById("uploadBlogZone");
const uploadBlogBody = document.getElementById("uploadBlogBody");
const uploadCharCount = document.getElementById("uploadCharCount");

const MAX_SLIDES = 4;
const MAX_VIDEO_SEC = 5;
const MAX_BLOG_CHARS = 200;

let postType = "image";
let selectedFile = null;
let selectedSlideshowFiles = [];
let selectedVideoFile = null;

function showEl(el, show) {
  if (!el) return;
  if (show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function setActiveTab(type) {
  postType = type;
  document.querySelectorAll(".uploadTypeTab").forEach((t) => {
    const isActive = t.getAttribute("data-type") === type;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive);
  });
  showEl(uploadZone, type === "image" || type === "slideshow");
  if (uploadSlideshowPreviews) {
    uploadSlideshowPreviews.style.display = type === "slideshow" ? "flex" : "none";
  }
  showEl(uploadVideoZone, type === "video");
  showEl(uploadBlogZone, type === "blog");
  showEl(uploadCaptionWrap, type !== "blog");

  if (type === "image") {
    uploadInput.removeAttribute("multiple");
    if (uploadZoneLabel) uploadZoneLabel.textContent = "Tap to add photo";
  } else if (type === "slideshow") {
    uploadInput.setAttribute("multiple", "multiple");
    if (uploadZoneLabel) uploadZoneLabel.textContent = `Tap to add up to ${MAX_SLIDES} photos`;
  }

  clearMedia();
  if (uploadError) uploadError.textContent = "";
}

function clearMedia() {
  selectedFile = null;
  selectedSlideshowFiles = [];
  selectedVideoFile = null;
  if (uploadInput) uploadInput.value = "";
  if (uploadVideoInput) uploadVideoInput.value = "";
  if (uploadPreview) {
    uploadPreview.style.backgroundImage = "";
    uploadPreview.classList.remove("hasImage");
    uploadPreview.innerHTML = "";
  }
  uploadZone?.querySelector(".uploadZoneInner")?.classList.remove("hasImage");
  if (uploadZoneLabel) uploadZoneLabel.textContent = postType === "slideshow" ? `Tap to add up to ${MAX_SLIDES} photos` : "Tap to add photo";
  if (uploadSlideshowPreviews) uploadSlideshowPreviews.innerHTML = "";
  if (uploadVideoPreview) {
    uploadVideoPreview.src = "";
    uploadVideoPreview.style.display = "none";
  }
  if (uploadVideoInner) uploadVideoInner.querySelector(".uploadVideoLabel")?.classList.remove("hidden");
  if (uploadBlogBody) uploadBlogBody.value = "";
  updateBlogCharCount();
}

document.querySelectorAll(".uploadTypeTab").forEach((btn) => {
  btn.addEventListener("click", () => setActiveTab(btn.getAttribute("data-type")));
});

uploadZone?.addEventListener("click", () => {
  if (postType === "video" || postType === "blog") return;
  uploadInput?.click();
});

uploadInput?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  const images = files.filter((f) => f.type.startsWith("image/"));
  if (postType === "image") {
    const file = images[0];
    if (!file) return;
    selectedFile = file;
    selectedSlideshowFiles = [];
    if (uploadPreview) {
      uploadPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
      uploadPreview.classList.add("hasImage");
      uploadPreview.innerHTML = "";
      uploadZone?.querySelector(".uploadZoneInner")?.classList.add("hasImage");
      if (uploadZoneLabel) uploadZoneLabel.textContent = "Tap to change photo";
    }
  } else if (postType === "slideshow") {
    selectedSlideshowFiles = images.slice(0, MAX_SLIDES);
    selectedFile = null;
    renderSlideshowPreviews();
    if (uploadZoneLabel) uploadZoneLabel.textContent = selectedSlideshowFiles.length >= MAX_SLIDES ? `${MAX_SLIDES} photos selected` : `Tap to add up to ${MAX_SLIDES} photos`;
  }
});

function renderSlideshowPreviews() {
  if (!uploadSlideshowPreviews) return;
  uploadSlideshowPreviews.innerHTML = "";
  uploadPreview?.classList.remove("hasImage");
  uploadPreview?.style.removeProperty("background-image");
  uploadPreview?.replaceChildren();
  uploadZone?.querySelector(".uploadZoneInner")?.classList.remove("hasImage");
  selectedSlideshowFiles.forEach((file, i) => {
    const div = document.createElement("div");
    div.className = "uploadSlideshowThumb";
    div.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "uploadSlideshowRemove";
    remove.setAttribute("aria-label", "Remove photo");
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      selectedSlideshowFiles.splice(i, 1);
      renderSlideshowPreviews();
      if (uploadZoneLabel) uploadZoneLabel.textContent = `Tap to add up to ${MAX_SLIDES} photos`;
    });
    div.appendChild(remove);
    uploadSlideshowPreviews.appendChild(div);
  });
}

uploadVideoZone?.addEventListener("click", (e) => {
  if (e.target.closest(".uploadVideoPreview")) return;
  uploadVideoInput?.click();
});

uploadVideoInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith("video/")) return;
  selectedVideoFile = file;
  const url = URL.createObjectURL(file);
  uploadVideoPreview.src = url;
  uploadVideoPreview.style.display = "block";
  uploadVideoInner?.querySelector(".uploadVideoLabel")?.classList.add("hidden");
  uploadVideoPreview.addEventListener("loadedmetadata", function checkDuration() {
    if (uploadVideoPreview.duration > MAX_VIDEO_SEC) {
      if (uploadError) uploadError.textContent = `Video must be ${MAX_VIDEO_SEC} seconds or shorter.`;
      selectedVideoFile = null;
      uploadVideoInput.value = "";
      uploadVideoPreview.src = "";
      uploadVideoPreview.style.display = "none";
      uploadVideoInner?.querySelector(".uploadVideoLabel")?.classList.remove("hidden");
    }
    uploadVideoPreview.removeEventListener("loadedmetadata", checkDuration);
  });
});

function updateBlogCharCount() {
  const len = (uploadBlogBody?.value || "").length;
  if (uploadCharCount) uploadCharCount.textContent = `${len} / ${MAX_BLOG_CHARS}`;
}

uploadBlogBody?.addEventListener("input", updateBlogCharCount);

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(video.duration);
      video.src = "";
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

uploadForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isSupabaseConfigured()) {
    alert("Post shared! (Demo – add Supabase to upload for real.)");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (uploadError) uploadError.textContent = "Please log in again.";
    return;
  }

  if (postType === "blog") {
    const body = (uploadBlogBody?.value || "").trim();
    if (!body) {
      if (uploadError) uploadError.textContent = "Write something for your blog post (up to 200 characters).";
      return;
    }
    if (body.length > MAX_BLOG_CHARS) {
      if (uploadError) uploadError.textContent = `Blog post must be ${MAX_BLOG_CHARS} characters or less.`;
      return;
    }
    uploadSubmit.disabled = true;
    if (uploadError) uploadError.textContent = "";
    const { error: insertErr } = await insertPost({
      user_id: user.id,
      post_type: "blog",
      caption: body,
      tags: uploadTags?.value?.trim() || "",
    });
    if (insertErr) {
      if (uploadError) uploadError.textContent = insertErr.message;
      uploadSubmit.disabled = false;
      return;
    }
    clearMedia();
    uploadTags.value = "";
    uploadSubmit.disabled = false;
    alert("Post shared!");
    return;
  }

  if (postType === "video") {
    if (!selectedVideoFile) {
      if (uploadError) uploadError.textContent = "Please add a video (max 5 seconds).";
      return;
    }
    const duration = await getVideoDuration(selectedVideoFile);
    if (duration > MAX_VIDEO_SEC) {
      if (uploadError) uploadError.textContent = `Video must be ${MAX_VIDEO_SEC} seconds or shorter.`;
      return;
    }
    uploadSubmit.disabled = true;
    if (uploadError) uploadError.textContent = "";
    const { url, error: uploadErr } = await uploadPostVideo(selectedVideoFile, user.id);
    if (uploadErr) {
      if (uploadError) uploadError.textContent = uploadErr;
      uploadSubmit.disabled = false;
      return;
    }
    const { error: insertErr } = await insertPost({
      user_id: user.id,
      post_type: "video",
      video_url: url,
      caption: uploadCaption?.value?.trim() || null,
      tags: uploadTags?.value?.trim() || "",
    });
    if (insertErr) {
      if (uploadError) uploadError.textContent = insertErr.message;
      uploadSubmit.disabled = false;
      return;
    }
    clearMedia();
    uploadCaption.value = "";
    uploadTags.value = "";
    uploadSubmit.disabled = false;
    alert("Post shared!");
    return;
  }

  if (postType === "slideshow") {
    if (!selectedSlideshowFiles.length) {
      if (uploadError) uploadError.textContent = `Add 1–${MAX_SLIDES} photos for a slideshow.`;
      return;
    }
    uploadSubmit.disabled = true;
    if (uploadError) uploadError.textContent = "";
    const mediaUrls = [];
    for (const file of selectedSlideshowFiles) {
      const { url, error: uploadErr } = await uploadPostImage(file, user.id);
      if (uploadErr) {
        if (uploadError) uploadError.textContent = uploadErr;
        uploadSubmit.disabled = false;
        return;
      }
      mediaUrls.push(url);
    }
    const { error: insertErr } = await insertPost({
      user_id: user.id,
      post_type: "slideshow",
      image_url: mediaUrls[0],
      media_urls: mediaUrls,
      caption: uploadCaption?.value?.trim() || null,
      tags: uploadTags?.value?.trim() || "",
    });
    if (insertErr) {
      if (uploadError) uploadError.textContent = insertErr.message;
      uploadSubmit.disabled = false;
      return;
    }
    clearMedia();
    uploadCaption.value = "";
    uploadTags.value = "";
    uploadSubmit.disabled = false;
    alert("Post shared!");
    return;
  }

  if (postType === "image") {
    if (!selectedFile) {
      if (uploadError) uploadError.textContent = "Please choose a photo.";
      return;
    }
    uploadSubmit.disabled = true;
    if (uploadError) uploadError.textContent = "";
    const { url, error: uploadErr } = await uploadPostImage(selectedFile, user.id);
    if (uploadErr) {
      if (uploadError) uploadError.textContent = uploadErr;
      uploadSubmit.disabled = false;
      return;
    }
    const { error: insertErr } = await insertPost({
      user_id: user.id,
      post_type: "image",
      image_url: url,
      media_urls: [url],
      caption: uploadCaption?.value?.trim() || null,
      tags: uploadTags?.value?.trim() || "",
    });
    if (insertErr) {
      if (uploadError) uploadError.textContent = insertErr.message;
      uploadSubmit.disabled = false;
      return;
    }
    clearMedia();
    uploadCaption.value = "";
    uploadTags.value = "";
    uploadSubmit.disabled = false;
    alert("Post shared!");
  }
});
