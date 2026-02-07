import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { uploadPostImage, insertPost } from "./lib/posts.js";

const uploadForm = document.getElementById("uploadForm");
const uploadZone = document.getElementById("uploadZone");
const uploadInput = document.getElementById("uploadInput");
const uploadCaption = document.getElementById("uploadCaption");
const uploadTags = document.getElementById("uploadTags");
const uploadSubmit = document.getElementById("uploadSubmit");
const uploadError = document.getElementById("uploadError");
const uploadPreview = document.getElementById("uploadPreview");

let selectedFile = null;

uploadZone.addEventListener("click", () => uploadInput.click());
uploadInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  selectedFile = file;
  if (uploadPreview) {
    uploadPreview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
    uploadPreview.classList.add("hasImage");
    uploadZone.querySelector(".uploadZoneInner")?.classList.add("hasImage");
    const span = uploadZone.querySelector(".uploadZoneInner span");
    if (span) span.textContent = "Tap to change photo";
  }
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedFile && isSupabaseConfigured()) {
    if (uploadError) uploadError.textContent = "Please choose a photo.";
    return;
  }

  if (!isSupabaseConfigured()) {
    alert("Post shared! (Demo – add Supabase to upload for real.)");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (uploadError) uploadError.textContent = "Please log in again.";
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

  const caption = uploadCaption.value.trim();
  const tagsStr = uploadTags.value.trim();
  const { error: insertErr } = await insertPost({
    user_id: user.id,
    image_url: url,
    caption: caption || null,
    tags: tagsStr,
  });

  if (insertErr) {
    if (uploadError) uploadError.textContent = insertErr.message;
    uploadSubmit.disabled = false;
    return;
  }

  selectedFile = null;
  uploadInput.value = "";
  uploadCaption.value = "";
  uploadTags.value = "";
  if (uploadPreview) {
    uploadPreview.style.backgroundImage = "";
    uploadPreview.classList.remove("hasImage");
    uploadZone.querySelector(".uploadZoneInner")?.classList.remove("hasImage");
    const span = uploadZone.querySelector(".uploadZoneInner span");
    if (span) span.textContent = "Tap to add photo or drag here";
  }
  if (uploadError) uploadError.textContent = "";
  uploadSubmit.disabled = false;
  alert("Post shared!");
});
