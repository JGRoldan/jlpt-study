'use client';

import { useState, useEffect } from 'react';

export interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export function useSpeechVoices() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      const japaneseVoices = availableVoices
        .filter(v => v.lang.startsWith('ja'))
        .map(v => ({
          name: v.name,
          lang: v.lang,
          voice: v,
        }));
      
      setVoices(japaneseVoices);
      
      // Auto-select first Japanese voice
      if (japaneseVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(japaneseVoices[0].voice);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = (text: string) => {
    if (!selectedVoice) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = 'ja-JP';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  return { voices, selectedVoice, setSelectedVoice, speak };
}