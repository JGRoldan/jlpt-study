import { supabase } from '@/lib/supabase';
import type { Word, Category } from '@/types';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name_es');

  if (error) throw error;
  return data || [];
}

export async function getWordsByCategory(categoryId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*, category:categories(*)')
    .eq('category_id', categoryId)
    .order('word');

  if (error) throw error;
  return data || [];
}

export async function getWordsByLevel(level: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*, category:categories(*)')
    .eq('jlpt_level', level)
    .order('word');

  if (error) throw error;
  return data || [];
}

export async function getRandomWords(count: number): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*, category:categories(*)')
    .limit(count);

  if (error) throw error;
  return data || [];
}

export async function getWordById(id: string): Promise<Word | null> {
  const { data, error } = await supabase
    .from('words')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function checkWordExists(word: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('words')
    .select('id')
    .eq('word', word)
    .single();

  if (error && error.code === 'PGRST116') return false;
  if (error) throw error;
  return !!data;
}

export interface InsertWord {
  word: string;
  kana: string;
  romaji: string | null;
  meaning_es: string;
  meaning_en: string | null;
  jlpt_level: string;
  category_id: string;
  example_jp: string | null;
  example_kana: string | null;
  example_es: string | null;
}

export async function insertWords(words: InsertWord[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const word of words) {
    try {
      const exists = await checkWordExists(word.word);
      if (exists) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('words').insert(word);
      if (error) {
        console.error(`Error inserting word ${word.word}:`, error);
        skipped++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`Error checking word ${word.word}:`, err);
      skipped++;
    }
  }

  return { inserted, skipped };
}