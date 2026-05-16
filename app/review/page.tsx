'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flashcard } from '@/components/flashcard/flashcard';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { getReviewsForReview, createOrUpdateReview, getNewWords, getReviewStats } from '@/services/reviews';
import type { Review, Quality, Word } from '@/types';

interface Stats {
  pending: number;
  total: number;
  studiedToday: number;
  learned: number;
  nextReviewDate: string | null;
}

export default function ReviewPage() {
  const deviceId = useDeviceId();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newWords, setNewWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<'review' | 'new'>('review');
  const [stats, setStats] = useState<Stats>({ pending: 0, total: 0, studiedToday: 0, learned: 0, nextReviewDate: null });

  useEffect(() => {
    if (!deviceId) return;

async function loadData() {
        try {
          const [reviewsData, statsData] = await Promise.all([
            getReviewsForReview(deviceId!),
            getReviewStats(deviceId!)
          ]);
          setReviews(reviewsData);
          setStats(statsData);

          if (reviewsData.length === 0) {
            const newWordsData = await getNewWords(deviceId!);
            setNewWords(newWordsData);
            if (newWordsData.length > 0) {
              setMode('new');
            }
          }
        } catch (error) {
          console.error('Error loading reviews:', error);
        } finally {
          setLoading(false);
        }
      }
      loadData();
  }, [deviceId]);

  const currentItems = mode === 'review' ? reviews : newWords;
  const currentItem = currentItems[currentIndex];

  const handleResponse = async (quality: Quality) => {
    if (!deviceId || !currentItem) return;

    try {
      if (mode === 'review') {
        await createOrUpdateReview(deviceId!, (currentItem as Review).word_id, quality);
      } else {
        await createOrUpdateReview(deviceId!, (currentItem as Word).id, quality);
      }
      
      setShowAnswer(false);
      const newStats = await getReviewStats(deviceId!);
      setStats(newStats);

      if (currentIndex < currentItems.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        const reviewsData = await getReviewsForReview(deviceId!);
        setReviews(reviewsData);
        
        if (reviewsData.length > 0) {
          setMode('review');
          setCurrentIndex(0);
        } else {
          const newWordsData = await getNewWords(deviceId!);
          setNewWords(newWordsData);
          if (newWordsData.length > 0) {
            setMode('new');
            setCurrentIndex(0);
          }
        }
      }
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

  if (reviews.length === 0 && newWords.length === 0) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl" suppressHydrationWarning>🎉</p>
          <p>¡No hay más reviews pendientes!</p>
          <p className="text-muted-foreground">
            Ve a Estudiar para aprender nuevas palabras.
          </p>
          <Link href="/">
            <Button className="mt-4 border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 font-bold">
              ← Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const word = mode === 'review' ? (currentItem as Review).word! : (currentItem as Word);

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Volver
          </Button>
        </Link>
        <div className="text-sm">
          {mode === 'review' ? (
            <span className="text-orange-600 font-bold">Review ({reviews.length})</span>
          ) : (
            <span className="text-green-600 font-bold">Nuevas ({newWords.length})</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} / {currentItems.length}
        </div>
      </div>

      <div className="bg-gray-100 rounded-lg p-4 flex justify-around text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">{stats.studiedToday}</p>
          <p className="text-xs text-gray-500">Hoy</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{stats.learned}</p>
          <p className="text-xs text-gray-500">Aprendidas</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pendientes</p>
        </div>
      </div>

      {mode === 'review' && currentItem && (
        <div className="text-center text-sm text-muted-foreground">
          Reps: {(currentItem as Review).repetitions} | Intervalo: {(currentItem as Review).interval_days}d
        </div>
      )}

      <Flashcard word={word} />

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
  );
}