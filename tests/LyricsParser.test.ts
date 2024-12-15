import { describe, it, expect } from 'vitest';
import { LyricsParser } from '../src/components/LyricsParser';

describe('LyricsParser', () => {
  describe('parse method', () => {
    it('解析 Furigana 文本', () => {
      const input = `---
title: Test Song
---
豪雨(ごうう)で崩れた`;

      const result = LyricsParser.parse(input);

      expect(result.length).toBe(1);
      expect(result[0][0].type).toBe('furigana');
      expect(result[0][0].content).toBe('豪雨');
      expect(result[0][0].furigana).toBe('ごうう');
      expect(result[0][1].type).toBe('text');
      expect(result[0][1].content).toBe('で崩れた');
    });
    it('解析進階 Furigana 文本', () => {
      const input = `---
title: Test Song
---
{{遠い故郷への名残がある受験生の願い。:The wish of an examinee with vestiges of a distant hometown.}}`;

      const result = LyricsParser.parse(input);

      expect(result.length).toBe(1);
      expect(result[0][0].type).toBe('furigana');
      expect(result[0][0].content).toBe('遠い故郷への名残がある受験生の願い。');
      expect(result[0][0].furigana).toBe('The wish of an examinee with vestiges of a distant hometown.');
    });
    it('解析 HTML 標記', () => {
      const input = `---
title: Test Song
---
<div class="verse">歌詞</div>`;

      const result = LyricsParser.parse(input);

      expect(result.length).toBe(1);
      expect(result[0][0].type).toBe('html');
      expect(result[0][0].content).toBe('<div class="verse">歌詞</div>');
    });

    it('解析版本標記', () => {
      const input = `---
title: Test Song
---
再び__{{《遠縁の養父母》:かぞく}}__`;

      const result = LyricsParser.parse(input);

      expect(result.length).toBe(1);
      expect(result[0][1].type).toBe('special');
      expect(result[0][1].content).toBe('《遠縁の養父母》');
      expect(result[0][1].furigana).toBe('かぞく');
      expect(result[0][1].isModified).toBe(true);
    });

    it('混合型', () => {
      const input = `---
title: Test Song
---
————豪雨(ごうう)で崩れた　土砂(どしゃ)に呑まれて
再び__{{《遠縁の養父母》:かぞく}}__を喪(うしな)った`;

      const result = LyricsParser.parse(input);

      expect(result.length).toBe(2);
      expect(result[1][1].type).toBe('special');
      expect(result[1][1].content).toBe('《遠縁の養父母》');
      expect(result[1][1].furigana).toBe('かぞく');
      expect(result[1][1].isModified).toBe(true);
      expect(result[1][3].type).toBe('furigana');
      expect(result[1][3].content).toBe('喪');
      expect(result[1][3].furigana).toBe('うしな');
    });
  });
});

