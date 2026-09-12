import React, { useState } from 'react';
import { CombatLogEntry } from '../types/schema';
import { Scroll, ShieldAlert, Sparkles, Sword, Footprints, AlertTriangle, Terminal, ChevronRight } from 'lucide-react';

interface CombatLogPanelProps {
  logs: CombatLogEntry[];
  onClose?: () => void;
}

export const CombatLogPanel: React.FC<CombatLogPanelProps> = ({ logs, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'combat' | 'exploration' | 'hazards'>('all');

  const filteredLogs = logs.filter(log => {
    if (filter === 'combat') return log.type === 'attack' || log.type === 'damage' || log.type === 'heal' || log.type === 'boss';
    if (filter === 'exploration') return log.type === 'reveal' || log.type === 'move';
    if (filter === 'hazards') return log.type === 'hazard' || log.type === 'trap';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-stone-900/95 rounded-xl border border-stone-800 shadow-xl overflow-hidden">
      {/* Header with Filter Pills & Close Button */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-stone-950 border-b border-stone-800 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-stone-200 font-mono">
            Tabletop Chronicle
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === 'all' ? 'bg-stone-800 text-amber-400 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('combat')}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === 'combat' ? 'bg-stone-800 text-red-400 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Combat
            </button>
            <button
              onClick={() => setFilter('exploration')}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === 'exploration' ? 'bg-stone-800 text-emerald-400 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setFilter('hazards')}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === 'hazards' ? 'bg-stone-800 text-orange-400 font-bold' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Hazards
            </button>
          </div>

          {onClose && (
            <button
              id="btn-close-chronicle"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all border border-stone-700 ml-1 cursor-pointer"
              title="Close Tabletop Chronicle"
            >
              <span>Close</span>
              <span className="font-bold">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-xs select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-stone-600 text-center py-6 italic">No recorded events in this category yet.</div>
        ) : (
          filteredLogs.map(entry => {
            let badgeBg = 'bg-stone-800 text-stone-300';
            let icon = <Scroll className="w-3 h-3" />;

            if (entry.type === 'damage' || entry.type === 'attack') {
              badgeBg = 'bg-red-950/80 text-red-400 border border-red-800/60';
              icon = <Sword className="w-3 h-3 text-red-400" />;
            } else if (entry.type === 'reveal') {
              badgeBg = 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60';
              icon = <Sparkles className="w-3 h-3 text-emerald-400" />;
            } else if (entry.type === 'hazard' || entry.type === 'trap') {
              badgeBg = 'bg-orange-950/80 text-orange-400 border border-orange-800/60';
              icon = <AlertTriangle className="w-3 h-3 text-orange-400" />;
            } else if (entry.type === 'boss') {
              badgeBg = 'bg-purple-950/80 text-purple-300 border border-purple-800/60';
              icon = <ShieldAlert className="w-3 h-3 text-purple-300" />;
            } else if (entry.type === 'move') {
              badgeBg = 'bg-blue-950/50 text-blue-400';
              icon = <Footprints className="w-3 h-3 text-blue-400" />;
            }

            return (
              <div 
                key={entry.id} 
                className="p-2 rounded bg-stone-950/60 border border-stone-800/60 flex flex-col gap-1 transition-all"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-bold ${badgeBg}`}>
                      {icon}
                      <span>{entry.source}</span>
                    </span>
                    <span className="text-stone-400 font-semibold">{entry.action}</span>
                  </div>
                  <span className="text-stone-600">{entry.timestamp}</span>
                </div>

                <div className="text-stone-300 leading-relaxed font-sans text-xs">
                  {entry.detail}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
