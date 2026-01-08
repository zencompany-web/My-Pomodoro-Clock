
import React, { useState, useEffect, useRef } from 'react';
import { TimerMode, RewardItem } from '../types';

interface PixelCharacterProps {
  mode: TimerMode;
  unlockedItems?: RewardItem[];
}

export const PixelCharacter: React.FC<PixelCharacterProps> = ({ mode, unlockedItems = [] }) => {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const prevModeRef = useRef<TimerMode>(mode);
  
  const isFocus = mode === TimerMode.FOCUS;
  const hasCat = unlockedItems.includes('cat');
  const hasPlant = unlockedItems.includes('plant');
  const hasLamp = unlockedItems.includes('lamp');

  useEffect(() => {
    // Detect transition from FOCUS to BREAK
    if (prevModeRef.current === TimerMode.FOCUS && mode === TimerMode.BREAK) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 4000);
      return () => clearTimeout(timer);
    }
    prevModeRef.current = mode;
  }, [mode]);

  return (
    <div className={`w-full h-full flex items-center justify-center relative transition-all duration-700 ${isCelebrating ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'scale-100'}`}>
      <svg 
        viewBox="0 0 32 32" 
        className={`w-full h-full pixel-rendering ${isCelebrating ? 'animate-bounce' : ''}`} 
        xmlns="http://www.w3.org/2000/svg" 
        shapeRendering="crispEdges"
      >
        {/* HAIR: Dark brown, middle-part style */}
        <rect x="10" y="3" width="12" height="5" fill="#2B1B17" />
        <rect x="10" y="4" width="5" height="1" fill="#4B3B2B" opacity="0.4" />
        <rect x="17" y="4" width="5" height="1" fill="#4B3B2B" opacity="0.4" />
        <rect x="9" y="5" width="2" height="7" fill="#2B1B17" />
        <rect x="21" y="5" width="2" height="7" fill="#2B1B17" />
        <rect x="15" y="4" width="2" height="6" fill="#1A1110" />
        
        {/* FACE */}
        <rect x="11" y="8" width="10" height="9" fill="#FCE4D6" />
        <rect x="11" y="16" width="10" height="1" fill="#E8B99A" />
        
        {/* EYES */}
        <rect x="13" y="12" width="1" height="1" fill="#333" />
        <rect x="18" y="12" width="1" height="1" fill="#333" />
        
        {/* CELEBRATION EFFECTS */}
        {isCelebrating && (
          <g>
            {/* Pixel Sparkles */}
            <rect x="4" y="6" width="1" height="1" fill="#FFD700" className="animate-pulse" />
            <rect x="27" y="5" width="1" height="1" fill="#FFD700" className="animate-pulse" />
            <rect x="2" y="18" width="1" height="1" fill="#FFD700" className="animate-pulse" />
            <rect x="29" y="15" width="1" height="1" fill="#FFD700" className="animate-pulse" />
            
            {/* Small Floating Hearts/Stars */}
            <path d="M15 1 L17 1 L17 2 L15 2 Z" fill="#FF69B4" opacity="0.8">
              <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -5" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M8 10 L10 10 L10 11 L8 11 Z" fill="#FF69B4" opacity="0.8">
              <animateTransform attributeName="transform" type="translate" from="0 0" to="0 -8" dur="1.2s" repeatCount="indefinite" />
            </path>
          </g>
        )}

        {/* BODY */}
        <rect x="8" y="17" width="16" height="10" fill="#2C3E50" />
        <rect x="13" y="17" width="6" height="6" fill="#FFFFFF" />
        <rect x="15" y="18" width="2" height="4" fill="#C0392B" />

        {isFocus ? (
          <g>
            {/* Desk/Hands for Focus mode */}
            <rect x="6" y="22" width="6" height="3" fill="#2C3E50" />
            <rect x="20" y="22" width="6" height="3" fill="#2C3E50" />
            <rect x="10" y="24" width="2" height="1" fill="#FCE4D6" />
            <rect x="20" y="24" width="2" height="1" fill="#FCE4D6" />
            <rect x="4" y="25" width="24" height="4" fill="#8D6E63" />
            <rect x="9" y="23" width="14" height="3" fill="#F5F5F5" />
          </g>
        ) : (
          <g>
            {/* Coffee/Relaxing posture for Break mode */}
            <rect x="24" y="20" width="3" height="3" fill="#2C3E50" />
            <rect x="25" y="15" width="2" height="6" fill="#2C3E50" />
            <rect x="23" y="13" width="5" height="4" fill="#FFFFFF" />
            <rect x="24" y="14" width="3" height="1" fill="#6F4E37" />
            <rect x="27" y="14" width="2" height="2" fill="#FFFFFF" opacity="0.5" />
          </g>
        )}

        {/* PIXEL CAT (Unlocked at 60 mins) */}
        {hasCat && (
          <g transform="translate(-4, 2)" className={isCelebrating ? 'animate-bounce' : ''}>
             <rect x="4" y="20" width="6" height="5" fill="#FFA726" /> {/* Body */}
             <rect x="3" y="18" width="4" height="4" fill="#FFA726" /> {/* Head */}
             <rect x="3" y="17" width="1" height="1" fill="#E65100" /> {/* Ear L */}
             <rect x="6" y="17" width="1" height="1" fill="#E65100" /> {/* Ear R */}
             <rect x="4" y="19" width="1" height="1" fill="#000" /> {/* Eye */}
             <rect x="6" y="19" width="1" height="1" fill="#000" /> {/* Eye */}
             <rect x="10" y="20" width="1" height="4" fill="#FB8C00" /> {/* Tail */}
          </g>
        )}

        {/* PIXEL PLANT (Unlocked at 120 mins) */}
        {hasPlant && (
          <g transform="translate(18, 0)">
            <rect x="2" y="22" width="4" height="3" fill="#8D6E63" /> {/* Pot */}
            <rect x="3" y="19" width="2" height="3" fill="#4CAF50" /> {/* Stem */}
            <rect x="2" y="18" width="4" height="2" fill="#81C784" /> {/* Leaves */}
          </g>
        )}

        {/* PIXEL LAMP (Unlocked at 180 mins) */}
        {hasLamp && (
          <g transform="translate(22, -8)">
            <rect x="2" y="20" width="1" height="6" fill="#333" /> {/* Stand */}
            <rect x="1" y="26" width="3" height="1" fill="#333" /> {/* Base */}
            <rect x="0" y="17" width="5" height="3" fill="#FFEB3B" /> {/* Shade */}
            <rect x="1" y="18" width="3" height="1" fill="#FFF176" /> {/* Light */}
          </g>
        )}
      </svg>
    </div>
  );
};
