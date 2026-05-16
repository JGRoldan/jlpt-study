'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Flashcard } from '@/components/flashcard/flashcard';
import { Button } from '@/components/ui/button';
import { getRandomWords } from '@/services/words';
import { useDeviceId } from '@/hooks/useDeviceId';
import { createOrUpdateReview } from '@/services/reviews';
import type { Quality } from '@/types';
import type { Word } from '@/types';

export default function StudyPage() {
  const deviceId = useDeviceId();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studiedCount, setStudiedCount] = useState(0);

  const shuffleWords = useCallback((data: Word[]) => {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    async function loadWords() {
      try {
        const data = await getRandomWords(20);
        shuffleWords(data);
      } catch (error) {
        console.error('Error loading words:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWords();
  }, [shuffleWords]);

  const handleMarkAsLearned = async () => {
    if (!deviceId || !words[currentIndex]) return;
    try {
      await createOrUpdateReview(deviceId, words[currentIndex].id, 5);
      setStudiedCount((c) => c + 1);
      goNext();
    } catch (error) {
      console.error('Error saving review:', error);
    }
  };

  const goNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      shuffleWords(words);
      setStudiedCount(0);
    }
  };

  const handleResponse = async (quality: Quality) => {
    if (!deviceId || !words[currentIndex]) return;
    try {
      await createOrUpdateReview(deviceId, words[currentIndex].id, quality);
      if (quality >= 3) {
        setStudiedCount((c) => c + 1);
      }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p>No hay palabras disponibles.</p>
          <p className="text-muted-foreground">
            Agrega vocabulario en Supabase para comenzar.
          </p>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const isLast = currentIndex === words.length - 1;

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Volver
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length} • Estudiadas: {studiedCount}
        </div>
        <Button
          variant="ghost"
          onClick={() => shuffleWords(words)}
        >
          🔀
        </Button>
      </div>

      <Flashcard word={currentWord} />

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleMarkAsLearned}
          className="w-full border-2 border-green-600 text-green-600 bg-white hover:bg-green-50 font-bold text-lg py-6"
        >
          ✅ Ya la sabía
        </Button>
        
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={() => handleResponse(0)}
            className="border-2 border-red-600 text-red-600 bg-white hover:bg-red-50 font-bold"
          >
            Again
          </Button>
          <Button
            onClick={() => handleResponse(2)}
            className="border-2 border-orange-500 text-orange-600 bg-white hover:bg-orange-50 font-bold"
          >
            Hard
          </Button>
          <Button
            onClick={() => handleResponse(3)}
            className="border-2 border-green-600 text-green-600 bg-white hover:bg-green-50 font-bold"
          >
            Good
          </Button>
          <Button
            onClick={() => handleResponse(4)}
            className="border-2 border-blue-500 text-blue-500 bg-white hover:bg-blue-50 font-bold"
          >
            Easy
          </Button>
        </div>
      </div>
    </div>
  );
}