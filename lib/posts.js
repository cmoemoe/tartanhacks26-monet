import { supabase, isSupabaseConfigured } from "./supabase.js";

const BUCKET = "posts";

export async function uploadPostImage(file, userId) {
  if (!isSupabaseConfigured()) return { url: null, error: "Supabase not configured" };
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { url: null, error: error.message };
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: urlData.publicUrl, error: null };
}

export async function insertPost({ user_id, image_url, caption, tags }) {
  if (!isSupabaseConfigured()) return { data: null, error: null };
  const tagsArr = Array.isArray(tags) ? tags : (tags && tags.trim() ? tags.split(/[\s,]+/).map((t) => t.trim()) : []);
  return supabase
    .from("posts")
    .insert({ user_id, image_url, caption: caption || null, tags: tagsArr })
    .select("id")
    .single();
}

export async function fetchFeed(limit = 20) {
  if (!isSupabaseConfigured()) return { data: [], error: null };
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, image_url, caption, tags, likes_count, created_at, user_id")
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
    .select("id, image_url, caption, tags, likes_count, created_at")
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

export async function getPostCount(userId) {
  if (!isSupabaseConfigured()) return 0;
  const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}
