export enum TimerMode {
  FOCUS = 'FOCUS',
  BREAK = 'BREAK',
  IDLE = 'IDLE'
}

export type FontOption = 'Press Start 2P' | 'Inter' | 'Roboto Mono' | 'Playfair Display' | 'Space Grotesk';

export interface AppSettings {
  focusDuration: number;
  breakDuration: number;
  totalSessions: number;
  focusBgColor: string;
  breakBgColor: string;
  fontFamily: FontOption;
}

export type RewardItem = 'cat' | 'plant' | 'lamp' | 'coffee';

export interface UserProgress {
  totalMinutesFocused: number;
  unlockedItems: RewardItem[];
}