'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDeviceId } from '@/hooks/useDeviceId';
import { getReviewStats, getAllStats } from '@/services/reviews';
import { supabase } from '@/lib/supabase';

interface Stats {
  total: number;
  learned: number;
  pending: number;
  studiedToday: number;
  mastered: number;
  learning: number;
  new: number;
  byLevel: { N5: number; N4: number; N3: number; N2: number; N1: number };
  byCategory: { [key: string]: number };
}

export default function StatsPage() {
  const deviceId = useDeviceId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    async function loadStats() {
      try {
        const data = await getAllStats(deviceId!);
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [deviceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error cargando estadísticas</p>
      </div>
    );
  }

  const learnedPercent = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
  const masteredPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <div className="w-16" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-500">Total palabras</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-green-600">{stats.learned}</p>
            <p className="text-sm text-gray-500">Aprendidas</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <p className="text-4xl font-bold text-purple-600">{stats.studiedToday}</p>
            <p className="text-sm text-gray-500">Hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Aprendidas</span>
              <span>{learnedPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full" 
                style={{ width: `${learnedPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Dominadas (5+ repeticiones)</span>
              <span>{masteredPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-purple-500 h-4 rounded-full" 
                style={{ width: `${masteredPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por nivel JLPT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-center">
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <div key={level} className="p-2 bg-gray-100 rounded">
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-gray-500">{level}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex justify-between p-2 bg-gray-100 rounded">
                <span className="text-sm capitalize">{cat}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desglose</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-purple-600">{stats.mastered}</p>
            <p className="text-sm text-gray-500">Dominadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.learning}</p>
            <p className="text-sm text-gray-500">Aprendiendo</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-400">{stats.new}</p>
            <p className="text-sm text-gray-500">Sin estudiar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}