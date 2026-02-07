import { supabase, isSupabaseConfigured } from "./supabase.js";

export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  if (!isSupabaseConfigured()) return { error: null };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, fullName = "") {
  if (!isSupabaseConfigured()) return { error: null };
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  if (!isSupabaseConfigured()) return () => {};
  return supabase.auth.onAuthStateChange(callback).data.subscription.unsubscribe;
}
