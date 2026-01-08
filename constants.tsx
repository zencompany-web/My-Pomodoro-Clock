
import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 25,
  breakDuration: 5,
  totalSessions: 4,
  focusBgColor: '#1e293b', // Slate 800
  breakBgColor: '#064e3b', // Emerald 900
  fontFamily: 'Inter'
};

export const FONT_OPTIONS: { name: string; value: string }[] = [
  { name: 'Pixel', value: "'Press Start 2P', cursive" },
  { name: 'Modern', value: "'Inter', sans-serif" },
  { name: 'Mono', value: "'Roboto Mono', monospace" },
  { name: 'Elegant', value: "'Playfair Display', serif" },
  { name: 'Grotesk', value: "'Space Grotesk', sans-serif" }
];

// High quality soft notification sound
export const BELL_SOUND_B64 = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";
