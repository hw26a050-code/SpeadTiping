import { Word } from './types';

export const EASY_WORDS: Word[] = [
  { kanji: '猫', kana: 'ねこ' },              // 2文字
  { kanji: '犬', kana: 'いぬ' },              // 2
  { kanji: '海', kana: 'うみ' },              // 2
  { kanji: '空', kana: 'そら' },              // 2
  { kanji: '桜', kana: 'さくら' },            // 3
  { kanji: '林檎', kana: 'りんご' },          // 3
  { kanji: '蜜柑', kana: 'みかん' },          // 3
  { kanji: '机', kana: 'つくえ' },            // 3
  { kanji: '椅子', kana: 'いす' },            // 2
  { kanji: 'お茶', kana: 'おちゃ' },          // 3
  { kanji: '時計', kana: 'とけい' },          // 3
  { kanji: '風', kana: 'かぜ' },              // 2
  { kanji: '雨', kana: 'あめ' },              // 2
  { kanji: '森', kana: 'もり' },              // 2
  { kanji: '鳥', kana: 'とり' },              // 2
  { kanji: '魚', kana: 'さかな' },            // 3
  { kanji: '車', kana: 'くるま' },            // 3
  { kanji: '電車', kana: 'でんしゃ' },        // 4
  { kanji: '本', kana: 'ほん' },              // 2
  { kanji: '星', kana: 'ほし' },              // 2
  { kanji: '川', kana: 'かわ' },              // 2
  { kanji: '駅', kana: 'えき' },              // 2
  { kanji: '紙', kana: 'かみ' },              // 2
  { kanji: '冬', kana: 'ふゆ' },              // 2
  { kanji: '夏', kana: 'なつ' },              // 2
];

export const NORMAL_WORDS: Word[] = [
  { kanji: '自転車', kana: 'じてんしゃ' },    // 5文字
  { kanji: '新幹線', kana: 'しんかんせん' },  // 6
  { kanji: '冷蔵庫', kana: 'れいぞうこ' },    // 5
  { kanji: '洗濯機', kana: 'せんたくき' },    // 5
  { kanji: '温度計', kana: 'おんどけい' },    // 5
  { kanji: '富士山', kana: 'ふじさん' },      // 5
  { kanji: '図書館', kana: 'としょかん' },    // 5
  { kanji: '郵便局', kana: 'ゆうびんきょく' }, // 6
  { kanji: '動物園', kana: 'どうぶつえん' },  // 6
  { kanji: '水族館', kana: 'すいぞくかん' },  // 6
  { kanji: '北海道', kana: 'ほっかいどう' },  // 6
  { kanji: '飛行船', kana: 'ひこうせん' },    // 5
  { kanji: '教科書', kana: 'きょうかしょ' },  // 6
  { kanji: 'お好み焼き', kana: 'おこのみやき' }, // 6
  { kanji: 'ひまわり', kana: 'ひまわり' },    // 4文字だが、分類上Normalに近い長さとして少し追加
  { kanji: '朝顔', kana: 'あさがお' },        // 4
  { kanji: '東京駅', kana: 'とうきょうえき' }, // 7
  { kanji: '遊園地', kana: 'ゆうえんち' },    // 5
  { kanji: '映画館', kana: 'えいがかん' },    // 5
  { kanji: '博物館', kana: 'はくぶつかん' },  // 6
  { kanji: '携帯電話', kana: 'けいたいでんわ' }, // 8
  { kanji: '自動ドア', kana: 'じどうどあ' },   // 5
  { kanji: '信号機', kana: 'しんごうき' },    // 5
];

export const HARD_WORDS: Word[] = [
  { kanji: '個人情報保護方針', kana: 'こじんじょうほうほごほうしん' }, // 13文字
  { kanji: '地球温暖化対策', kana: 'ちきゅうおんだんかたいさく' },     // 12
  { kanji: '携帯情報端末', kana: 'けいたいじょうほうたんまつ' },       // 11
  { kanji: '新幹線鉄道事業', kana: 'しんかんせんてつどうじぎょう' },   // 13
  { kanji: '日本国際博覧会', kana: 'にほんこくさいはくらんかい' },     // 12
  { kanji: '人工知能開発者', kana: 'じんこうちのうかいはつしゃ' },     // 11
  { kanji: '環境破壊防止活動', kana: 'かんきょうはかいぼうしかつどう' }, // 13
  { kanji: '非常口誘導灯', kana: 'ひじょうぐちゆうどうとう' },         // 10
  { kanji: '音声認識装置', kana: 'おんせいにんしきそうち' },           // 10
  { kanji: '自然災害避難所', kana: 'しぜんさいがいひなんじょ' },       // 10
  { kanji: '宇宙飛行士訓練', kana: 'うちゅうひこうしくんれん' },       // 11
  { kanji: '国際宇宙ステーション', kana: 'こくさいうちゅうすてーしょん' }, // 13
  { kanji: '情報処理安全確保支援士', kana: 'じょうほうしょりあんぜんかくほしえんし' }, // 19
  { kanji: '都道府県労働局', kana: 'とどうふけんろうどうきょく' },     // 12
  { kanji: '確定申告書作成', kana: 'かくていしんこくしょさくせい' },   // 12
];
