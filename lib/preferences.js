import { supabase, isSupabaseConfigured } from "./supabase.js";

/** Default style options shown in survey and edit */
export const STYLE_OPTIONS = [
  "daily",
  "glam",
  "cosplay",
  "douyin",
  "matte",
  "dewy",
  "natural",
  "editorial",
  "k-beauty",
  "minimal",
];

/** Default content type options */
export const CONTENT_OPTIONS = [
  "tutorials",
  "GRWMs",
  "product reviews",
  "get ready with me",
  "swatches",
  "dupes",
  "routines",
  "trends",
];

/**
 * Fetch current user's preferences from profile.
 * @param {string} userId
 * @returns {Promise<{ data: { survey_completed?: boolean, style_preferences?: string[], content_preferences?: string[], has_initial_face_report?: boolean } | null, error: any }>}
 */
export async function getPreferences(userId) {
  if (!isSupabaseConfigured() || !userId)
    return { data: null, error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("survey_completed, style_preferences, content_preferences, has_initial_face_report")
    .eq("id", userId)
    .single();
  return {
    data: data
      ? {
          survey_completed: !!data.survey_completed,
          style_preferences: Array.isArray(data.style_preferences) ? data.style_preferences : [],
          content_preferences: Array.isArray(data.content_preferences) ? data.content_preferences : [],
          has_initial_face_report: !!data.has_initial_face_report,
        }
      : null,
    error,
  };
}

/**
 * Update user preferences. Merges with existing if partial payload.
 * @param {string} userId
 * @param {{ survey_completed?: boolean, style_preferences?: string[], content_preferences?: string[], has_initial_face_report?: boolean }} prefs
 */
export async function updatePreferences(userId, prefs) {
  if (!isSupabaseConfigured() || !userId) return { error: "Not configured" };
  const payload = { updated_at: new Date().toISOString() };
  if (prefs.survey_completed !== undefined) payload.survey_completed = prefs.survey_completed;
  if (prefs.style_preferences !== undefined) payload.style_preferences = prefs.style_preferences;
  if (prefs.content_preferences !== undefined) payload.content_preferences = prefs.content_preferences;
  if (prefs.has_initial_face_report !== undefined) payload.has_initial_face_report = prefs.has_initial_face_report;
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  return { error: error?.message || null };
}

/**
 * Placeholder: suggested tabs based on recommendation algorithm.
 * Later this will call the backend / use engagement data.
 * @param {string} _userId
 * @returns {Promise<{ suggestedStyles: string[], suggestedContent: string[] }>}
 */
export async function getSuggestedTabs(_userId) {
  return {
    suggestedStyles: [],
    suggestedContent: [],
  };
}
