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
  const [flashRed, setFlashRed] = useState(false);

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
      if (screen !== 'playing' || !engine || isWordCorrectEffect) return;

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
        setTimeout(() => setFlashRed(false), 200);

        // ライフ減少
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            triggerGameOver('lives');
            return 0;
          } else {
            // ミスをしたら即座に次のお題に進む
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
  }, [screen, engine, isWordCorrectEffect, settings.soundEnabled]);

  // 滑らかなプログレスバー用のタイマー
  useEffect(() => {
    if (screen !== 'playing' || isWordCorrectEffect) return;

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
  }, [screen, currentWord, isWordCorrectEffect]);

  // ゲームを新規開始
  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setLives(3);
    
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
    }, 400); // 優しい次の単語への遷移時間
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
      setTimeout(() => setFlashRed(false), 200);

      setLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          triggerGameOver('lives');
          return 0;
        } else {
          // 次の単語へ移行
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
    <div className="h-screen w-full bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 text-stone-800 flex flex-col justify-between p-3 sm:p-4 font-sans antialiased overflow-hidden selection:bg-amber-200">
      
      {/* 画面上部：共通のシンプルなヘッダー */}
      <header id="app-header" className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-orange-100/60">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🌸</span>
          <h1 className="font-sans font-bold tracking-tight text-stone-700 text-sm sm:text-base">スピード耐久タイピング</h1>
        </div>
        
        {/* 常時変更可能なサウンド・キーボードトグル (タイトル、プレイ中問わず優しく表示) */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-sound-btn"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              settings.soundEnabled 
                ? 'bg-amber-100/80 border-amber-200 text-amber-700' 
                : 'bg-stone-100 border-stone-200 text-stone-400'
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
                ? 'bg-amber-100/80 border-amber-200 text-amber-700' 
                : 'bg-stone-100 border-stone-200 text-stone-400'
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
                className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-200 to-rose-200 rounded-full flex items-center justify-center shadow-md mb-3 sm:mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <span className="text-3xl sm:text-4xl">🐱</span>
              </motion.div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-600 to-rose-500 tracking-tight mb-1">
                スピード耐久タイピング
              </h2>
              <p className="text-stone-500 text-xs sm:text-sm max-w-md mb-3 sm:mb-4 leading-relaxed font-medium">
                高速タイピングを練習するためのゲームです。<br />ミスなく正確に早くタイピングしましょう。
              </p>

              {/* クイックガイドオプションカード */}
              <div id="option-settings-card" className="w-full max-w-md bg-white/70 backdrop-blur-xs rounded-xl p-3 border border-orange-100/80 shadow-xs mb-4 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1 justify-center">
                  <Sparkles size={14} /> ゲーム開始前のおすすめ設定
                </span>
                
                <div className="flex justify-around gap-2 mt-1">
                  <button 
                    id="setup-toggle-kbd"
                    onClick={toggleKeyboard}
                    className={`flex-1 py-2 px-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      settings.showKeyboard 
                        ? 'bg-amber-100/60 border-amber-200 text-amber-800 font-semibold' 
                        : 'bg-white border-stone-200 text-stone-500'
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
                        ? 'bg-amber-100/60 border-amber-200 text-amber-800 font-semibold' 
                        : 'bg-white border-stone-200 text-stone-500'
                    }`}
                  >
                    {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span className="text-xs">サウンド効果: {settings.soundEnabled ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* 難易度選択スタートボタン (3つの難易度) */}
              <div id="difficulty-selection-container" className="w-full max-w-lg">
                <p className="text-xs font-bold text-stone-400 mb-2 tracking-widest uppercase">遊ぶ難易度を選んでスタート</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  
                  {/* EASY */}
                  <button
                    id="start-easy-btn"
                    onClick={() => startGame('Easy')}
                    className="group relative bg-linear-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-white font-bold py-2 px-4 rounded-xl shadow-xs hover:shadow-sm hover:shadow-emerald-100 transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Easy</span>
                    <span className="text-[11px] font-medium opacity-90">4文字以下の単語</span>
                    <span className="text-[9px] bg-emerald-600/30 px-1.5 py-0.5 rounded-full mt-0.5">ミスしても次へ</span>
                  </button>

                  {/* NORMAL */}
                  <button
                    id="start-normal-btn"
                    onClick={() => startGame('Normal')}
                    className="group relative bg-linear-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white font-bold py-2 px-4 rounded-xl shadow-xs hover:shadow-sm hover:shadow-amber-100 transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Normal</span>
                    <span className="text-[11px] font-medium opacity-90">5〜9文字の単語</span>
                    <span className="text-[9px] bg-amber-600/30 px-1.5 py-0.5 rounded-full mt-0.5">ミスしても次へ</span>
                  </button>

                  {/* HARD */}
                  <button
                    id="start-hard-btn"
                    onClick={() => startGame('Hard')}
                    className="group relative bg-linear-to-b from-rose-400 to-rose-500 hover:from-rose-300 hover:to-rose-400 text-white font-bold py-2 px-4 rounded-xl shadow-xs hover:shadow-sm hover:shadow-rose-100 transition-all flex flex-col items-center gap-0.5"
                  >
                    <span className="text-base">Hard</span>
                    <span className="text-[11px] font-medium opacity-90">10文字以上の単語</span>
                    <span className="text-[9px] bg-rose-600/30 px-1.5 py-0.5 rounded-full mt-0.5 text-rose-100">時間切れで即終了</span>
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
              className="flex flex-col gap-3.5 sm:gap-4.5"
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
              <div id="playing-status-row" className="flex items-center justify-between bg-white/60 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-orange-100/50 shadow-xs">
                
                {/* 左：現在のスコア */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] font-bold block uppercase tracking-wider">スコア</span>
                    <span className="text-lg font-black text-stone-700">{score} <span className="text-xs font-normal text-stone-500">点</span></span>
                  </div>
                </div>

                {/* 中央：難易度バッジ */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  difficulty === 'Easy' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : difficulty === 'Normal'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {difficulty} モード
                </span>

                {/* 右：ライフハートマーク */}
                <div className="flex flex-col items-end">
                  <span className="text-stone-400 text-[10px] font-bold block uppercase tracking-wider mb-0.5">ライフ</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(heartId => (
                      <Heart 
                        key={heartId}
                        size={20}
                        className={`transition-colors duration-300 ${
                          heartId <= lives 
                            ? 'fill-rose-500 text-rose-500 animate-pulse' 
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
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
                  relative bg-white rounded-2xl p-4.5 sm:p-7 border border-orange-100/80 shadow-md flex flex-col items-center justify-center text-center overflow-hidden
                  ${isWordCorrectEffect ? 'border-emerald-300 bg-emerald-50/20' : ''}
                `}
              >
                {/* 制限時間バー */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-stone-100">
                  <motion.div
                    id="timer-progress-bar"
                    className={`h-full ${
                      timeLeft / totalTimeForWord < 0.3 
                        ? 'bg-rose-500' 
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${(timeLeft / totalTimeForWord) * 100}%` }}
                  />
                </div>

                {/* タイマー数値表示 (マイルド) */}
                <span className="absolute top-2.5 right-4 font-mono text-xs text-stone-400 font-bold">
                  {Math.max(0, timeLeft).toFixed(1)}s
                </span>

                {/* 漢字表記＋上部にふりがな（小さめ） */}
                <div className="flex flex-col items-center mb-3 sm:mb-4">
                  {/* ふりがな（ルビ風） */}
                  <span className="text-amber-600 font-extrabold tracking-wider text-xs sm:text-sm mb-0.5">
                    {currentWord.kana}
                  </span>
                  {/* メインの漢字 */}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-800 tracking-wide">
                    {currentWord.kanji}
                  </h3>
                </div>

                {/* ローマ字タイピング列（入力済み vs 未入力 の色分け） */}
                <div className="flex flex-wrap justify-center font-mono text-lg sm:text-xl md:text-2xl tracking-wide font-extrabold bg-stone-50/70 border border-stone-100 px-4 py-2.5 rounded-xl w-full max-w-lg mb-1">
                  <span className="text-emerald-500 transition-colors duration-150">
                    {typedString}
                  </span>
                  <span className="text-stone-400 relative">
                    {remainingString}
                    {/* カーソル演出 */}
                    <span className="absolute -top-1 bottom-1 w-0.5 bg-amber-500 animate-pulse ml-0.5" />
                  </span>
                </div>

                {/* 日本語入力チェックアラート */}
                <div className="flex items-center gap-1.5 text-stone-400 text-[10px] sm:text-xs mt-1.5 bg-stone-50/50 px-2.5 py-1 rounded-full border border-stone-100">
                  <AlertCircle size={12} className="text-amber-500" />
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
                      <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-md">
                        <CheckCircle2 size={16} />
                        <span>正解！</span>
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

              {/* 中断してタイトルに戻るボタン */}
              <button
                id="quit-to-title-btn"
                onClick={() => setScreen('title')}
                className="text-stone-400 hover:text-stone-600 text-xs font-semibold self-center flex items-center gap-1 mt-2 border border-stone-200/60 bg-white/40 px-3 py-1.5 rounded-lg hover:bg-white/90 transition-all"
              >
                <Home size={12} />
                タイトルに戻る
              </button>

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
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-b from-stone-400 to-stone-500 rounded-full flex items-center justify-center shadow-md mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🏁</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-700 tracking-tight mb-1">
                ゲームオーバー
              </h2>
              
              <p className="text-rose-500 font-bold text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-1">
                <AlertCircle size={14} />
                {gameOverReason === 'lives' 
                  ? 'ライフがなくなってしまいました。' 
                  : '時間切れになってしまいました。'
                }
              </p>

              {/* スコア・結果カード */}
              <div id="results-card" className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 border border-orange-100 shadow-sm mb-4 sm:mb-5 flex flex-col items-center">
                <span className="text-xs font-bold text-stone-400 tracking-wider block mb-1">今回の成績 ({difficulty})</span>
                
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                    <Trophy size={16} />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-700">
                    {score} <span className="text-sm font-medium text-stone-500">点</span>
                  </span>
                </div>

                {/* 応援の一言メッセージ */}
                <p className="text-stone-500 text-xs leading-relaxed max-w-xs">
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
                  className="flex-1 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white font-bold py-2 sm:py-2.5 px-4 rounded-xl shadow-xs hover:shadow-sm hover:shadow-amber-100 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RotateCcw size={16} />
                  もう一度遊ぶ
                </button>

                <button
                  id="go-home-btn"
                  onClick={() => setScreen('title')}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 border border-stone-200/80 text-stone-700 font-bold py-2 sm:py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
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
      <footer id="app-footer" className="w-full max-w-4xl mx-auto text-center py-4 border-t border-orange-100/30 text-stone-400 text-[10px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 サバイバルタイピング. All Rights Reserved.</span>
        <div className="flex items-center gap-3">
          <span>タイピング初心者歓迎！</span>
          <span>•</span>
          <span>いつでもサウンド/キーボードをON/OFF可能</span>
        </div>
      </footer>

    </div>
  );
}
