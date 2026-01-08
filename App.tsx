import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimerMode, AppSettings, UserProgress, RewardItem } from './types.ts';
import { DEFAULT_SETTINGS, FONT_OPTIONS, BELL_SOUND_B64 } from './constants.tsx';
import { PixelCharacter } from './components/PixelCharacter.tsx';
import { ConfigPanel } from './components/ConfigPanel.tsx';

const STORAGE_KEY_PROGRESS = 'pixel_pomo_progress_v2';
const STORAGE_KEY_SETTINGS = 'pixel_pomo_settings_v2';

const REWARD_CONFIG: { id: RewardItem; name: string; cost: number; icon: string }[] = [
  { id: 'cat', name: 'Pixel Cat', cost: 60, icon: '🐱' },
  { id: 'plant', name: 'Succulent', cost: 120, icon: '🌿' },
  { id: 'lamp', name: 'Desk Lamp', cost: 180, icon: '💡' },
  { id: 'coffee', name: 'Infinite Coffee', cost: 240, icon: '☕' },
];

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { totalMinutesFocused: 0, unlockedItems: [] };
  });

  const [mode, setMode] = useState<TimerMode>(TimerMode.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showShop, setShowShop] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  }, [progress]);

  // Robust Wake Lock Logic
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        // Silently fail if policy disallows it
        console.warn("Screen Wake Lock could not be acquired:", err.message);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const bell = new Audio(BELL_SOUND_B64);
    bell.volume = 0.5;
    bellRef.current = bell;
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFs);
    };
  }, []);

  const playBell = useCallback(() => {
    if (bellRef.current) {
      bellRef.current.currentTime = 0;
      bellRef.current.play().catch(() => {});
    }
  }, []);

  const startTimer = useCallback(() => {
    setMode(TimerMode.FOCUS);
    setTimeLeft(settings.focusDuration * 60);
    setSessionCount(1);
    setShowControls(true);
    requestWakeLock();
  }, [settings.focusDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setMode(TimerMode.IDLE);
    setTimeLeft(0);
    setSessionCount(0);
    setShowControls(true);
    releaseWakeLock();
  }, []);

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (mode !== TimerMode.IDLE) setShowControls(false);
    }, 3000); 
  }, [mode]);

  useEffect(() => {
    if (mode !== TimerMode.IDLE && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (mode === TimerMode.FOCUS && (prev > 0 && prev % 60 === 0)) {
            setProgress(p => ({ ...p, totalMinutesFocused: p.totalMinutesFocused + 1 }));
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && mode !== TimerMode.IDLE) {
      playBell();
      if (mode === TimerMode.FOCUS) {
        setProgress(p => ({ ...p, totalMinutesFocused: p.totalMinutesFocused + 1 }));
        setMode(TimerMode.BREAK);
        setTimeLeft(settings.breakDuration * 60);
      } else {
        if (sessionCount < settings.totalSessions) {
          setMode(TimerMode.FOCUS);
          setTimeLeft(settings.focusDuration * 60);
          setSessionCount(prev => prev + 1);
        } else {
          stopTimer();
        }
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode, timeLeft, sessionCount, settings, playBell, stopTimer]);

  const timeString = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const currentFontFamily = useMemo(() => 
    FONT_OPTIONS.find(f => f.name === settings.fontFamily)?.value || 'sans-serif'
  , [settings.fontFamily]);

  const isPC = windowWidth >= 1024;
  const isImmersive = isFullscreen && mode !== TimerMode.IDLE;
  const themeColor = mode === TimerMode.FOCUS ? settings.focusBgColor : (mode === TimerMode.BREAK ? settings.breakBgColor : '#0f0f0f');
  const appBg = (!isPC || isImmersive) ? themeColor : '#0f0f0f';

  const progressPercent = useMemo(() => {
    const total = (mode === TimerMode.FOCUS ? settings.focusDuration : settings.breakDuration) * 60;
    return mode === TimerMode.IDLE ? 0 : ((total - timeLeft) / total) * 100;
  }, [mode, timeLeft, settings]);

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] w-full flex flex-col transition-colors duration-1000 overflow-hidden text-white select-none"
      style={{ backgroundColor: appBg }}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {mode === TimerMode.IDLE ? (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-safe">
           <div className="w-full p-4 flex items-center justify-between sticky top-0 z-50 bg-[#0f0f0f]/90 backdrop-blur-md">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                 <span className="text-yellow-400">✨</span>
                 <span className="text-[clamp(0.7rem,2.5vw,0.875rem)] font-bold tracking-tight">{progress.totalMinutesFocused}m Zen Points</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowShop(!showShop); }}
                className="px-5 py-2 rounded-full bg-white text-black font-black text-[clamp(0.6rem,2vw,0.75rem)] uppercase tracking-widest active:scale-95 transition-transform"
              >
                {showShop ? 'Back' : 'Shop'}
              </button>
           </div>

           <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 md:gap-12 max-w-6xl mx-auto w-full">
              <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-1000">
                <div className="w-32 h-32 md:w-56 md:h-56 relative">
                   <div className="absolute inset-0 bg-white/5 rounded-full blur-[40px] animate-pulse"></div>
                   <PixelCharacter mode={TimerMode.IDLE} unlockedItems={progress.unlockedItems} />
                </div>
                <div className="text-center">
                  <h1 className="text-xl md:text-3xl font-black tracking-tighter" style={{ fontFamily: currentFontFamily }}>Pomodoro Clock</h1>
                  <p className="text-[8px] uppercase tracking-[0.4em] opacity-30 mt-1">Focus Sanctuary</p>
                </div>
              </div>

              <div className="w-full max-w-sm z-10">
                {showShop ? (
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-6">Marketplace</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {REWARD_CONFIG.map(item => {
                        const isUnlocked = progress.unlockedItems.includes(item.id);
                        const canAfford = progress.totalMinutesFocused >= item.cost;
                        return (
                          <button 
                            key={item.id}
                            disabled={isUnlocked || !canAfford}
                            onClick={() => {
                              setProgress(p => ({
                                totalMinutesFocused: p.totalMinutesFocused - item.cost,
                                unlockedItems: [...p.unlockedItems, item.id]
                              }));
                            }}
                            className={`p-4 rounded-2xl border flex flex-col items-center transition-all ${isUnlocked ? 'border-green-500/30 bg-green-500/5 cursor-default' : (canAfford ? 'border-white/20 bg-black/20 hover:scale-[1.02] active:scale-95' : 'border-white/5 bg-black/20 opacity-30 grayscale')}`}
                          >
                            <div className="text-2xl mb-1">{item.icon}</div>
                            <div className="text-[9px] font-black uppercase tracking-tight">{item.name}</div>
                            <div className={`text-[9px] font-bold ${isUnlocked ? 'text-green-500' : 'opacity-60'}`}>{isUnlocked ? 'OWNED' : `${item.cost}m`}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <ConfigPanel settings={settings} onUpdate={setSettings} onStart={startTimer} />
                )}
              </div>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row w-full overflow-y-auto no-scrollbar">
          <div className={`flex flex-col transition-all duration-700 ${isImmersive ? 'w-full h-[100dvh]' : (isPC ? 'lg:w-[70%]' : 'w-full')}`}>
            
            <div 
              className={`relative flex items-center justify-center transition-all duration-700 overflow-hidden z-40 ${isImmersive ? 'h-full' : (isPC ? 'sticky top-0 lg:static w-full aspect-video shadow-2xl lg:rounded-2xl lg:mt-6 lg:mb-4' : 'w-full aspect-video')}`}
              style={{ backgroundColor: themeColor }}
            >
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className={`flex items-center space-x-6 sm:space-x-12 transition-transform duration-700 ${isImmersive ? 'scale-110 sm:scale-125' : 'scale-95'}`}>
                  <div className="w-20 h-20 sm:w-28 md:w-40 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">
                    <PixelCharacter mode={mode} unlockedItems={progress.unlockedItems} />
                  </div>
                  <div className="flex flex-col text-white">
                    <div className="text-5xl sm:text-7xl md:text-9xl font-black tabular-nums tracking-tighter" style={{ fontFamily: currentFontFamily }}>
                      {timeString}
                    </div>
                    <div className="text-[8px] sm:text-[12px] font-black uppercase tracking-[0.5em] opacity-80" style={{ fontFamily: currentFontFamily }}>
                      {mode === TimerMode.FOCUS ? 'Deep Work' : 'Break Time'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-sm text-[9px] font-black tracking-widest z-20 shadow-lg">
                 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                 <span>LIVE</span>
              </div>

              <div className={`absolute bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col space-y-3 transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="w-full h-[4px] bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] sm:text-xs font-bold tabular-nums">{timeString} / {mode === TimerMode.FOCUS ? settings.focusDuration : settings.breakDuration}:00</span>
                    <button 
                      onClick={async () => {
                        if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
                        else await document.exitFullscreen();
                      }} 
                      className="p-2 bg-white/5 rounded-full"
                    >
                       <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                    </button>
                 </div>
              </div>
            </div>

            {!isImmersive && (
              <div className="px-5 py-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  🔴 {mode === TimerMode.FOCUS ? 'Deep Studio Sanctuary' : 'Intermission Recharge'} - Session {sessionCount}
                </h1>
                <div className="mt-6 flex items-center justify-between py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-1.5 border border-white/10">
                      <PixelCharacter mode={TimerMode.IDLE} unlockedItems={progress.unlockedItems} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">Zen Focus</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-tighter">Automatic Transition</p>
                    </div>
                  </div>
                  <button 
                    onClick={stopTimer}
                    className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Quit
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isImmersive && (
            <div className={`flex flex-col transition-all duration-700 ${isPC ? 'lg:w-[30%] lg:pt-6 lg:pl-8' : 'w-full p-5 pt-0'}`}>
               <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Coming Up</h2>
               <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-1 group">
                       <div className="w-32 aspect-video bg-white/5 rounded-xl border border-white/10 flex-shrink-0 relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/5 opacity-10 blur-xl"></div>
                       </div>
                       <div className="flex-1 flex flex-col justify-center">
                          <h4 className="text-[12px] font-bold leading-tight group-hover:text-red-500 transition-colors">Next Interval Cycle</h4>
                          <p className="text-[10px] text-white/30 mt-1">Pomodoro Sanctuary</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;