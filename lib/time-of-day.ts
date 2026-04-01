export interface TimeOfDay {
  greeting: string;
  label: string;
}

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning.', label: 'How are you starting the day?' };
  }
  if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon.', label: 'Where are you at?' };
  }
  if (hour >= 17 && hour < 22) {
    return { greeting: 'Winding down.', label: 'How are you feeling?' };
  }
  return { greeting: 'Still up.', label: 'How are you holding up?' };
}
