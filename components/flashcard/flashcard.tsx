'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Word } from '@/types';

interface FlashcardProps {
  word: Word;
  onFlip?: () => void;
}

export function Flashcard({ word }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setIsFlipped(false);
  }, [word.id]);

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

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVoice) return;
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.voice = selectedVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="w-full max-w-md mx-auto cursor-pointer perspective-1000"
      onClick={toggleFlip}
    >
      <div className={`relative transition-transform duration-300 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front - Word */}
        <Card className={`backface-hidden ${isFlipped ? 'hidden' : ''}`}>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center items-center gap-2">
              <Badge variant="secondary">{word.jlpt_level}</Badge>
              {word.category && (
                <Badge variant="outline">{word.category.name_es}</Badge>
              )}
            </div>
            <div>
              <p className="text-5xl font-bold mb-4">{word.word}</p>
              <p className="text-2xl text-muted-foreground">{word.kana}</p>
              {word.romaji && (
                <p className="text-lg text-muted-foreground mt-2">{word.romaji}</p>
              )}
            </div>
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
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
              <Button onClick={playAudio} variant="outline" size="lg">
                🔊 Escuchar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-gray-400">Toca para ver la respuesta</p>
          </CardContent>
        </Card>

        {/* Back - Answer */}
        <Card className={`backface-hidden rotate-y-180 ${isFlipped ? '' : 'hidden'}`}>
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center items-center gap-2">
              <Badge variant="secondary">{word.jlpt_level}</Badge>
              {word.category && (
                <Badge variant="outline">{word.category.name_es}</Badge>
              )}
            </div>
            <div className="p-6 bg-muted rounded-lg">
              <p className="text-3xl font-bold">{word.meaning_es}</p>
              {word.meaning_en && (
                <p className="text-xl text-muted-foreground mt-2">{word.meaning_en}</p>
              )}
            </div>
            {word.example_jp && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-xl">{word.example_jp}</p>
                {word.example_kana && (
                  <p className="text-lg text-muted-foreground">{word.example_kana}</p>
                )}
                {word.example_es && (
                  <p className="text-base">{word.example_es}</p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-gray-400">Toca para volver</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}