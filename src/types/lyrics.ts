export interface ParsedContent {
  type: 'text' | 'html' | 'furigana';
  content: string;
  furigana?: string;
  isModified?: boolean;
}