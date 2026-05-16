-- Categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_es text not null,
  icon text,
  created_at timestamp default now()
);

-- Words table
create table words (
  id uuid primary key default gen_random_uuid(),
  word text unique not null,
  kana text not null,
  romaji text,
  meaning_es text not null,
  meaning_en text,
  jlpt_level text not null check (jlpt_level in ('N1', 'N2', 'N3', 'N4', 'N5')),
  category_id uuid references categories(id),
  example_jp text,
  example_kana text,
  example_es text,
  audio_url text,
  frequency_rank integer,
  created_at timestamp default now()
);

-- Kanjis table
create table kanjis (
  id uuid primary key default gen_random_uuid(),
  kanji text unique not null,
  meaning_es text,
  onyomi text[],
  kunyomi text[],
  jlpt_level text check (jlpt_level in ('N1', 'N2', 'N3', 'N4', 'N5')),
  stroke_count integer,
  examples text[],
  audio_url text,
  created_at timestamp default now()
);

-- Reviews table (device-based, no auth)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  word_id uuid references words(id) on delete cascade,
  repetitions integer default 0,
  interval_days integer default 1,
  ease_factor float default 2.5,
  next_review timestamp default now(),
  last_review timestamp,
  created_at timestamp default now(),
  unique(device_id, word_id)
);

-- Indexes for performance
create index idx_words_jlpt_level on words(jlpt_level);
create index idx_words_category_id on words(category_id);
create index idx_reviews_device_id on reviews(device_id);
create index idx_reviews_next_review on reviews(next_review) where next_review <= now();

-- Enable Row Level Security (optional, device-based doesn't need auth)
alter table categories enable row level security;
alter table words enable row level security;
alter table kanjis enable row level security;
alter table reviews enable row level security;

-- Allow public access for this MVP
create policy "Allow public access categories" on categories for all using (true);
create policy "Allow public access words" on words for all using (true);
create policy "Allow public access kanjis" on kanjis for all using (true);
create policy "Allow public access reviews" on reviews for all using (true);