export type Difficulty = 'Easy' | 'Normal' | 'Hard';

export interface Word {
  kanji: string;      // 漢字表記 (例: "林檎")
  kana: string;       // ひらがな表記 (例: "りんご")
}

export interface GameSettings {
  showKeyboard: boolean;
  soundEnabled: boolean;
}

export interface GameState {
  screen: 'title' | 'playing' | 'gameover';
  difficulty: Difficulty;
  settings: GameSettings;
  score: number;
  lives: number;
  currentWord: Word;
  currentRomanInput: string;   // プレイヤーがこれまで正しく入力した現在の単語内のローマ字
  currentRomanTarget: string;  // 現在の入力パターンで期待されるローマ字全文字列
  currentRomanRemaining: string; // 未入力のローマ字全文字列
  nextAllowedKeys: string[];   // 次に入力可能なキーのリスト (複数経路対応)
  wordIndex: number;
  timeLeft: number;
  totalTimeForWord: number;
}
