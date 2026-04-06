'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';

interface CheckInState {
  sliderValue: number;
  setSliderValue: (v: number) => void;
  barActive: boolean;
  setBarActive: (v: boolean) => void;
  insightText: string | null;
  setInsightText: (v: string | null) => void;
  isLoadingInsight: boolean;
  setIsLoadingInsight: (v: boolean) => void;
}

const CheckInContext = createContext<CheckInState | null>(null);

export function CheckInProvider({ children }: { children: ReactNode }) {
  const [sliderValue, setSliderValue] = useState(50);
  const [barActive, setBarActive] = useState(false);
  const [insightText, setInsightText] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  return (
    <CheckInContext.Provider
      value={{
        sliderValue,
        setSliderValue,
        barActive,
        setBarActive,
        insightText,
        setInsightText,
        isLoadingInsight,
        setIsLoadingInsight,
      }}
    >
      {children}
    </CheckInContext.Provider>
  );
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckIn must be used within CheckInProvider');
  return ctx;
}
