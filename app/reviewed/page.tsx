'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { supabase } from '@/lib/supabase';
import type { Word } from '@/types';

const PAGE_SIZE = 50;
const DOMINATED_THRESHOLD = 10;

interface ReviewedWord extends Word {
  repetitions: number;
  next_review: string;
}

export default function ReviewedPage() {
  const deviceId = useDeviceId();
  const [words, setWords] = useState<ReviewedWord[]>([]);
  const [displayedWords, setDisplayedWords] = useState<ReviewedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!deviceId) return;

    async function loadWords() {
      try {
        const { data: reviews, error } = await supabase
          .from('reviews')
          .select('*, word:words(*, category:categories(*))')
          .eq('device_id', deviceId)
          .gte('repetitions', 1)
          .order('last_review', { ascending: false });

        if (error) throw error;

        const wordsWithReps = (reviews || [])
          .filter(r => r.word && r.repetitions < DOMINATED_THRESHOLD)
          .map(r => ({
            ...r.word,
            repetitions: r.repetitions,
            next_review: r.next_review
          })) as ReviewedWord[];

        setWords(wordsWithReps);
        setDisplayedWords(wordsWithReps.slice(0, PAGE_SIZE));
        setHasMore(wordsWithReps.length > PAGE_SIZE);
      } catch (error) {
        console.error('Error loading reviewed words:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWords();
  }, [deviceId]);

  const loadMore = () => {
    const currentLength = displayedWords.length;
    const nextBatch = words.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedWords(prev => [...prev, ...nextBatch]);
    setHasMore(currentLength + nextBatch.length < words.length);
  };

  const dominatedCount = words.filter(w => w.repetitions >= DOMINATED_THRESHOLD).length;
  const totalReviewed = words.length + dominatedCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">← Volver</Button>
          </Link>
          <h1 className="text-xl font-bold">Palabras Vistas</h1>
        </div>
        <div className="text-sm text-muted-foreground text-center">
          {totalReviewed - dominatedCount} pendientes • {dominatedCount} dominadas
        </div>
      </div>

      {dominatedCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-sm text-green-700">
          🎉 {dominatedCount} palabras dominadas (10+ repeticiones)
        </div>
      )}

      <div className="space-y-2">
        {displayedWords.map((word) => (
          <div 
            key={word.id}
            className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border"
          >
            <div>
              <div className="flex gap-2 items-center">
                <span className="font-bold text-lg">{word.word}</span>
                <span className="text-gray-500">{word.kana}</span>
                {word.jlpt_level && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {word.jlpt_level}
                  </span>
                )}
              </div>
              <p className="text-gray-600">{word.meaning_es}</p>
            </div>
            <div className="text-right text-sm">
              <span className={`font-bold ${
                word.repetitions >= 7 ? 'text-green-600' : 
                word.repetitions >= 4 ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {word.repetitions} rep
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button 
            onClick={loadMore}
            variant="outline"
            className="border-2 border-gray-400 text-gray-600"
          >
            Cargar más ({displayedWords.length} / {words.length})
          </Button>
        </div>
      )}

      {displayedWords.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay palabras vistas aún.</p>
          <p className="text-sm mt-2">Comienza a estudiar para ver tu progreso aquí.</p>
        </div>
      )}
    </div>
  );
}