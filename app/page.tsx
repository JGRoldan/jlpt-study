'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceId } from '@/hooks/useDeviceId';
import { getReviewStats } from '@/services/reviews';
import { useEffect, useState } from 'react';

export default function Home() {
  const deviceId = useDeviceId();
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    getReviewStats(deviceId!).then(setStats).finally(() => setLoading(false));
  }, [deviceId]);

  return (
    <div className="min-h-screen p-4 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">JLPT Flashcards</h1>
        <p className="text-muted-foreground">Aprende japonés con repetición espaciada</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 max-w-md mx-auto">
        <Link href="/review" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>📚</CardTitle>
              <p className="font-semibold">Review</p>
            </CardHeader>
            <CardContent className="text-center">
              {loading ? (
                <p className="text-muted-foreground">...</p>
              ) : stats.pending > 0 ? (
                <p className="text-2xl font-bold">{stats.pending}</p>
              ) : (
                <p className="text-muted-foreground">Sin pendientes</p>
              )}
              <p className="text-sm text-muted-foreground">tarjetas</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/study" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>📖</CardTitle>
              <p className="font-semibold">Estudiar</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Flashcards</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/listening" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>👂</CardTitle>
              <p className="font-semibold">Listening</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Adivina por audio</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/quiz" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>❓</CardTitle>
              <p className="font-semibold">Quiz</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Elige la respuesta</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vocabulary" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>📝</CardTitle>
              <p className="font-semibold">Vocabulario</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Ver mis palabras</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kanji" className="block">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>漢字</CardTitle>
              <p className="font-semibold">Kanjis</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Ver kanjis</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stats" className="block md:col-span-2">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl" suppressHydrationWarning>📊</CardTitle>
              <p className="font-semibold">Estadísticas</p>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">Ver progreso</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <footer className="text-center text-sm text-muted-foreground">
        <p>Total de tarjetas: {stats.total}</p>
      </footer>
    </div>
  );
}