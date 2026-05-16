export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Category {
  id: string;
  slug: string;
  name_es: string;
  icon: string | null;
  created_at: string;
}

export interface Word {
  id: string;
  word: string;
  kana: string;
  romaji: string | null;
  meaning_es: string;
  meaning_en: string | null;
  jlpt_level: JLPTLevel;
  category_id: string;
  example_jp: string | null;
  example_kana: string | null;
  example_es: string | null;
  audio_url: string | null;
  frequency_rank: number | null;
  created_at: string;
  category?: Category;
  repetitions?: number;
}

export interface Kanji {
  id: string;
  kanji: string;
  meaning_es: string | null;
  onyomi: string[];
  kunyomi: string[];
  jlpt_level: JLPTLevel | null;
  stroke_count: number | null;
  examples: string[];
  audio_url: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  device_id: string;
  word_id: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  next_review: string;
  last_review: string | null;
  created_at: string;
  word?: Word;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface SM2Result {
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  next_review: Date;
}