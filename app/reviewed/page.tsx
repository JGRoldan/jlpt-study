'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flashcard } from '@/components/flashcard/flashcard';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { createOrUpdateReview } from '@/services/reviews';
import { supabase } from '@/lib/supabase';
import type { Quality, Word } from '@/types';

const PAGE_SIZE = 20;
const DOMINATED_THRESHOLD = 10;

export default function ReviewedPage() {
  const deviceId = useDeviceId();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studiedToday, setStudiedToday] = useState(0);
  const [dominatedCount, setDominatedCount] = useState(0);

  const loadData = async () => {
    if (!deviceId) return;
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, word:words(*, category:categories(*))')
        .eq('device_id', deviceId)
        .gte('repetitions', 1)
        .lt('repetitions', DOMINATED_THRESHOLD);

      if (error) throw error;

      const dominated = reviews?.filter(r => r.repetitions >= DOMINATED_THRESHOLD).length || 0;
      setDominatedCount(dominated);

      const reviewWords = (reviews || [])
        .filter(r => r.word && r.repetitions < DOMINATED_THRESHOLD)
        .map(r => r.word) as Word[];

      const shuffled = [...reviewWords].sort(() => Math.random() - 0.5).slice(0, PAGE_SIZE);
      setWords(shuffled);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading reviewed words:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deviceId]);

  const goNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      loadData();
    }
  };

  const handleResponse = async (quality: Quality) => {
    if (!deviceId || !words[currentIndex]) return;
    try {
      await createOrUpdateReview(deviceId, words[currentIndex].id, quality);
      setStudiedToday(prev => prev + 1);
      goNext();
    } catch (error) {
      console.error('Error saving review:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen p-4">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">← Volver</Button>
          </Link>
          <h1 className="text-xl font-bold">Repasar</h1>
          <div />
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-2xl">🎉 ¡Todo dominado!</p>
            <p className="text-muted-foreground">
              {dominatedCount > 0 
                ? `Tienes ${dominatedCount} palabras dominadas.`
                : 'No hay palabras para repasar.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Estudia palabras nuevas en "Estudiar"
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-xl font-bold">Repasar</h1>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div className="flex gap-2 justify-center text-sm text-muted-foreground">
        <span>📚 {studiedToday} hoy</span>
        <span>•</span>
        <span>✅ {dominatedCount} dominadas</span>
      </div>

      <Flashcard word={currentWord} />

      <div className="flex flex-col gap-2 max-w-md mx-auto">
        <Button
          onClick={() => handleResponse(5)}
          className="w-full border-2 border-green-600 text-green-600 bg-white hover:bg-green-50 font-bold text-lg py-6"
        >
          ✅ Ya la sabía
        </Button>
        
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={() => handleResponse(0)}
            className="border-2 border-red-600 text-red-600 bg-white hover:bg-red-50 font-bold py-4"
          >
            Again
          </Button>
          <Button
            onClick={() => handleResponse(2)}
            className="border-2 border-orange-500 text-orange-600 bg-white hover:bg-orange-50 font-bold py-4"
          >
            Hard
          </Button>
          <Button
            onClick={() => handleResponse(3)}
            className="border-2 border-green-600 text-green-600 bg-white hover:bg-green-50 font-bold py-4"
          >
            Good
          </Button>
          <Button
            onClick={() => handleResponse(4)}
            className="border-2 border-blue-500 text-blue-500 bg-white hover:bg-blue-50 font-bold py-4"
          >
            Easy
          </Button>
        </div>
      </div>
    </div>
  );
}