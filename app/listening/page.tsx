'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRandomWords } from '@/services/words';
import type { Word } from '@/types';

export default function ListeningPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const shuffleWords = useCallback((data: Word[]) => {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
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

  useEffect(() => {
    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      const japanese = available.filter(v => v.lang.startsWith('ja'));
      setVoices(japanese);
      if (japanese.length > 0 && !selectedVoice) {
        setSelectedVoice(japanese[0]);
      }
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const playAudio = (word: string) => {
    if (!selectedVoice) return;
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.voice = selectedVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    utterance.onend = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
  };

  const goNext = () => {
    setShowAnswer(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      shuffleWords(words);
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
        <p>No hay palabras disponibles.</p>
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
          {currentIndex + 1} / {words.length}
        </div>
        <Button variant="ghost" onClick={() => shuffleWords(words)}>
          🔀
        </Button>
      </div>

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-6">
          <div>
            <Badge>{currentWord.jlpt_level}</Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Toca el botón para escuchar y adivinar
            </p>
            <Button
              onClick={() => playAudio(currentWord.word)}
              size="lg"
              className="text-2xl py-8 px-12 border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 font-bold"
              disabled={isPlaying}
            >
              {isPlaying ? '🔊' : '🔊'} Reproducir
            </Button>
          </div>
          {voices.length > 1 && (
            <select
              className="text-sm border rounded px-2 py-1"
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice || null);
              }}
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!showAnswer ? (
            <div className="text-center">
              <Button 
                onClick={() => setShowAnswer(true)} 
                size="lg" 
                className="w-full border-2 border-gray-400 text-gray-600 bg-white hover:bg-gray-50 font-bold"
              >
                No sé, mostrar respuesta
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-4xl font-bold mb-2">{currentWord.word}</p>
                <p className="text-xl text-gray-600">{currentWord.kana}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500">
                <p className="text-2xl font-bold text-green-700">{currentWord.meaning_es}</p>
              </div>
              <Button
                onClick={goNext}
                size="lg"
                className="w-full border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50 font-bold"
              >
                {isLast ? '🔄 Reiniciar' : 'Siguiente →'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}