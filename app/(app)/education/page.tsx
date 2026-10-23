'use client';

import { useRouter } from 'next/navigation';

import EducationModeSwitch from '@/components/EducationModeSwitch';
import LearningHub from '@/components/LearningHub';

export default function EducationPage() {
  const router = useRouter();

  return (
    <>
      <LearningHub onClose={() => router.push('/day')} />
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
        }}
      >
        <EducationModeSwitch
          active="self"
          onSwitchToWorld={() => router.push('/education/world')}
        />
      </div>
    </>
  );
}
