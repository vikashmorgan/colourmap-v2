'use client';

import { useEffect, useState } from 'react';

import ChapterCard from '@/components/ChapterCard';
import CompassWheel from '@/components/CompassWheel';

interface CheckIn {
  id: string;
  sliderValue: number;
  note: string | null;
  tags: string[] | null;
  createdAt: string;
}

interface Mission {
  id: string;
  title: string;
  completed: boolean;
  blocking: string | null;
}

export default function OverviewPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/life-scan-answers').then((r) => (r.ok ? r.json() : { answers: {} })),
      fetch('/api/check-ins').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/missions').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([scanData, ciData, mData]) => {
        setAnswers(scanData.answers || {});
        setCheckIns(Array.isArray(ciData) ? ciData.slice(0, 10) : []);
        setMissions(Array.isArray(mData) ? mData : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const fears = (answers.block_fears_list || '').split('|||').filter(Boolean);
  const weaknesses = (answers.block_weak_list || '').split('|||').filter(Boolean);
  const strengths = (answers.flow_strengths_list || '').split('|||').filter(Boolean);
  const working = (answers.flow_working_list || '').split('|||').filter(Boolean);
  const energy = (answers.flow_energy_list || '').split('|||').filter(Boolean);
  const visionText = (answers.vision_where || '').trim();
  const firstMove = (answers.vision_first || '').trim();

  const todayCheckIns = checkIns.filter((ci) => {
    const d = new Date(ci.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const latestCheckIn = checkIns[0];

  if (!loaded) {
    return (
      <main className="mx-auto max-w-lg py-10">
        <div className="h-8 w-32 mx-auto rounded bg-muted animate-pulse" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <ChapterCard initial={answers.chapter_title} />

      {/* Compass Wheel — pulls all data */}
      <CompassWheel
        data={{
          latestCheckIn,
          todayCheckIns: todayCheckIns.map((ci) => ({
            sliderValue: ci.sliderValue,
            createdAt: ci.createdAt,
          })),
          fears,
          weaknesses,
          strengths,
          working,
          energy,
          visionText,
          firstMove,
          visionWho: (answers.vision_who || '').trim() || undefined,
          missions: missions.map((m) => ({
            id: m.id,
            title: m.title,
            blocking: m.blocking,
            completed: m.completed,
          })),
        }}
      />
    </main>
  );
}
