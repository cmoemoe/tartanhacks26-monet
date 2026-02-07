import { supabase, isSupabaseConfigured } from "./supabase.js";

const BUCKET = "posts";

export async function uploadPostImage(file, userId) {
  if (!isSupabaseConfigured()) return { url: null, error: "Supabase not configured" };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/jpeg/, "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error: error.message };
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: urlData.publicUrl, error: null };
}

export async function uploadPostVideo(file, userId) {
  if (!isSupabaseConfigured()) return { url: null, error: "Supabase not configured" };
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "video/mp4",
  });
  if (error) return { url: null, error: error.message };
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: urlData.publicUrl, error: null };
}

export async function insertPost({ user_id, post_type, image_url, media_urls, video_url, caption, tags }) {
  if (!isSupabaseConfigured()) return { data: null, error: null };
  const tagsArr = Array.isArray(tags) ? tags : (tags && tags.trim() ? tags.split(/[\s,]+/).map((t) => t.trim()) : []);
  const payload = {
    user_id,
    post_type: post_type || "image",
    caption: caption || null,
    tags: tagsArr,
  };
  if (image_url != null) payload.image_url = image_url;
  if (media_urls != null && media_urls.length) payload.media_urls = media_urls;
  if (video_url != null) payload.video_url = video_url;
  return supabase.from("posts").insert(payload).select("id").single();
}

export async function fetchFeed(limit = 20) {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, post_type, image_url, media_urls, video_url, caption, tags, likes_count, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [], error };
  if (!posts?.length) return { data: [], error: null };
  const userIds = [...new Set(posts.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds);
  const profileMap = (profiles ?? []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
  const data = posts.map((p) => ({
    ...p,
    profiles: profileMap[p.user_id] || null,
  }));
  return { data, error: null };
}

export async function fetchUserPosts(userId) {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  const { data, error } = await supabase
    .from("posts")
    .select("id, post_type, image_url, media_urls, video_url, caption, tags, likes_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function fetchProfile(userId) {
  if (!isSupabaseConfigured()) return { data: null, error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

/**
 * Save beauty report to user profile. Overwrites previous report (updated every analysis).
 * @param {string} userId
 * @param {{ undertone: string, confidence: number, faceShape?: { label: string }, lipFullness?: { label: string }, sampledSkinRGB: { r: number, g: number, b: number }, looks?: Array<{ title: string }> }} report
 */
export async function updateBeautyReport(userId, report) {
  if (!isSupabaseConfigured()) return { error: "Supabase not configured" };
  const beautyReport = {
    undertone: report.undertone,
    confidence: report.confidence,
    faceShape: report.faceShape ? { label: report.faceShape.label } : null,
    lipFullness: report.lipFullness ? { label: report.lipFullness.label } : null,
    sampledSkinRGB: report.sampledSkinRGB,
    looks: report.looks || [],
    updatedAt: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("profiles")
    .update({
      beauty_report: beautyReport,
      undertone: report.undertone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  return { error: error?.message || null };
}

export async function getPostCount(userId) {
  if (!isSupabaseConfigured()) return 0;
  const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}
