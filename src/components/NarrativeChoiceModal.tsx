import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NarrativeChoiceEvent, NarrativeChoiceOption } from '../types/schema';
import { 
  Heart, 
  Skull, 
  Coins, 
  Shield, 
  Sparkles, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  BookOpen, 
  X,
  Scale
} from 'lucide-react';

interface NarrativeChoiceModalProps {
  isOpen: boolean;
  event: NarrativeChoiceEvent | null;
  onSelectOption: (option: NarrativeChoiceOption) => void;
  onClose: () => void;
}

export const NarrativeChoiceModal: React.FC<NarrativeChoiceModalProps> = ({
  isOpen,
  event,
  onSelectOption,
  onClose
}) => {
  if (!isOpen || !event) return null;

  const renderPortraitIcon = (portrait: string) => {
    switch (portrait) {
      case 'Heart':
        return <Heart className="w-8 h-8 text-rose-400" />;
      case 'Skull':
        return <Skull className="w-8 h-8 text-purple-400" />;
      default:
        return <Scale className="w-8 h-8 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                {event.actTitle}
              </div>
              <h3 className="text-lg font-black text-stone-100 font-serif tracking-wide">
                {event.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Speaker / Scenario Card */}
          <div className="flex gap-4 p-4 rounded-xl bg-stone-900/70 border border-stone-800">
            <div className="w-14 h-14 rounded-xl bg-stone-950 border border-stone-700/80 flex items-center justify-center shrink-0 shadow-inner">
              {renderPortraitIcon(event.portrait)}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-amber-300">
                Speaker: {event.speaker}
              </div>
              <p className="text-sm text-stone-300 leading-relaxed italic font-serif">
                "{event.situationText}"
              </p>
            </div>
          </div>

          <div className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Choose Your Action — Your Choice Echoes into Act III:</span>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {event.options.map((option) => (
              <button
                key={option.id}
                onClick={() => onSelectOption(option)}
                className="w-full text-left p-4 rounded-xl bg-stone-900/60 hover:bg-amber-950/30 border border-stone-800 hover:border-amber-600/60 transition-all group cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-stone-200 group-hover:text-amber-200 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{option.text}</span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  {option.goldChange && option.goldChange > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-300 font-mono text-xs font-bold shrink-0">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>+{option.goldChange} GP</span>
                    </div>
                  )}
                </div>

                {/* Consequence Preview Banner */}
                <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 flex items-center gap-2 text-[11px] text-stone-400">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="italic">{option.consequenceSummary}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800/80 text-[11px] font-mono text-stone-400 flex items-center justify-between">
          <span>Blood Debt Narrative Engine</span>
          <span className="text-amber-400/80">Decisions persist to your account ledger</span>
        </div>
      </motion.div>
    </div>
  );
};
