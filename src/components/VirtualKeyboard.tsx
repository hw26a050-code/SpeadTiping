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
    <div id="virtual-keyboard-container" className="w-full max-w-2xl mx-auto p-2.5 sm:p-3 bg-amber-50/50 rounded-xl border border-amber-100 shadow-xs">
      <div className="flex flex-col gap-1 md:gap-1.5">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1">
            {/* 3行目の左右にバランス調整用のスペースやインデントを置く */}
            {rowIndex === 2 && <div className="w-3 md:w-5" />}
            
            {row.map(key => {
              const isNext = nextKeysLower.includes(key);
              const isLast = lastKeyLower === key;

              return (
                <motion.div
                  id={`key-${key}`}
                  key={key}
                  className={`
                    relative flex items-center justify-center 
                    w-7 h-9 sm:w-10 sm:h-11 md:w-11 md:h-12 
                    rounded-md text-xs sm:text-sm md:text-base font-semibold uppercase select-none transition-colors
                    ${isNext 
                      ? 'bg-amber-400 text-white shadow-xs font-bold' 
                      : isLast
                        ? 'bg-orange-200 text-orange-700 border-orange-300'
                        : 'bg-white text-stone-600 border border-stone-200/80 shadow-xs'
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
                    <span className="absolute inset-0 rounded-lg border-2 border-amber-300 animate-ping opacity-35 pointer-events-none" />
                  )}
                </motion.div>
              );
            })}
            {rowIndex === 2 && <div className="w-4 md:w-6" />}
          </div>
        ))}
      </div>
    </div>
  );
};
