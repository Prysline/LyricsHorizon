export interface ParsedContent {
  type: 'text' | 'html' | 'furigana' | 'special';
  content: string;
  furigana?: string;
  isModified?: boolean;
}