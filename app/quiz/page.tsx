'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { supabase } from '@/lib/supabase';
import type { Word } from '@/types';

type QuestionType = 'word-meaning' | 'kana-meaning' | 'meaning-kana' | 'romaji-reading';

interface Question {
  word: Word;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
}

const QUIZ_SIZE = 10;

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateQuestion(word: Word, allWords: Word[]): Question {
  const types: QuestionType[] = ['word-meaning', 'kana-meaning', 'meaning-kana'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const wrongOptions = shuffle(allWords.filter(w => w.id !== word.id)).slice(0, 3);
  let options: string[] = [];
  let question = '';
  let correctAnswer = '';

  switch (type) {
    case 'word-meaning':
      question = `¿Qué significa "${word.word}"?`;
      correctAnswer = word.meaning_es;
      options = [word.meaning_es, ...wrongOptions.map(w => w.meaning_es)].slice(0, 4);
      break;
    case 'kana-meaning':
      question = `¿Qué significa "${word.kana}"?`;
      correctAnswer = word.meaning_es;
      options = [word.meaning_es, ...wrongOptions.map(w => w.meaning_es)].slice(0, 4);
      break;
    case 'meaning-kana':
      question = `¿Cómo se escribe "${word.meaning_es}" en japonés?`;
      correctAnswer = word.kana;
      options = [word.kana, ...wrongOptions.map(w => w.kana)].slice(0, 4);
      break;
  }

  options = shuffle(options);
  const correctIndex = options.findIndex(o => o === correctAnswer);

  return { word, type, question, options, correctIndex };
}

export default function QuizPage() {
  const deviceId = useDeviceId();
  const [words, setWords] = useState<Word[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function loadWords() {
      try {
        const { data, error } = await supabase
          .from('words')
          .select('*, category:categories(*)')
          .limit(100);

        if (error) throw error;
        if (data && data.length >= 4) {
          setWords(data);
          const shuffledWords = shuffle(data).slice(0, QUIZ_SIZE);
          setQuestions(shuffledWords.map(w => generateQuestion(w, data)));
        }
      } catch (error) {
        console.error('Error loading words:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWords();
  }, []);

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === questions[currentIndex].correctIndex;
    
    if (isCorrect) {
      setCorrectCount(c => c + 1);
    } else {
      setWrongQuestions(prev => [...prev, questions[currentIndex]]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
    } else if (wrongQuestions.length > 0) {
      setQuestions(shuffle(wrongQuestions));
      setWrongQuestions([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    if (words.length >= 4) {
      const shuffledWords = shuffle(words).slice(0, QUIZ_SIZE);
      setQuestions(shuffledWords.map(w => generateQuestion(w, words)));
      setWrongQuestions([]);
      setCurrentIndex(0);
      setCorrectCount(0);
      setSelectedAnswer(null);
      setFinished(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (words.length < 4) {
    return (
      <div className="min-h-screen p-4">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">← Volver</Button>
          </Link>
          <h1 className="text-xl font-bold">Quiz</h1>
          <div />
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Se necesitan al menos 4 palabras para hacer el quiz.</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const percentage = Math.round((correctCount / (correctCount + wrongQuestions.length || 1)) * 100);
    return (
      <div className="min-h-screen p-4">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">← Volver</Button>
          </Link>
          <h1 className="text-xl font-bold">Quiz</h1>
          <div />
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-4xl">{percentage >= 70 ? '🎉' : percentage >= 40 ? '👍' : '💪'}</p>
            <p className="text-2xl font-bold">{percentage}%</p>
            <p>{correctCount} correctas, {wrongQuestions.length} incorrectas</p>
            <Button onClick={handleRestart} className="mt-4">
              Jugar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = currentIndex + 1;

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">← Volver</Button>
        </Link>
        <h1 className="text-xl font-bold">Quiz</h1>
        <div className="text-sm text-muted-foreground">
          {progress} / {questions.length}
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{currentQuestion.question}</p>
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        {currentQuestion.options.map((option, index) => {
          let buttonClass = 'w-full p-4 text-lg border-2 bg-white hover:bg-gray-50';
          
          if (selectedAnswer !== null) {
            if (index === currentQuestion.correctIndex) {
              buttonClass = 'w-full p-4 text-lg border-2 bg-green-100 border-green-500 text-green-700';
            } else if (index === selectedAnswer) {
              buttonClass = 'w-full p-4 text-lg border-2 bg-red-100 border-red-500 text-red-700';
            } else {
              buttonClass = 'w-full p-4 text-lg border-2 bg-gray-100 text-gray-400';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={selectedAnswer !== null}
              className={buttonClass}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selectedAnswer !== null && (
        <div className="text-center">
          <Button onClick={handleNext} className="w-full max-w-md">
            {currentIndex < questions.length - 1 || wrongQuestions.length > 0
              ? 'Siguiente →'
              : 'Ver resultados'}
          </Button>
        </div>
      )}
    </div>
  );
}