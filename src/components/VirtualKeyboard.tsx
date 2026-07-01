import React from 'react';
import { motion } from 'motion/react';

interface VirtualKeyboardProps {
  nextKeys: string[]; // 次に入力可能なキー (例: ['s', 'k'])
  lastKeyTyped: string | null; // 直前に押されたキー (一瞬リアクションさせる用)
}

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ nextKeys, lastKeyTyped }) => {
  const nextKeysLower = nextKeys.map(k => k.toLowerCase());
  const lastKeyLower = lastKeyTyped ? lastKeyTyped.toLowerCase() : null;

  return (
    <div id="virtual-keyboard-container" className="w-full max-w-xl mx-auto p-0.5 sm:p-1 bg-stone-900/95 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
      <div className="flex flex-col gap-0.5">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-0.5">
            {/* 3行目の左右にバランス調整用のスペースやインデントを置く */}
            {rowIndex === 2 && <div className="w-1.5 md:w-2" />}
            
            {row.map(key => {
              const isNext = nextKeysLower.includes(key);
              const isLast = lastKeyLower === key;

              return (
                <motion.div
                  id={`key-${key}`}
                  key={key}
                  className={`
                    relative flex items-center justify-center 
                    w-5.5 h-7 sm:w-7 sm:h-8 md:w-8 md:h-8.5 
                    rounded-md text-[8px] sm:text-[10px] md:text-xs font-semibold uppercase select-none transition-colors
                    ${isNext 
                      ? 'bg-cyan-500 text-stone-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] font-black' 
                      : isLast
                        ? 'bg-fuchsia-600 text-white border border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.6)] font-bold'
                        : 'bg-stone-950 text-stone-400 border border-stone-800 shadow-xs'
                    }
                  `}
                  animate={isNext ? {
                    scale: [1, 1.05, 1],
                  } : {}}
                  transition={isNext ? {
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  } : {}}
                >
                  {/* キー文字 */}
                  <span>{key}</span>

                  {/* ハイライトサークル */}
                  {isNext && (
                    <span className="absolute inset-0 rounded-lg border-2 border-cyan-400 animate-ping opacity-40 pointer-events-none" />
                  )}
                </motion.div>
              );
            })}
            {rowIndex === 2 && <div className="w-3 md:w-4" />}
          </div>
        ))}
      </div>
    </div>
  );
};
