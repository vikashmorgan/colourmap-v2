export interface DoorSlider {
  id: string;
  left: string;
  right: string;
}

export interface Door {
  id: string;
  name: string;
  color: string;
  sliders: DoorSlider[];
}

export const DOORS: Door[] = [
  {
    id: 'feeling',
    name: 'Feeling',
    color: '#D4605A',
    sliders: [
      { id: 'energy', left: 'Tired', right: 'Energized' },
      { id: 'relaxation', left: 'Tense', right: 'Relaxed' },
      { id: 'emotions', left: 'Heavy', right: 'Light' },
      { id: 'presence', left: 'Distracted', right: 'Present' },
    ],
  },
  {
    id: 'doing',
    name: 'Doing',
    color: '#E0844A',
    sliders: [
      { id: 'focus', left: 'Scattered', right: 'Focused' },
      { id: 'motivation', left: 'No drive', right: 'Motivated' },
      { id: 'creative', left: 'Blocked', right: 'Inspired' },
      { id: 'discipline', left: 'Undisciplined', right: 'Disciplined' },
    ],
  },
  {
    id: 'sharing',
    name: 'Sharing',
    color: '#3A8AC4',
    sliders: [
      { id: 'connected', left: 'Isolated', right: 'Connected' },
      { id: 'honest', left: 'Guarded', right: 'Open' },
      { id: 'giving', left: 'Withholding', right: 'Generous' },
      { id: 'belonging', left: 'Outsider', right: 'Belonging' },
    ],
  },
];

export const UNIVERSAL_QUESTIONS = [
  'What is weighing you down right now?',
  'What are you most afraid of?',
  'How can you act on it?',
  "What don't you want in your life anymore?",
  'What is flowing? What feels good right now?',
];

export const DOOR_QUESTIONS: Record<string, string[]> = {
  feeling: [
    "What does your body need that it's not getting?",
    'When did you last feel truly relaxed? What was different?',
  ],
  doing: [
    'What are you avoiding? Why?',
    'What would change if you had perfect discipline for one week?',
  ],
  sharing: [
    "Who do you miss? What's stopping you from reaching out?",
    'Where do you feel most yourself with others?',
  ],
};

export interface SectionSuggestion {
  name: string;
  trackers: { label: string; type: 'check' | 'scale' | 'counter' }[];
}

export function getSuggestions(doorScores: Record<string, number>): SectionSuggestion[] {
  const suggestions: SectionSuggestion[] = [];

  if ((doorScores.feeling ?? 8) < 5) {
    suggestions.push({
      name: 'Body & Rest',
      trackers: [
        { label: 'Moved today', type: 'check' },
        { label: 'Ate clean', type: 'check' },
        { label: 'Slept 7h+', type: 'check' },
        { label: 'Breathwork or meditation', type: 'check' },
        { label: 'Energy level', type: 'scale' },
      ],
    });
  }

  if ((doorScores.doing ?? 8) < 5) {
    suggestions.push({
      name: 'Discipline',
      trackers: [
        { label: 'Woke up on time', type: 'check' },
        { label: 'Deep work block', type: 'check' },
        { label: 'Screens off by 10pm', type: 'check' },
        { label: 'Productivity', type: 'scale' },
      ],
    });
  }

  if ((doorScores.sharing ?? 8) < 5) {
    suggestions.push({
      name: 'Connection',
      trackers: [
        { label: 'Reached out to someone', type: 'check' },
        { label: 'Quality time', type: 'check' },
        { label: 'Said something honest', type: 'check' },
      ],
    });
  }

  return suggestions;
}
