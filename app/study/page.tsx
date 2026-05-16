'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flashcard } from '@/components/flashcard/flashcard';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { createOrUpdateReview, getReviewsForReview, getNewWords, getReviewStats } from '@/services/reviews';
import type { Quality, Word, Review } from '@/types';

interface Stats {
  pending: number;
  total: number;
  studiedToday: number;
  learned: number;
}

export default function StudyPage() {
  const deviceId = useDeviceId();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, total: 0, studiedToday: 0, learned: 0 });
  const [mode, setMode] = useState<'review' | 'new'>('review');

  const shuffleWords = (data: (Word & { review?: Review })[]) => {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
  };

  const loadData = async () => {
    if (!deviceId) return;
    try {
      const [reviewsData, statsData, newWordsData] = await Promise.all([
        getReviewsForReview(deviceId),
        getReviewStats(deviceId),
        getNewWords(deviceId)
      ]);

      setStats(statsData);
      setCurrentIndex(0);

      if (reviewsData.length > 0) {
        const reviewWords = reviewsData.map(r => r.word).filter(Boolean) as Word[];
        setWords(reviewWords);
        setMode('review');
      } else if (newWordsData.length > 0) {
        setWords(newWordsData);
        setMode('new');
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
      setStats(prev => {
        const newLearned = quality >= 3 ? prev.learned + 1 : prev.learned;
        const newTotal = prev.total + 1;
        return {
          ...prev,
          total: newTotal,
          learned: newLearned,
          studiedToday: prev.studiedToday + 1,
          pending: prev.pending
        };
      });
      goNext();
    } catch (error) {
      console.error('Error saving review:', error);
    }
  };

  const handleMarkAsLearned = async () => {
    await handleResponse(5);
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
          <h1 className="text-xl font-bold">Estudiar</h1>
          <div />
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-xl">🎉 ¡Todo al día!</p>
            <p className="text-muted-foreground">
              No hay más palabras por revisar ni aprender.
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm">Has aprendido {stats.learned} palabras</p>
              <p className="text-sm text-muted-foreground">Hoy: {stats.studiedToday}</p>
            </div>
          </div>
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
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold">Estudiar</h1>
          <span className={`text-xs px-2 py-0.5 rounded ${
            mode === 'review' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {mode === 'review' ? 'Repaso' : 'Palabras nuevas'}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div className="flex gap-2 justify-center text-sm text-muted-foreground">
        <span>⏳ {stats.pending} pendientes</span>
        <span>•</span>
        <span>✅ {stats.learned} aprendidas</span>
        <span>•</span>
        <span>📚 Hoy: {stats.studiedToday}</span>
      </div>

      <Flashcard word={currentWord} />

      <div className="flex flex-col gap-2 max-w-md mx-auto">
        <Button
          onClick={handleMarkAsLearned}
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