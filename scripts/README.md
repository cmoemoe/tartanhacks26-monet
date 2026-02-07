# Seed script (dummy users + posts)

Creates **10 dummy beauty accounts** and **30 posts** (GRWM, tutorials, product reviews) so the app has content to display.

## Requirements

- **Supabase project** with schema applied (`supabase/schema.sql`).
- **Service role key** (not the anon key). Get it from [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API** → **Project API keys** → `service_role` (secret). Use only server-side; never expose in the frontend.

## Setup

1. In the project root, create or edit `.env` and add:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   The seed script uses `VITE_SUPABASE_URL` (or `SUPABASE_URL`) and **requires** `SUPABASE_SERVICE_ROLE_KEY`.

2. Install dependencies (includes `dotenv` for loading `.env`):

   ```bash
   npm install
   ```

## Run

From the project root:

```bash
npm run seed
```

Or with env vars inline (e.g. PowerShell):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"; npm run seed
```

## What it creates

- **10 users** in Supabase Auth with emails `beauty-seed-1@demo.example.com` … `beauty-seed-10@demo.example.com` (password: `SeedDemoPass1!`). You can change or delete these in Dashboard → Authentication → Users.
- **10 profiles** (username, bio, avatar) for those users.
- **30 posts** (image, slideshow, video, blog) with captions and tags based on current makeup trends (GRWM, tutorials, product reviews, Sephora/Ulta-style content). Media use Unsplash/Picsum image URLs and a sample video URL.

After running, open your app and you should see the feed populated with dummy content.

## Re-seeding (editing dummy data)

The script **removes existing seed users first** (by email pattern `beauty-seed-*@demo.example.com`), so you can edit `scripts/seed-data.js` and run `npm run seed` again to get a fresh dataset. No need to delete users or posts manually in the Dashboard.
