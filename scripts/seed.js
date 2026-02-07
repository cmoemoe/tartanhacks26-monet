/**
 * Seed script: re-seeds dummy data (removes existing seed users first, then creates 10 users + 30 posts).
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (or .env in project root).
 *
 * Run: npm run seed
 * Edit scripts/seed-data.js and run again to refresh data without manual deletes.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { SEED_PROFILES, SEED_POSTS } from "./seed-data.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  console.error("Get the service role key from Supabase Dashboard → Settings → API (use only server-side).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Dummy password for seed users (they won't log in; optional: change in Dashboard if needed)
const SEED_PASSWORD = "SeedDemoPass1!";
const SEED_EMAIL_PREFIX = "beauty-seed-";
const SEED_EMAIL_DOMAIN = "@demo.example.com";

/** Delete existing seed users (cascade removes their profiles and posts). */
async function clearSeedUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Failed to list users for re-seed:", error.message);
    throw error;
  }
  const seedUsers = (data?.users ?? []).filter(
    (u) => u.email?.startsWith(SEED_EMAIL_PREFIX) && u.email?.endsWith(SEED_EMAIL_DOMAIN)
  );
  if (seedUsers.length === 0) return;
  console.log(`Re-seed: removing ${seedUsers.length} existing seed user(s)...`);
  for (const u of seedUsers) {
    const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
    if (delError) {
      console.error(`Failed to delete ${u.email}:`, delError.message);
      throw delError;
    }
    console.log(`  Removed: ${u.email}`);
  }
  console.log("");
}

async function main() {
  await clearSeedUsers();
  const userIds = [];

  console.log("Creating 10 dummy users...");
  for (let i = 0; i < SEED_PROFILES.length; i++) {
    const p = SEED_PROFILES[i];
    const email = `${SEED_EMAIL_PREFIX}${i + 1}${SEED_EMAIL_DOMAIN}`;
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: p.full_name },
    });
    if (error) {
      console.error(`Failed to create user ${email}:`, error.message);
      throw error;
    }
    userIds.push(user.user.id);
    console.log(`  Created: ${p.full_name} (${p.username})`);
  }

  console.log("\nUpdating profiles (username, bio, avatar_url)...");
  for (let i = 0; i < SEED_PROFILES.length; i++) {
    const p = SEED_PROFILES[i];
    const id = userIds[i];
    const avatar_url = `https://picsum.photos/seed/avatar-${p.username}/200/200`;
    const { error } = await supabase
      .from("profiles")
      .update({
        username: p.username,
        bio: p.bio,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      console.error(`Failed to update profile for ${p.username}:`, error.message);
      throw error;
    }
  }

  console.log("\nInserting 30 posts...");
  for (const post of SEED_POSTS) {
    const user_id = userIds[post.profileIndex];
    const row = {
      user_id,
      post_type: post.post_type,
      caption: post.caption,
      tags: post.tags || [],
      likes_count: post.likes_count ?? 0,
    };
    if (post.image_url != null) row.image_url = post.image_url;
    if (post.media_urls != null && post.media_urls.length > 0) row.media_urls = post.media_urls;
    if (post.video_url != null) row.video_url = post.video_url;

    const { error } = await supabase.from("posts").insert(row);
    if (error) {
      console.error("Failed to insert post:", post.caption?.slice(0, 40), error.message);
      throw error;
    }
  }

  console.log("\nDone. 10 users and 30 posts created.");
  console.log(`Seed user emails: ${SEED_EMAIL_PREFIX}1${SEED_EMAIL_DOMAIN} … ${SEED_EMAIL_PREFIX}10${SEED_EMAIL_DOMAIN}`);
  console.log("(Password for all: " + SEED_PASSWORD + " – change in Supabase Auth if needed.)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
