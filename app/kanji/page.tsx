'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Check, X, BookOpen, RotateCcw } from 'lucide-react';

interface Kanji {
  id: string;
  kanji: string;
  meaning_es: string | null;
  onyomi: string[];
  kunyomi: string[];
  jlpt_level: string | null;
  stroke_count: number | null;
  examples: string[];
}

type KnownFilter = 'all' | 'known' | 'unknown';
type LevelFilter = 'all' | 'N5' | 'N4';

const PAGE_SIZE = 30;

function getDeviceId() {
  let id = localStorage.getItem('jlpt_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('jlpt_device_id', id);
  }
  return id;
}

function getKnownKanjis(): Record<string, boolean> {
  const stored = localStorage.getItem('jlpt_known_kanjis');
  return stored ? JSON.parse(stored) : {};
}

function setKnownKanji(kanji: string, known: boolean) {
  const knownMap = getKnownKanjis();
  if (known) {
    knownMap[kanji] = true;
  } else {
    delete knownMap[kanji];
  }
  localStorage.setItem('jlpt_known_kanjis', JSON.stringify(knownMap));
  window.dispatchEvent(new Event('known_kanjis_changed'));
}

export default function KanjiPage() {
  const [kanjis, setKanjis] = useState<Kanji[]>([]);
  const [displayedKanjis, setDisplayedKanjis] = useState<Kanji[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [knownFilter, setKnownFilter] = useState<KnownFilter>('all');
  const [hasMore, setHasMore] = useState(true);
  const [selectedKanji, setSelectedKanji] = useState<Kanji | null>(null);
  const [knownMap, setKnownMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadKanjis() {
      try {
        const { data, error } = await supabase
          .from('kanjis')
          .select('*')
          .order('stroke_count');

        if (error) throw error;
        setKanjis(data || []);
        setDisplayedKanjis((data || []).slice(0, PAGE_SIZE));
        setHasMore((data || []).length > PAGE_SIZE);
      } catch (error) {
        console.error('Error loading kanjis:', error);
      } finally {
        setLoading(false);
      }
    }
    loadKanjis();
    setKnownMap(getKnownKanjis());

    const handleChange = () => setKnownMap(getKnownKanjis());
    window.addEventListener('known_kanjis_changed', handleChange);
    return () => window.removeEventListener('known_kanjis_changed', handleChange);
  }, []);

  useEffect(() => {
    const filtered = kanjis.filter(k => {
      if (levelFilter !== 'all' && k.jlpt_level !== levelFilter) return false;
      if (knownFilter === 'known' && !knownMap[k.kanji]) return false;
      if (knownFilter === 'unknown' && knownMap[k.kanji]) return false;
      return true;
    });
    setDisplayedKanjis(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }, [levelFilter, knownFilter, kanjis, knownMap]);

  const loadMore = () => {
    const filtered = kanjis.filter(k => {
      if (levelFilter !== 'all' && k.jlpt_level !== levelFilter) return false;
      if (knownFilter === 'known' && !knownMap[k.kanji]) return false;
      if (knownFilter === 'unknown' && knownMap[k.kanji]) return false;
      return true;
    });
    const currentLength = displayedKanjis.length;
    const nextBatch = filtered.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedKanjis(prev => [...prev, ...nextBatch]);
    setHasMore(currentLength + nextBatch.length < filtered.length);
  };

  const toggleKnown = (kanjiChar: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isKnown = !!knownMap[kanjiChar];
    setKnownKanji(kanjiChar, !isKnown);
    setKnownMap(prev => {
      const updated = { ...prev };
      if (!isKnown) {
        updated[kanjiChar] = true;
      } else {
        delete updated[kanjiChar];
      }
      return updated;
    });
  };

  const knownCount = Object.keys(knownMap).length;
  const totalKanjis = kanjis.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Volver
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Kanjis</h1>
          <div className="text-sm text-gray-500">
            {knownCount}/{totalKanjis} dominados
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={levelFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setLevelFilter('all')}
            >
              Todos ({kanjis.length})
            </Button>
            <Button
              size="sm"
              variant={levelFilter === 'N5' ? 'default' : 'outline'}
              onClick={() => setLevelFilter('N5')}
            >
              N5
            </Button>
            <Button
              size="sm"
              variant={levelFilter === 'N4' ? 'default' : 'outline'}
              onClick={() => setLevelFilter('N4')}
            >
              N4
            </Button>
          </div>

          <div className="w-px bg-gray-300 mx-1" />

          <div className="flex gap-1">
            <Button
              size="sm"
              variant={knownFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setKnownFilter('all')}
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Todos
            </Button>
            <Button
              size="sm"
              variant={knownFilter === 'known' ? 'default' : 'outline'}
              onClick={() => setKnownFilter('known')}
              className="text-green-600"
            >
              <Check className="w-4 h-4 mr-1" />
              Dominados
            </Button>
            <Button
              size="sm"
              variant={knownFilter === 'unknown' ? 'default' : 'outline'}
              onClick={() => setKnownFilter('unknown')}
              className="text-orange-600"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Pendientes
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {displayedKanjis.map((kanji) => (
          <div key={kanji.id} className="relative">
            <div
              onClick={() => setSelectedKanji(kanji)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedKanji(kanji)}
              className={`p-3 rounded-lg border transition-colors text-center w-full cursor-pointer ${
                knownMap[kanji.kanji]
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="text-2xl font-bold block">{kanji.kanji}</span>
              {kanji.jlpt_level && (
                <span className="text-xs text-gray-400">{kanji.jlpt_level}</span>
              )}
            </div>
            {knownFilter === 'known' && knownMap[kanji.kanji] && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setKnownKanji(kanji.kanji, false);
                  setKnownMap(prev => {
                    const updated = { ...prev };
                    delete updated[kanji.kanji];
                    return updated;
                  });
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                title="Quitar de dominados"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button 
            onClick={loadMore}
            variant="outline"
            className="border-2 border-gray-400 text-gray-600"
          >
            Cargar más ({displayedKanjis.length} / {kanjis.length})
          </Button>
        </div>
      )}

      {displayedKanjis.length === 0 && kanjis.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay kanjis en la base de datos.</p>
          <p className="text-sm mt-2">Ejecuta el SQL de kanjis en Supabase para agregar.</p>
        </div>
      )}

      {selectedKanji && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedKanji(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-4">
                <span className="text-6xl font-bold">{selectedKanji.kanji}</span>
                {selectedKanji.jlpt_level && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    {selectedKanji.jlpt_level}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setKnownKanji(selectedKanji.kanji, true);
                    setKnownMap(prev => ({ ...prev, [selectedKanji.kanji]: true }));
                  }}
                  variant={knownMap[selectedKanji.kanji] ? 'default' : 'outline'}
                  className={`flex-1 ${knownMap[selectedKanji.kanji] ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aprendido
                </Button>
                <Button
                  onClick={() => {
                    setKnownKanji(selectedKanji.kanji, false);
                    setKnownMap(prev => {
                      const updated = { ...prev };
                      delete updated[selectedKanji.kanji];
                      return updated;
                    });
                  }}
                  variant={!knownMap[selectedKanji.kanji] ? 'default' : 'outline'}
                  className={`flex-1 ${!knownMap[selectedKanji.kanji] ? 'bg-orange-500 hover:bg-orange-600' : 'text-orange-600 border-orange-600 hover:bg-orange-50'}`}
                >
                  <X className="w-4 h-4 mr-2" />
                  No aprendido
                </Button>
              </div>

              {selectedKanji.stroke_count && (
                <p className="text-gray-500">
                  {selectedKanji.stroke_count} trazos
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Onyomi</p>
                  <p className="font-bold">{selectedKanji.onyomi?.join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Kunyomi</p>
                  <p className="font-bold">{selectedKanji.kunyomi?.join(', ') || '—'}</p>
                </div>
              </div>

              {selectedKanji.meaning_es && (
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase">Significado</p>
                  <p className="text-lg">{selectedKanji.meaning_es}</p>
                </div>
              )}

              {selectedKanji.examples && selectedKanji.examples.length > 0 && (
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase">Ejemplos</p>
                  {selectedKanji.examples.map((ex, i) => (
                    <p key={i} className="text-sm">{ex}</p>
                  ))}
                </div>
              )}

              <Button 
                onClick={() => setSelectedKanji(null)}
                className="w-full mt-4"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}