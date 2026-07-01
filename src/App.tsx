/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Trophy, 
  Play, 
  AlertCircle, 
  RotateCcw, 
  Home, 
  Flame,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Difficulty, Word, GameSettings } from './types';
import { EASY_WORDS, NORMAL_WORDS, HARD_WORDS } from './data';
import { TypingEngine } from './utils/romanizer';
import { 
  playKeySound, 
  playCorrectWordSound, 
  playMistakeSound, 
  playGameOverSound 
} from './utils/audio';
import { VirtualKeyboard } from './components/VirtualKeyboard';

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const ENEMIES = [
  { name: 'ネオ・グリッチ', emoji: '👾', maxHp: 100 },
  { name: 'サイバー・センチネル', emoji: '🤖', maxHp: 100 },
  { name: 'ボイド・ドローン', emoji: '🛸', maxHp: 100 },
  { name: 'バイラス・スコーピオン', emoji: '🦂', maxHp: 100 },
  { name: '量子レッド・ドラゴン', emoji: '🐲', maxHp: 100 }
];

export default function App() {
  // 画面状態
  const [screen, setScreen] = useState<'title' | 'playing' | 'gameover'>('title');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  
  // 各自のプレイ前設定
  const [settings, setSettings] = useState<GameSettings>({
    showKeyboard: true,
    soundEnabled: true,
  });

  // ゲーム内ステート
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentWord, setCurrentWord] = useState<Word>({ kanji: '開始', kana: 'かいし' });
  const [wordsQueue, setWordsQueue] = useState<Word[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTimeForWord, setTotalTimeForWord] = useState(10);
  
  // タイピング進行管理
  const [engine, setEngine] = useState<TypingEngine | null>(null);
  const [typedString, setTypedString] = useState('');
  const [remainingString, setRemainingString] = useState('');
  const [nextAllowedKeys, setNextAllowedKeys] = useState<string[]>([]);
  const [lastKeyTyped, setLastKeyTyped] = useState<string | null>(null);

  // 視覚的エフェクト
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isWordCorrectEffect, setIsWordCorrectEffect] = useState(false);
  const [isWordMistakeEffect, setIsWordMistakeEffect] = useState(false);
  const [flashRed, setFlashRed] = useState(false);

  // バトルアニメーション状態
  const [playerAction, setPlayerAction] = useState<'idle' | 'attack'>('idle');
  const [enemyAction, setEnemyAction] = useState<'idle' | 'hurt' | 'attack'>('idle');
  const [enemyInfo, setEnemyInfo] = useState({ name: 'ネオ・グリッチ', emoji: '👾', maxHp: 100 });

  // 最後のゲームオーバー理由
  const [gameOverReason, setGameOverReason] = useState<'lives' | 'timeout'>('lives');

  // 単語キュー用のインデックス
  const queueIndexRef = useRef(0);

  // 現在押し下げ中の物理キーを管理するRef（キーが離されるまで再入力をロックする）
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // ゲーム中のキー入力をイベントリスナーでキャッチする
  useEffect(() => {
    // 画面切り替え時に押し下げ状態をクリア
    pressedKeysRef.current.clear();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing' || !engine || isWordCorrectEffect || isWordMistakeEffect) return;

      // 特殊キーやMetaキー、Shiftキーなどは除外
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      // 物理キーコード（例: "KeyN"）をキーとして使用。なければ e.key をフォールバック
      const code = e.code || e.key;

      // キーが物理的に離される（keyup）まで、同一キーの再入力を受け付けない
      if (pressedKeysRef.current.has(code)) return;
      pressedKeysRef.current.add(code);

      const key = e.key.toLowerCase();
      setLastKeyTyped(key);
      
      // 一瞬でキーの「押した感」フィードバックを消すタイマー
      setTimeout(() => setLastKeyTyped(null), 150);

      // エンジンに入力を通す
      const isCorrect = engine.inputKey(key);

      if (isCorrect) {
        playKeySound(settings.soundEnabled);
        // 表示情報を更新
        setTypedString(engine.getTypedRomaji());
        setRemainingString(engine.getRemainingRomaji());
        setNextAllowedKeys(engine.getNextAllowedKeys());

        // 単語が完了したかチェック
        if (engine.isFinished()) {
          // 単語切り替え時にも押し下げ状態をリセット
          pressedKeysRef.current.clear();
          handleWordCompleted();
        }
      } else {
        // ミス
        playMistakeSound(settings.soundEnabled);
        setShakeTrigger(prev => prev + 1);
        setFlashRed(true);
        setIsWordMistakeEffect(true);

        // 敵の攻撃アニメーション
        setEnemyAction('attack');
        setTimeout(() => {
          setEnemyAction('idle');
        }, 450);

        // ライフ減少
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            triggerGameOver('lives');
            setFlashRed(false);
            setIsWordMistakeEffect(false);
            return 0;
          } else {
            // ミスをした0.5秒後に次のお題に進む
            setTimeout(() => {
              setFlashRed(false);
              setIsWordMistakeEffect(false);
              pressedKeysRef.current.clear();
              
              let nextIndex = queueIndexRef.current + 1;
              let list = wordsQueue;
              if (nextIndex >= list.length) {
                let sourceWords = EASY_WORDS;
                if (difficulty === 'Normal') sourceWords = NORMAL_WORDS;
                if (difficulty === 'Hard') sourceWords = HARD_WORDS;
                list = shuffleArray(sourceWords);
                setWordsQueue(list);
                nextIndex = 0;
              }
              queueIndexRef.current = nextIndex;
              setupNewWord(list[nextIndex], difficulty);
            }, 500); // 0.5秒待つ
          }
          return nextLives;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code || e.key;
      pressedKeysRef.current.delete(code);
    };

    const handleBlur = () => {
      pressedKeysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [screen, engine, isWordCorrectEffect, isWordMistakeEffect, settings.soundEnabled, wordsQueue, difficulty]);

  // 滑らかなプログレスバー用のタイマー
  useEffect(() => {
    if (screen !== 'playing' || isWordCorrectEffect || isWordMistakeEffect) return;

    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setTimeLeft(prev => {
        const next = prev - delta;
        if (next <= 0) {
          handleTimeUp();
          return 0;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [screen, currentWord, isWordCorrectEffect, isWordMistakeEffect]);

  const spawnNewEnemy = () => {
    const randomEnemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    setEnemyInfo(randomEnemy);
  };

  // ゲームを新規開始
  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setLives(3);
    spawnNewEnemy();
    
    // 難易度に応じた単語セットをシャッフル
    let sourceWords = EASY_WORDS;
    if (selectedDifficulty === 'Normal') sourceWords = NORMAL_WORDS;
    if (selectedDifficulty === 'Hard') sourceWords = HARD_WORDS;

    const shuffled = shuffleArray(sourceWords);
    setWordsQueue(shuffled);
    queueIndexRef.current = 0;

    const firstWord = shuffled[0];
    setupNewWord(firstWord, selectedDifficulty);
    setScreen('playing');
  };

  // 次の単語をセットアップする
  const setupNewWord = (word: Word, diff: Difficulty) => {
    setCurrentWord(word);
    
    // 難易度に応じた制限時間の計算
    const len = word.kana.length;
    let multiplier = 2.5;
    if (diff === 'Normal') {
      multiplier = 0.8;
    } else if (diff === 'Hard') {
      multiplier = 0.4;
    }
    const computedTime = Math.ceil((len * multiplier) * 10) / 10; // 小数第二位以下繰り上げ
    setTimeLeft(computedTime);
    setTotalTimeForWord(computedTime);

    // タイピングエンジン生成
    const newEngine = new TypingEngine(word.kana);
    setEngine(newEngine);
    setTypedString('');
    setRemainingString(newEngine.getRemainingRomaji());
    setNextAllowedKeys(newEngine.getNextAllowedKeys());
  };

  // 単語を正しく入力しきったとき
  const handleWordCompleted = () => {
    setIsWordCorrectEffect(true);
    playCorrectWordSound(settings.soundEnabled);
    setScore(prev => prev + 1);

    // バトルアニメーション
    setPlayerAction('attack');
    setEnemyAction('hurt');

    // 一撃で吹き飛ばすため、200ms後に新しい敵を出現させる
    setTimeout(() => {
      spawnNewEnemy();
    }, 200);

    // アクションのクリア
    setTimeout(() => {
      setPlayerAction('idle');
      setEnemyAction('idle');
    }, 200);

    setTimeout(() => {
      setIsWordCorrectEffect(false);
      
      // 次の単語に進む
      let nextIndex = queueIndexRef.current + 1;
      let list = wordsQueue;

      if (nextIndex >= list.length) {
        // 単語キューが一巡したら再シャッフル
        let sourceWords = EASY_WORDS;
        if (difficulty === 'Normal') sourceWords = NORMAL_WORDS;
        if (difficulty === 'Hard') sourceWords = HARD_WORDS;
        list = shuffleArray(sourceWords);
        setWordsQueue(list);
        nextIndex = 0;
      }
      
      queueIndexRef.current = nextIndex;
      setupNewWord(list[nextIndex], difficulty);
    }, 250); // アニメーションが完了して次のお題へ爆速移行するよう調整
  };

  // 時間切れ時の処理
  const handleTimeUp = () => {
    if (difficulty === 'Hard') {
      // Hardは即ゲームオーバー
      triggerGameOver('timeout');
    } else {
      // Easy, Normalはライフ1減少して次へ
      playMistakeSound(settings.soundEnabled);
      setFlashRed(true);
      setIsWordMistakeEffect(true);

      // 敵の攻撃アニメーション
      setEnemyAction('attack');
      setTimeout(() => {
        setEnemyAction('idle');
      }, 450);

      setLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          triggerGameOver('lives');
          setFlashRed(false);
          setIsWordMistakeEffect(false);
          return 0;
        } else {
          // 0.5秒待ってから次の単語へ移行
          setTimeout(() => {
            setFlashRed(false);
            setIsWordMistakeEffect(false);
            
            let nextIndex = queueIndexRef.current + 1;
            let list = wordsQueue;
            if (nextIndex >= list.length) {
              let sourceWords = EASY_WORDS;
              if (difficulty === 'Normal') sourceWords = NORMAL_WORDS;
              list = shuffleArray(sourceWords);
              setWordsQueue(list);
              nextIndex = 0;
            }
            queueIndexRef.current = nextIndex;
            setupNewWord(list[nextIndex], difficulty);
          }, 500); // 0.5秒待つ
        }
        return nextLives;
      });
    }
  };

  // ゲームオーバーへの遷移
  const triggerGameOver = (reason: 'lives' | 'timeout') => {
    setGameOverReason(reason);
    setScreen('gameover');
    playGameOverSound(settings.soundEnabled);
  };

  const toggleKeyboard = () => {
    setSettings(prev => ({ ...prev, showKeyboard: !prev.showKeyboard }));
  };

  const toggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  return (
    <div className="h-screen w-full bg-stone-950 text-stone-100 flex flex-col justify-between p-3 sm:p-4 font-sans antialiased overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* 画面上部：共通のシンプルなヘッダー */}
      <header id="app-header" className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">⚡</span>
          <h1 className="font-sans font-bold tracking-tight text-cyan-400 text-sm sm:text-base">スピードタイピング</h1>
        </div>
        
        {/* 常時変更可能なサウンド・キーボードトグル (タイトル、プレイ中問わず優しく表示) */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-sound-btn"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              settings.soundEnabled 
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                : 'bg-stone-900 border-stone-800 text-stone-600'
            }`}
            title={settings.soundEnabled ? 'サウンドON' : 'サウンドOFF'}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            id="toggle-keyboard-btn"
            onClick={toggleKeyboard}
            className={`p-2 rounded-xl border transition-all ${
              settings.showKeyboard 
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                : 'bg-stone-900 border-stone-800 text-stone-600'
            }`}
            title={settings.showKeyboard ? '仮想キーボード表示中' : '仮想キーボード非表示'}
          >
            <Keyboard size={18} />
          </button>
        </div>
      </header>

      {/* メインのコンテンツ領域 */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-center my-1.5 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          
          {/* TITLE SCREEN */}
          {screen === 'title' && (
            <motion.div
              id="title-screen"
              key="title"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center py-3 sm:py-4 px-4"
            >
              {/* かわいいロゴマーク */}
              <motion.div 
                className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-tr from-cyan-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-3 sm:mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <span className="text-3xl sm:text-4xl">🎮</span>
              </motion.div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-emerald-400 tracking-tight mb-1">
                スピードタイピング
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm max-w-md mb-3 sm:mb-4 leading-relaxed font-medium">
                高速タイピングを練習するためのゲームです。<br />ミスなく正確に早くタイピングしましょう。
              </p>

              {/* クイックガイドオプションカード */}
              <div id="option-settings-card" className="w-full max-w-md bg-stone-900/80 backdrop-blur-xs rounded-xl p-3 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)] mb-4 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 justify-center">
                  <Sparkles size={14} /> ゲーム開始前のおすすめ設定
                </span>
                
                <div className="flex justify-around gap-2 mt-1">
                  <button 
                    id="setup-toggle-kbd"
                    onClick={toggleKeyboard}
                    className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      settings.showKeyboard 
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                        : 'bg-stone-950 border-stone-800 text-stone-500'
                    }`}
                  >
                    <Keyboard size={16} />
                    <span className="text-xs">キーボードガイド: {settings.showKeyboard ? "ON" : "OFF"}</span>
                  </button>

                  <button 
                    id="setup-toggle-snd"
                    onClick={toggleSound}
                    className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      settings.soundEnabled 
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                        : 'bg-stone-950 border-stone-800 text-stone-500'
                    }`}
                  >
                    {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span className="text-xs">サウンド効果: {settings.soundEnabled ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* 難易度選択スタートボタン (3つの難易度) */}
              <div id="difficulty-selection-container" className="w-full max-w-lg">
                <p className="text-xs font-bold text-cyan-500/80 mb-2 tracking-widest uppercase">遊ぶ難易度を選んでスタート</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* EASY */}
                  <button
                    id="start-easy-btn"
                    onClick={() => startGame('Easy')}
                    className="group relative bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black py-2 px-4 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Easy</span>
                    <span className="text-[11px] font-bold opacity-90 text-stone-900">4文字以下の単語</span>
                    <span className="text-[9px] bg-stone-950/20 px-1.5 py-0.5 rounded-full mt-0.5 text-stone-900 font-medium">ミスしても次へ</span>
                  </button>

                  {/* NORMAL */}
                  <button
                    id="start-normal-btn"
                    onClick={() => startGame('Normal')}
                    className="group relative bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-stone-950 font-black py-2 px-4 rounded-xl shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:shadow-[0_0_18px_rgba(59,130,246,0.5)] transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Normal</span>
                    <span className="text-[11px] font-bold opacity-90 text-stone-900">5〜9文字の単語</span>
                    <span className="text-[9px] bg-stone-950/20 px-1.5 py-0.5 rounded-full mt-0.5 text-stone-900 font-medium">ミスしても次へ</span>
                  </button>

                  {/* HARD */}
                  <button
                    id="start-hard-btn"
                    onClick={() => startGame('Hard')}
                    className="group relative bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-stone-950 font-black py-2 px-4 rounded-xl shadow-[0_0_12px_rgba(244,63,94,0.3)] hover:shadow-[0_0_18px_rgba(244,63,94,0.5)] transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Hard</span>
                    <span className="text-[11px] font-bold opacity-90 text-stone-900">10文字以上の単語</span>
                    <span className="text-[9px] bg-stone-950/20 px-1.5 py-0.5 rounded-full mt-0.5 text-stone-900 font-medium">時間切れで即終了</span>
                  </button>

                </div>
              </div>
            </motion.div>
          )}

          {/* GAMEPLAY SCREEN */}
          {screen === 'playing' && (
            <motion.div
              id="gameplay-screen"
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-2 sm:gap-2.5"
            >
              
              {/* フラッシュ用背景オーバーレイ (ダメージを優しく表現) */}
              <AnimatePresence>
                {flashRed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-red-500 pointer-events-none z-50"
                  />
                )}
              </AnimatePresence>

              {/* ステータスバー（スコア、難易度、ライフ） */}
              <div id="playing-status-row" className="flex items-center justify-between bg-stone-900/90 backdrop-blur-xs px-4 py-1.5 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                
                {/* 左：現在のスコア */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.1)]">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <span className="text-cyan-600 text-[10px] font-bold block uppercase tracking-wider">スコア</span>
                    <span className="text-base font-black text-cyan-300">{score} <span className="text-xs font-normal text-cyan-500">点</span></span>
                  </div>
                </div>

                {/* 中央：難易度バッジ */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  difficulty === 'Easy' 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                    : difficulty === 'Normal'
                      ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                }`}>
                  {difficulty} モード
                </span>

                {/* 右：ライフハートマーク */}
                <div className="flex flex-col items-end">
                  <span className="text-cyan-600 text-[10px] font-bold block uppercase tracking-wider mb-0.5">ライフ</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(heartId => (
                      <Heart 
                        key={heartId}
                        size={20}
                        className={`transition-colors duration-300 ${
                          heartId <= lives 
                            ? 'fill-rose-500 text-rose-500 animate-pulse drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]' 
                            : 'text-stone-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* バトルアリーナ（敵キャラを中央配置） */}
              <div id="battle-arena" className="w-full bg-stone-950/80 rounded-2xl p-2.5 sm:p-3 border border-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.03)] flex flex-col gap-1.5 relative overflow-hidden h-[115px] sm:h-[125px] justify-center">
                {/* グリッド/グリッチ背景演出 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                
                <div className="flex flex-col items-center justify-center w-full relative z-10">
                  {/* 敵キャラ（中央） */}
                  <div className="flex flex-col items-center gap-1 w-full max-w-xs">
                    <span className="text-[10px] sm:text-xs font-bold text-rose-500 tracking-wider uppercase truncate max-w-[150px]">{enemyInfo.name}</span>
                    <motion.div
                      id="enemy-avatar"
                      key={enemyInfo.name}
                      initial={{ scale: 0.2, y: -25, opacity: 0 }}
                      animate={
                        enemyAction === 'hurt' 
                          ? {
                              x: [0, 80, 200],
                              y: [0, -60, -120],
                              scale: [1, 1.2, 0],
                              rotate: [0, 180, 360],
                              opacity: [1, 0.8, 0]
                            }
                          : enemyAction === 'attack'
                            ? {
                                y: [0, 15, 0],
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, 0]
                              }
                            : {
                                y: 0,
                                scale: 1,
                                opacity: 1,
                                x: 0
                              }
                      }
                      transition={
                        enemyAction === 'hurt' 
                          ? { duration: 0.22, ease: "easeOut" }
                          : enemyAction === 'attack'
                            ? { duration: 0.2, ease: "easeOut" }
                            : { duration: 0.12, ease: "easeOut" } // 待機状態への登場は極めて高速に
                      }
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl relative shadow-md transition-colors ${
                        enemyAction === 'hurt' 
                          ? 'bg-rose-500/20 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                          : enemyAction === 'attack'
                            ? 'bg-amber-500/20 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-stone-900 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] animate-cy-float' // CSSふわふわアニメーションを適用
                      }`}
                    >
                      {enemyInfo.emoji}

                      {/* 敵攻撃時のエフェクト */}
                      {enemyAction === 'attack' && (
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: [1, 2.0, 0], opacity: [1, 1, 0] }}
                          transition={{ duration: 0.25 }}
                          className="absolute text-3xl z-20"
                        >
                          💥
                        </motion.span>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* 単語カード */}
              <motion.div
                id="word-card"
                animate={shakeTrigger ? {
                  x: [0, -10, 10, -10, 10, 0]
                } : {}}
                transition={{ duration: 0.15 }}
                className={`
                  relative bg-stone-900/90 rounded-2xl p-3 sm:p-5 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.08)] flex flex-col items-center justify-center text-center overflow-hidden
                  ${isWordCorrectEffect ? 'border-emerald-500 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}
                  ${isWordMistakeEffect ? 'border-rose-500 bg-rose-950/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : ''}
                `}
              >
                {/* 制限時間バー */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-stone-950">
                  <motion.div
                    id="timer-progress-bar"
                    className={`h-full transition-all duration-100 ${
                      timeLeft / totalTimeForWord < 0.3 
                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-pulse' 
                        : 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                    }`}
                    style={{ width: `${(timeLeft / totalTimeForWord) * 100}%` }}
                  />
                </div>

                {/* タイマー数値表示 */}
                <span className="absolute top-1.5 right-3 font-mono text-[11px] text-cyan-400 font-bold drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
                  {Math.max(0, timeLeft).toFixed(1)}s
                </span>

                {/* 漢字表記＋上部にふりがな（小さめ） */}
                <div className="flex flex-col items-center mb-1.5 sm:mb-2.5">
                  {/* ふりがな（ルビ風） */}
                  <span className="text-fuchsia-400 font-black tracking-wider text-xs mb-0.5 drop-shadow-[0_0_6px_rgba(217,70,239,0.4)]">
                    {currentWord.kana}
                  </span>
                  {/* メインの漢字 */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-100 tracking-wide">
                    {currentWord.kanji}
                  </h3>
                </div>

                {/* ローマ字タイピング列（入力済み vs 未入力 の色分け） */}
                <div className="flex flex-wrap justify-center font-mono text-base sm:text-lg md:text-xl tracking-wide font-extrabold bg-stone-950/80 border border-cyan-500/10 px-3 py-1.5 rounded-xl w-full max-w-lg mb-0.5 shadow-inner">
                  <span className="text-emerald-400 transition-colors duration-150 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                    {typedString}
                  </span>
                  <span className="text-stone-500 relative">
                    {remainingString}
                    {/* カーソル演出 */}
                    <span className="absolute -top-1 bottom-1 w-0.5 bg-cyan-400 animate-pulse ml-0.5 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  </span>
                </div>

                {/* 日本語入力チェックアラート */}
                <div className="flex items-center gap-1.5 text-stone-500 text-[10px] sm:text-xs mt-1.5 bg-stone-950/50 px-2.5 py-1 rounded-full border border-stone-900">
                  <AlertCircle size={12} className="text-cyan-400" />
                  <span>必ず半角英数（英語）入力でお楽しみください</span>
                </div>

                {/* 正解時のきらきらスタンプエフェクト */}
                <AnimatePresence>
                  {isWordCorrectEffect && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.1, opacity: 0 }}
                      className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-emerald-500 text-stone-950 px-4 py-2 rounded-full font-black flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        <CheckCircle2 size={16} />
                        <span>正解！</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ミス時のスタンプエフェクト */}
                <AnimatePresence>
                  {isWordMistakeEffect && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.1, opacity: 0 }}
                      className="absolute inset-0 bg-rose-500/10 flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-rose-500 text-stone-950 px-4 py-2 rounded-full font-black flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                        <AlertCircle size={16} />
                        <span>ミス！</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>

              {/* 仮想キーボード（ON設定時のみ表示） */}
              {settings.showKeyboard && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <VirtualKeyboard nextKeys={nextAllowedKeys} lastKeyTyped={lastKeyTyped} />
                </motion.div>
              )}

            </motion.div>
          )}

          {/* GAMEOVER SCREEN */}
          {screen === 'gameover' && (
            <motion.div
              id="gameover-screen"
              key="gameover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center py-3 sm:py-4 px-4"
            >
              
              {/* 大きなゲームオーバーロゴ */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-b from-rose-500 to-fuchsia-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.4)] mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">👾</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight mb-1 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                ゲームオーバー
              </h2>
              
              <p className="text-rose-400 font-bold text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-1 justify-center">
                <AlertCircle size={14} />
                {gameOverReason === 'lives' 
                  ? 'ライフがなくなってしまいました。' 
                  : '時間切れになってしまいました。'
                }
              </p>

              {/* スコア・結果カード */}
              <div id="results-card" className="w-full max-w-sm bg-stone-900 rounded-2xl p-4 sm:p-5 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)] mb-4 sm:mb-5 flex flex-col items-center">
                <span className="text-xs font-bold text-cyan-500 tracking-wider block mb-1">今回の成績 ({difficulty})</span>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400">
                    <Trophy size={16} />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-100">
                    {score} <span className="text-sm font-medium text-stone-400">点</span>
                  </span>
                </div>

                {/* 応援の一言メッセージ */}
                <p className="text-stone-400 text-xs leading-relaxed max-w-xs">
                  {score >= 10 
                    ? 'すごい！とっても素晴らしいタイピングでした！この調子でさらに上を目指してみましょう！' 
                    : 'お疲れ様でした！もう少しでハイスコアです。焦らずリズム良くキーを打ってみましょう。'
                  }
                </p>
              </div>

              {/* リトライ＆ホームボタン */}
              <div id="gameover-buttons" className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm">
                
                <button
                  id="retry-game-btn"
                  onClick={() => startGame(difficulty)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-stone-950 font-black py-2 sm:py-2.5 px-4 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw size={16} />
                  もう一度遊ぶ
                </button>

                <button
                  id="go-home-btn"
                  onClick={() => setScreen('title')}
                  className="flex-1 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-200 font-bold py-2 sm:py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Home size={16} />
                  タイトルへ
                </button>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 画面下部：おまけフッター */}
      <footer id="app-footer" className="w-full max-w-4xl mx-auto text-center py-4 border-t border-stone-850 text-stone-500 text-[10px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 スピードタイピング. All Rights Reserved.</span>
        <div className="flex items-center gap-3">
          <span>高速タイピング練習！</span>
          <span>•</span>
          <span>いつでもサウンド/キーボードをON/OFF可能</span>
        </div>
      </footer>

    </div>
  );
}
