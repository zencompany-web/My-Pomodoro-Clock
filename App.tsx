
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimerMode, AppSettings, UserProgress, RewardItem } from './types';
import { DEFAULT_SETTINGS, FONT_OPTIONS, BELL_SOUND_B64 } from './constants';
import { PixelCharacter } from './components/PixelCharacter';
import { ConfigPanel } from './components/ConfigPanel';

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
    } catch (e) { console.error("Settings load failed", e); }
    return DEFAULT_SETTINGS;
  });

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error("Progress load failed", e); }
    return { totalMinutesFocused: 0, unlockedItems: [] };
  });

  const [mode, setMode] = useState<TimerMode>(TimerMode.IDLE);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showShop, setShowShop] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [streamStartTime] = useState(() => new Date(Date.now() - 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); 
  const [viewerCount, setViewerCount] = useState(1245800);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
  }, [progress]);

  // Wake Lock Logic (Mobile App Essential)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
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

  // Viewer Count Sim
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(current => {
        const isIncreasing = Math.random() > 0.45;
        const delta = Math.floor(Math.random() * 84500) + 500;
        let nextCount = isIncreasing ? current + delta : current - delta;
        if (nextCount < 10000) nextCount = 10000 + Math.floor(Math.random() * 5000);
        if (nextCount > 2000000) nextCount = 2000000 - Math.floor(Math.random() * 5000);
        return nextCount;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const bell = new Audio(BELL_SOUND_B64);
    bell.volume = 0.6;
    bellRef.current = bell;
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const playBell = useCallback(() => {
    if (bellRef.current) {
      bellRef.current.currentTime = 0;
      bellRef.current.play().catch(e => console.log("Bell play failed:", e));
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
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setMode(TimerMode.IDLE);
    setTimeLeft(0);
    setSessionCount(0);
    setShowControls(true);
    releaseWakeLock();
  }, []);

  const toggleFullscreen = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
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
          if (mode === TimerMode.FOCUS && (prev > 0 && prev % 60 === 0 && prev !== settings.focusDuration * 60)) {
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

  const totalDuration = (mode === TimerMode.FOCUS ? settings.focusDuration : settings.breakDuration) * 60;
  const progressPercent = mode === TimerMode.IDLE ? 0 : ((totalDuration - timeLeft) / totalDuration) * 100;

  const upcomingQueue = useMemo(() => {
    if (mode === TimerMode.IDLE) return [];
    const queue = [];
    if (mode === TimerMode.FOCUS) queue.push({ type: 'Break', duration: settings.breakDuration, session: sessionCount });
    for (let i = sessionCount + 1; i <= settings.totalSessions; i++) {
      queue.push({ type: 'Focus', duration: settings.focusDuration, session: i });
      queue.push({ type: 'Break', duration: settings.breakDuration, session: i });
    }
    return queue;
  }, [mode, sessionCount, settings]);

  return (
    <div 
      ref={containerRef}
      className={`h-[100dvh] w-full flex flex-col transition-colors duration-1000 overflow-y-auto no-scrollbar text-white scroll-smooth select-none`}
      style={{ backgroundColor: appBg }}
      onClick={handleInteraction}
      onMouseMove={handleInteraction}
    >
      {mode === TimerMode.IDLE ? (
        <div className="flex-1 flex flex-col">
           <div className="w-full p-4 flex items-center justify-between sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md">
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg">
                 <span className="text-yellow-400">✨</span>
                 <span className="text-sm font-bold tracking-tight">{progress.totalMinutesFocused}m Zen Points</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowShop(!showShop); }}
                className="px-6 py-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
              >
                {showShop ? 'Back' : 'Shop'}
              </button>
           </div>

           <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-8 md:gap-12 max-w-6xl mx-auto w-full">
              <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-1000">
                <div className="w-40 h-40 md:w-56 md:h-56 relative">
                   <div className="absolute inset-0 bg-white/5 rounded-full blur-[50px] animate-pulse"></div>
                   <PixelCharacter mode={TimerMode.IDLE} unlockedItems={progress.unlockedItems} />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tighter" style={{ fontFamily: currentFontFamily }}>My Pomodoro Clock</h1>
                  <p className="text-[9px] uppercase tracking-[0.4em] opacity-30 mt-1">Personal Focus Sanctuary</p>
                </div>
              </div>

              <div className="w-full max-w-sm z-10" onClick={(e) => e.stopPropagation()}>
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
                            className={`p-4 rounded-2xl border flex flex-col items-center transition-all ${isUnlocked ? 'border-green-500/30 bg-green-500/5 cursor-default' : (canAfford ? 'border-white/20 bg-black/20 hover:scale-[1.02] hover:border-white/40' : 'border-white/5 bg-black/20 opacity-30 grayscale')}`}
                          >
                            <div className="text-3xl mb-1">{item.icon}</div>
                            <div className="text-[10px] font-black uppercase tracking-tight">{item.name}</div>
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
        <div className={`flex flex-col lg:flex-row w-full ${isPC ? 'max-w-[1600px] mx-auto lg:px-6' : ''}`}>
          {/* MAIN COLUMN */}
          <div className={`flex flex-col transition-all duration-700 ${isImmersive ? 'w-full h-[100dvh]' : (isPC ? 'lg:w-[70%]' : 'w-full')}`}>
            
            {/* VIDEO PLAYER BOX */}
            <div 
              className={`relative flex items-center justify-center transition-all duration-700 overflow-hidden z-40 ${isImmersive ? 'h-full' : (isPC ? 'sticky top-0 lg:static w-full aspect-video shadow-2xl lg:rounded-2xl lg:mt-6 lg:mb-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)]' : 'w-full aspect-video')}`}
              style={{ backgroundColor: themeColor }}
            >
              {(isPC || isImmersive) && <div className="absolute inset-0 pointer-events-none z-0 opacity-10" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 2px' }}></div>}

              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className={`flex items-center space-x-6 sm:space-x-12 transition-transform duration-700 ${isImmersive ? 'scale-110 sm:scale-125 md:scale-140' : 'scale-95 sm:scale-100'}`}>
                  <div className="w-16 h-16 sm:w-24 md:w-32 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">
                    <PixelCharacter mode={mode} unlockedItems={progress.unlockedItems} />
                  </div>
                  <div className="flex flex-col text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                    <div className="text-4xl sm:text-6xl md:text-8xl font-black tabular-nums tracking-tighter" style={{ fontFamily: currentFontFamily }}>
                      {timeString}
                    </div>
                    <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.5em] opacity-80" style={{ fontFamily: currentFontFamily }}>
                      {mode === TimerMode.FOCUS ? 'Deep Focusing' : 'Relaxing Break'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-sm text-[9px] font-black tracking-widest z-20 shadow-lg">
                 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                 <span>LIVE</span>
              </div>

              <div className={`absolute bottom-0 left-0 w-full p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col space-y-3 sm:space-y-4 transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.8)]" style={{ width: `${progressPercent}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 sm:gap-6">
                       <div className="opacity-30 cursor-not-allowed transform scale-90">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h4z"/></svg>
                       </div>
                       <span className="text-[11px] sm:text-sm font-bold tabular-nums tracking-tight">{timeString} / {mode === TimerMode.FOCUS ? settings.focusDuration : settings.breakDuration}:00</span>
                    </div>
                    <button onClick={toggleFullscreen} className="hover:scale-110 transition-all p-1">
                       <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                       </svg>
                    </button>
                 </div>
              </div>
            </div>

            {/* METADATA */}
            {!isImmersive && (
              <div className="px-4 lg:px-0 py-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight tracking-tight">
                  🔴 {mode === TimerMode.FOCUS ? 'Deep Studio Sanctuary' : 'Intermission Recharge'} - Session {sessionCount}
                </h1>
                <div className="mt-2 text-[13px] font-medium text-white/50 flex items-center gap-2">
                  <span className="text-white font-bold">{viewerCount.toLocaleString()} watching</span>
                  <span className="opacity-30">•</span>
                  <span>Started at {streamStartTime}</span>
                </div>
                
                <div className="mt-6 flex items-center justify-between py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 p-1.5 overflow-hidden flex items-center justify-center shadow-lg">
                      <PixelCharacter mode={TimerMode.IDLE} unlockedItems={progress.unlockedItems} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base flex items-center gap-1 truncate">Zen For Studying <span className="text-blue-400 text-[10px] sm:text-xs">✓</span></h3>
                      <p className="text-[10px] text-white/40 truncate">2.4M focusers</p>
                    </div>
                  </div>
                  <button 
                    onClick={stopTimer}
                    className="bg-white/10 hover:bg-white hover:text-black text-white px-5 sm:px-8 py-2 sm:py-3 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                  >
                    End Session
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR / QUEUE - ONLY VISIBLE ON PC */}
          {!isImmersive && (
            <div className={`flex flex-col transition-all duration-700 ${isPC ? 'lg:w-[30%] lg:pt-6 lg:pl-8' : 'w-full p-4 pt-0'}`}>
               <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-widest opacity-40">Coming Up</h2>
               </div>
               <div className="space-y-4">
                  {upcomingQueue.map((item, i) => (
                    <div key={i} className="flex gap-3 group cursor-pointer px-1">
                       <div className="relative w-32 lg:w-40 aspect-video bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                          <div className="absolute inset-0 opacity-20 flex items-center justify-center" style={{ backgroundColor: item.type === 'Focus' ? settings.focusBgColor : settings.breakBgColor }}>
                            <PixelCharacter mode={item.type.toUpperCase() as TimerMode} unlockedItems={progress.unlockedItems} />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/90 text-[9px] px-1 rounded font-black">{item.duration}:00</div>
                       </div>
                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="text-[12px] sm:text-[13px] font-bold line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                            {item.type} Loop - Session {item.session} Sanctuary
                          </h4>
                          <p className="text-[10px] text-white/40 mt-1 font-medium">Zen For Studying</p>
                       </div>
                    </div>
                  ))}
                  {upcomingQueue.length === 0 && (
                    <div className="text-center py-10 opacity-10 text-[10px] font-black uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-2xl">
                      Loop Finalized
                    </div>
                  )}
                  <div className="h-20"></div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
