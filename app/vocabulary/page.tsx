'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { supabase } from '@/lib/supabase';
import type { Word } from '@/types';

const PAGE_SIZE = 50;

interface WordItemProps {
  word: Word;
}

const WordItem = memo(function WordItem({ word }: WordItemProps) {
  return (
    <div className="flex justify-between items-start p-3 border-b hover:bg-gray-50">
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
        {word.example_jp && (
          <p className="text-sm text-gray-400 mt-1">
            例: {word.example_jp}
          </p>
        )}
      </div>
      <div className="text-right text-sm">
        {(word.repetitions || 0) > 0 && (
          <span className="text-green-600 font-bold">
            {word.repetitions} rep{(word.repetitions || 0) > 1 ? 's' : ''}
          </span>
        )}
        {word.category && (
          <p className="text-xs text-gray-400">{word.category.name_es}</p>
        )}
      </div>
    </div>
  );
});

export default function VocabularyPage() {
  const deviceId = useDeviceId();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [displayedWords, setDisplayedWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'learned' | 'new'>('learned');
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!deviceId) return;

    async function loadWords() {
      try {
        const { data: allWordsData } = await supabase
          .from('words')
          .select('*, category:categories(name_es)')
          .order('word');

        const { data: reviews } = await supabase
          .from('reviews')
          .select('word_id, repetitions')
          .eq('device_id', deviceId);

        const reviewMap = new Map();
        reviews?.forEach(r => reviewMap.set(r.word_id, r.repetitions));

        const wordsWithStatus = allWordsData?.map(w => ({
          ...w,
          repetitions: reviewMap.get(w.id) || 0,
        })) || [];

        setAllWords(wordsWithStatus);
        setDisplayedWords(wordsWithStatus.slice(0, PAGE_SIZE));
        setHasMore(wordsWithStatus.length > PAGE_SIZE);
      } catch (error) {
        console.error('Error loading words:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWords();
  }, [deviceId]);

  const filteredWords = useMemo(() => {
    return allWords.filter(w => {
      const reps = w.repetitions || 0;
      if (filter === 'learned') return reps > 0;
      if (filter === 'new') return reps === 0;
      return true;
    });
  }, [filter, allWords]);

  useEffect(() => {
    setDisplayedWords(filteredWords.slice(0, PAGE_SIZE));
    setHasMore(filteredWords.length > PAGE_SIZE);
  }, [filteredWords]);

const loadMore = () => {
    const currentLength = displayedWords.length;
    const nextBatch = filteredWords.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedWords(prev => [...prev, ...nextBatch]);
    setHasMore(currentLength + nextBatch.length < filteredWords.length);
  };

  const learnedCount = allWords.filter(w => (w.repetitions || 0) > 0).length;
  const newCount = allWords.filter(w => (w.repetitions || 0) === 0).length;

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
            <Button variant="ghost" size="sm">
              ← Volver
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Mi Vocabulario</h1>
        </div>
        <div className="flex gap-1 flex-wrap justify-center sm:justify-end">
          <Button
            size="sm"
            variant={filter === 'learned' ? 'default' : 'outline'}
            onClick={() => setFilter('learned')}
            className="text-xs px-2"
          >
            Aprendidas ({learnedCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'new' ? 'default' : 'outline'}
            onClick={() => setFilter('new')}
            className="text-xs px-2"
          >
            Nuevas ({newCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="text-xs px-2"
          >
            Todas ({allWords.length})
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {displayedWords.map((word) => (
          <WordItem key={word.id} word={word} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button 
            onClick={loadMore}
            variant="outline"
            className="border-2 border-gray-400 text-gray-600"
          >
            Cargar más ({displayedWords.length} / {allWords.length})
          </Button>
        </div>
      )}

      {displayedWords.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay palabras para mostrar</p>
        </div>
      )}
    </div>
  );
}