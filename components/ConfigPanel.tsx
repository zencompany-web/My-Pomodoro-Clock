import React from 'react';
import { AppSettings } from '../types';
import { FONT_OPTIONS } from '../constants';

interface ConfigPanelProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onStart: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ settings, onUpdate, onStart }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdate({
      ...settings,
      [name]: name.includes('Duration') || name === 'totalSessions' ? Number(value) : value
    });
  };

  return (
    <div className="w-full max-w-sm space-y-5 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm max-h-[80vh] overflow-y-auto no-scrollbar">
      <h2 className="text-center text-xs font-bold uppercase tracking-[0.4em] opacity-40 mb-2">Timer Settings</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Focus</label>
          <input type="number" name="focusDuration" value={settings.focusDuration} onChange={handleChange} className="bg-black/20 p-2 rounded-xl outline-none text-lg border border-white/5" />
        </div>
        <div className="flex flex-col">
          <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Break</label>
          <input type="number" name="breakDuration" value={settings.breakDuration} onChange={handleChange} className="bg-black/20 p-2 rounded-xl outline-none text-lg border border-white/5" />
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Total Sessions</label>
        <input type="number" name="totalSessions" value={settings.totalSessions} onChange={handleChange} className="bg-black/20 p-2 rounded-xl outline-none text-lg border border-white/5" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Focus Theme</label>
          <input type="color" name="focusBgColor" value={settings.focusBgColor} onChange={handleChange} className="h-10 w-full rounded-xl bg-transparent cursor-pointer border border-white/10 p-1" />
        </div>
        <div className="flex flex-col">
          <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Break Theme</label>
          <input type="color" name="breakBgColor" value={settings.breakBgColor} onChange={handleChange} className="h-10 w-full rounded-xl bg-transparent cursor-pointer border border-white/10 p-1" />
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-[9px] uppercase font-bold opacity-40 mb-1 tracking-widest">Typography</label>
        <select name="fontFamily" value={settings.fontFamily} onChange={handleChange} className="bg-black/20 p-2 rounded-xl outline-none text-sm border border-white/5 text-white [&>option]:text-black">
          {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.name}>{opt.name}</option>)}
        </select>
      </div>

      <button onClick={onStart} className="w-full mt-4 bg-white text-black font-black py-4 rounded-2xl transition-all active:scale-95 hover:bg-opacity-90 uppercase text-[10px] tracking-[0.3em] shadow-xl">
        Start Session
      </button>
    </div>
  );
};