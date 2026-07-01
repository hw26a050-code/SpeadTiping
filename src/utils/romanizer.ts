const KANA_ROMAN_MAP: Record<string, string[]> = {
  'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu'], 'え': ['e', 'ye'], 'お': ['o'],
  'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
  'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
  'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
  'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  'わ': ['wa'], 'を': ['wo'], 'ん': ['nn'], // ん
  
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di', 'ji'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],

  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
  'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
  'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
  'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
  'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
  'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
  'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
  'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],

  'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'],
  'でぃ': ['dhi', 'di'], 'どぅ': ['dwu'],
  'てぃ': ['thi'], 'とぅ': ['twu'],

  'ぁ': ['la', 'xa'], 'ぃ': ['li', 'xi'], 'ぅ': ['lu', 'xu'], 'ぇ': ['le', 'xe'], 'ぉ': ['lo', 'xo'],
  'ゃ': ['lya', 'xya'], 'ゅ': ['lyu', 'xyu'], 'ょ': ['lyo', 'xyo'],
  'っ': ['ltu', 'xtu', 'ltsu'], 
  'ー': ['-'],
};

/**
 * ひらがな文字列をタイピングのセグメント（音節単位）に分割する
 */
export function segmentKana(kana: string): string[] {
  const segments: string[] = [];
  let i = 0;
  while (i < kana.length) {
    // 2文字の拗音（「きゃ」など）を優先
    if (i + 1 < kana.length) {
      const char2 = kana.slice(i, i + 2);
      if (KANA_ROMAN_MAP[char2]) {
        segments.push(char2);
        i += 2;
        continue;
      }
    }
    
    // 促音「っ」の処理：次が単一の文字または拗音の場合、連結させて1つのセグメントにする
    if (kana[i] === 'っ' && i + 1 < kana.length) {
      let nextKana = kana[i + 1];
      let len = 1;
      if (i + 2 < kana.length) {
        const testNext2 = kana.slice(i + 1, i + 3);
        if (KANA_ROMAN_MAP[testNext2]) {
          nextKana = testNext2;
          len = 2;
        }
      }
      
      const combinedSeg = 'っ' + nextKana;
      segments.push(combinedSeg);
      i += 1 + len;
      continue;
    }

    segments.push(kana[i]);
    i += 1;
  }
  return segments;
}

/**
 * 特定のセグメントが許容するすべてのローマ字パターンを返す
 */
export function getSegmentRomans(seg: string): string[] {
  if (KANA_ROMAN_MAP[seg]) {
    return KANA_ROMAN_MAP[seg];
  }
  
  // 促音「っ」＋次の音（例: "っこ", "っしゃ"）
  if (seg.startsWith('っ') && seg.length > 1) {
    const nextKana = seg.slice(1);
    const nextRomans = KANA_ROMAN_MAP[nextKana] || getSegmentRomans(nextKana);
    
    const doubleConsonants = nextRomans
      .map(r => r[0] + r)
      // 母音(a,e,i,o,u)やyで始まらない子音のみ2回重ねることが可能
      .filter(r => !/^[aeiouy]/.test(r));

    const xtuPatterns = nextRomans.map(r => 'xtu' + r);
    const ltuPatterns = nextRomans.map(r => 'ltu' + r);
    const ltsuPatterns = nextRomans.map(r => 'ltsu' + r);

    return [...doubleConsonants, ...xtuPatterns, ...ltuPatterns, ...ltsuPatterns];
  }
  
  return [seg]; // フォールバック
}

/**
 * プレイヤーの入力状態をトラッキングするエンジン
 */
export class TypingEngine {
  private segments: string[] = [];
  private segmentRomans: string[][] = [];
  private currentSegmentIndex = 0;
  private currentSegmentTyped = ''; // 現在のセグメント内で正しく打たれた文字
  
  constructor(kana: string) {
    this.segments = segmentKana(kana);
    this.segmentRomans = this.segments.map(seg => getSegmentRomans(seg));
  }

  /**
   * 現在のセグメント一覧を取得
   */
  getSegments(): string[] {
    return this.segments;
  }

  /**
   * 現在どのセグメントに入力中か
   */
  getCurrentSegmentIndex(): number {
    return this.currentSegmentIndex;
  }

  /**
   * これまでに完全に入力が完了したローマ字 + 現在のセグメントで入力されたローマ字を返す
   */
  getTypedRomaji(): string {
    let completed = '';
    for (let i = 0; i < this.currentSegmentIndex; i++) {
      // 各完了したセグメントの、最初のローマ字表現を採用（標準表示用）
      completed += this.segmentRomans[i][0];
    }
    return completed + this.currentSegmentTyped;
  }

  /**
   * まだ入力していない残りのローマ字（目安のデフォルト表示用）
   */
  getRemainingRomaji(): string {
    if (this.currentSegmentIndex >= this.segments.length) {
      return '';
    }
    
    // 現在のセグメントの、マッチする可能性のあるローマ字候補のうち最も短いものの残りを表示
    const currentCandidates = this.segmentRomans[this.currentSegmentIndex];
    const validCurrentCandidates = currentCandidates.filter(r => r.startsWith(this.currentSegmentTyped));
    const activeCandidate = validCurrentCandidates[0] || currentCandidates[0];
    const currentRemaining = activeCandidate.slice(this.currentSegmentTyped.length);
    
    let remainingTail = '';
    for (let i = this.currentSegmentIndex + 1; i < this.segments.length; i++) {
      remainingTail += this.segmentRomans[i][0];
    }
    
    return currentRemaining + remainingTail;
  }

  /**
   * 出題されている単語のデフォルトのローマ字全文字列を取得
   */
  getTargetRomaji(): string {
    return this.segmentRomans.map(r => r[0]).join('');
  }

  /**
   * 次に入力可能な一文字（キー）を配列で返す（キーハイライトガイド用）
   */
  getNextAllowedKeys(): string[] {
    if (this.currentSegmentIndex >= this.segments.length) {
      return [];
    }

    const candidates = this.segmentRomans[this.currentSegmentIndex];
    // 現在入力されている文字列で始まるローマ字パターンの、次の文字を収集する
    const allowed = new Set<string>();
    
    for (const r of candidates) {
      if (r.startsWith(this.currentSegmentTyped)) {
        const nextChar = r[this.currentSegmentTyped.length];
        if (nextChar) {
          allowed.add(nextChar);
        }
      }
    }
    
    return Array.from(allowed);
  }

  /**
   * 1キー入力時の判定処理。
   * @param key 入力されたキー（1文字）
   * @returns 正解ならtrue、不正解ならfalse
   */
  inputKey(key: string): boolean {
    if (this.currentSegmentIndex >= this.segments.length) {
      return false;
    }

    const keyLower = key.toLowerCase();
    const allowed = this.getNextAllowedKeys();

    if (!allowed.includes(keyLower)) {
      return false; // タイポ
    }

    // 正解キーを適用
    const nextTyped = this.currentSegmentTyped + keyLower;
    
    // 現在のセグメントの候補の中で、完全に一致するパターンがあるか確認
    const candidates = this.segmentRomans[this.currentSegmentIndex];
    const isCompleted = candidates.some(r => r === nextTyped);

    if (isCompleted) {
      // セグメント完了、次に進む
      this.currentSegmentIndex++;
      this.currentSegmentTyped = '';
    } else {
      // 途中マッチ
      this.currentSegmentTyped = nextTyped;
    }

    return true;
  }

  /**
   * すべての入力が完了したか
   */
  isFinished(): boolean {
    return this.currentSegmentIndex >= this.segments.length;
  }
}
