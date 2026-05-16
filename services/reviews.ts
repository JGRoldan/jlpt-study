import { supabase } from '@/lib/supabase';
import type { Review, Quality } from '@/types';
import { calculateSM2 } from '@/lib/sm2';

export async function getReviewsForReview(deviceId: string): Promise<Review[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, word:words(*, category:categories(*))')
    .eq('device_id', deviceId)
    .lte('next_review', now)
    .order('next_review', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getReviewByWord(
  deviceId: string,
  wordId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('device_id', deviceId)
    .eq('word_id', wordId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOrUpdateReview(
  deviceId: string,
  wordId: string,
  quality: Quality
): Promise<Review> {
  const existing = await getReviewByWord(deviceId, wordId);

  const sm2Result = calculateSM2(
    quality,
    existing?.repetitions ?? 0,
    existing?.interval_days ?? 1,
    existing?.ease_factor ?? 2.5
  );

  const reviewData = {
    device_id: deviceId,
    word_id: wordId,
    repetitions: sm2Result.repetitions,
    interval_days: sm2Result.interval_days,
    ease_factor: sm2Result.ease_factor,
    next_review: sm2Result.next_review.toISOString(),
    last_review: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from('reviews')
      .update(reviewData)
      .eq('id', existing.id)
      .select('*, word:words(*, category:categories(*))')
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select('*, word:words(*, category:categories(*))')
      .single();

    if (error) throw error;
    return data;
  }
}

export async function getReviewStats(deviceId: string) {
  const now = new Date().toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const { data: pending } = await supabase
    .from('reviews')
    .select('id')
    .eq('device_id', deviceId)
    .lte('next_review', now);

  const { data: total } = await supabase
    .from('reviews')
    .select('id')
    .eq('device_id', deviceId);

  const { data: todayReviews } = await supabase
    .from('reviews')
    .select('id, last_review')
    .eq('device_id', deviceId)
    .gte('last_review', todayStr);

  const { data: nextReview } = await supabase
    .from('reviews')
    .select('next_review')
    .eq('device_id', deviceId)
    .gt('next_review', now)
    .order('next_review', { ascending: true })
    .limit(1);

  const { data: learnedCount } = await supabase
    .from('reviews')
    .select('id')
    .eq('device_id', deviceId)
    .gte('repetitions', 1);

  return {
    pending: pending?.length ?? 0,
    total: total?.length ?? 0,
    studiedToday: todayReviews?.length ?? 0,
    learned: learnedCount?.length ?? 0,
    nextReviewDate: nextReview?.[0]?.next_review || null,
  };
}

export async function getNewWords(deviceId: string): Promise<any[]> {
  const { data: reviewedWordIds } = await supabase
    .from('reviews')
    .select('word_id')
    .eq('device_id', deviceId);

  const reviewedIds = reviewedWordIds?.map(r => r.word_id) || [];

  let query = supabase
    .from('words')
    .select('*, category:categories(*)')
    .limit(50);

  if (reviewedIds.length > 0) {
    query = query.not('id', 'in', `(${reviewedIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Shuffle en el cliente
  const words = data || [];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  
  return words.slice(0, 20);
}

export async function getAllStats(deviceId: string) {
  const { data: allWords } = await supabase
    .from('words')
    .select('id, jlpt_level');

  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, slug');

  const categoryMap = new Map();
  allCategories?.forEach(c => categoryMap.set(c.id, c.slug));

  const { data: allReviews } = await supabase
    .from('reviews')
    .select('id, repetitions, word_id')
    .eq('device_id', deviceId);

  const reviewMap = new Map();
  allReviews?.forEach(r => reviewMap.set(r.word_id, r.repetitions));

  const now = new Date().toISOString();
  const { data: pendingReviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('device_id', deviceId)
    .lte('next_review', now);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayReviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('device_id', deviceId)
    .gte('last_review', today.toISOString());

  const byLevel = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  const byCategory: { [key: string]: number } = {};
  let mastered = 0;
  let learning = 0;
  let newWords = 0;

  // Contar palabras por nivel sin duplicados
  const wordCountByLevel = new Map();
  const wordCountByCategory = new Map();

  allWords?.forEach(w => {
    const level = w.jlpt_level as keyof typeof byLevel;
    if (level && byLevel[level] !== undefined) {
      wordCountByLevel.set(level, (wordCountByLevel.get(level) || 0) + 1);
    }
  });

  // Obtener categorías de palabras
  const { data: wordsWithCat } = await supabase
    .from('words')
    .select('id, category_id');

  wordsWithCat?.forEach(w => {
    const catSlug = categoryMap.get(w.category_id) || 'sin categoría';
    wordCountByCategory.set(catSlug, (wordCountByCategory.get(catSlug) || 0) + 1);
  });

  // Contar aprendidas
  allReviews?.forEach(r => {
    const reps = r.repetitions;
    if (reps >= 5) {
      mastered++;
    } else if (reps >= 1) {
      learning++;
    }
  });

  newWords = (allWords?.length || 0) - (allReviews?.length || 0);

  const finalByLevel = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
  wordCountByLevel.forEach((count, level) => {
    if (level in finalByLevel) {
      finalByLevel[level as keyof typeof finalByLevel] = count;
    }
  });

  return {
    total: allWords?.length || 0,
    learned: allReviews?.length || 0,
    pending: pendingReviews?.length || 0,
    studiedToday: todayReviews?.length || 0,
    mastered,
    learning,
    new: newWords > 0 ? newWords : 0,
    byLevel: finalByLevel,
    byCategory: Object.fromEntries(wordCountByCategory),
  };
}