// 定義歌詞的 Frontmatter 介面
interface LyricsFrontmatter {
  title: string;
  vocal?: string;
  album?: string;
}

// 定義歌詞段落的型別
interface LyricsSegment {
  type: 'text' | 'furigana' | 'html' | 'special';
  content: string;
  furigana?: string;
  style?: Record<string, string>;
}

// 完整歌詞介面
interface LyricsContent {
  frontmatter: LyricsFrontmatter;
  prologueText?: string[];
  segments: LyricsSegment[][];
}