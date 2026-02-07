-- Beauty Assistant MVP – run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  undertone text,
  survey_completed boolean default false,
  style_preferences text[] default '{}',
  content_preferences text[] default '{}',
  has_initial_face_report boolean default false,
  followers_count int default 0,
  following_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Posts (user uploads: image, slideshow up to 4, video up to 5s, or text blog up to 200 chars)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'image' check (post_type in ('image', 'slideshow', 'video', 'blog')),
  image_url text,
  media_urls text[] default '{}',
  video_url text,
  caption text,
  tags text[] default '{}',
  likes_count int default 0,
  created_at timestamptz default now()
);

-- Follows (for followers/following counts)
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;

-- Profiles: read all, update own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Posts: read all, insert/update/delete own
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can insert own post" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own post" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own post" on public.posts for delete using (auth.uid() = user_id);

-- Follows
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can insert own follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can delete own follow" on public.follows for delete using (auth.uid() = follower_id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for post images (create in Dashboard > Storage: bucket name "posts", public)
-- Then in SQL or Dashboard: allow authenticated uploads and public read
-- insert into storage.buckets (id, name, public) values ('posts', 'posts', true);
-- create policy "Anyone can view post images" on storage.objects for select using (bucket_id = 'posts');
-- create policy "Authenticated users can upload" on storage.objects for insert with check (bucket_id = 'posts' and auth.role() = 'authenticated');
-- create policy "Users can update own uploads" on storage.objects for update using (auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can delete own uploads" on storage.objects for delete using (auth.uid()::text = (storage.foldername(name))[1]);
