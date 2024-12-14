interface ParsedContent {
  type: 'text' | 'html' | 'furigana';
  content: string;
  furigana?: string;
  isModified?: boolean;
}

export class LyricsParser {
  private static readonly FURIGANA_REGEX = /(\p{Script=Han}+)\((\p{Script=Hiragana}+)\)/gu;
    private static readonly ADVANCED_REGEX = /(?<!_){{([^{}]+):([^{}]+)}}/g;
  private static readonly VERSION_REGEX = /__{{([^:]+):([^}]+)}}__/g;

  /**
   * 解析完整文檔內容
   * @param content 完整文檔內容
   * @returns 解析後的內容陣列
   */
  public static parse(content: string): ParsedContent[][] {
    // 分離 Frontmatter
    const [frontmatter, ...contentLines] = content.split('---').slice(1);
    const mainContent = contentLines.join('---').trim();

    // 解析內容行
    return this.parseContent(mainContent);
  }

  /**
   * 解析內容
   * @param content 主要內容
   * @returns 解析後的內容陣列
   */
  private static parseContent(content: string): ParsedContent[][] {
    return content.split('\n').map(line => {
      // 偵測並處理 HTML 標記
      const htmlMatch = line.match(/<[^>]+>.*<\/[^>]+>|<[^>]+\/>/);
      if (htmlMatch) {
        return [{
          type: 'html'as const,
          content: line.trim()
        }];
      }

      // 處理一般文本和平假名標記
      return this.parseLine(line);
    }).filter(line => line.length > 0);
  }

  /**
   * 解析單行文本
   * @param line 待解析的文本行
   * @returns 解析後的內容陣列
   */
  private static parseLine(line: string): ParsedContent[] {
    const parsedContents: ParsedContent[] = [];
    let lastIndex = 0;

    // 內部方法：處理不同類型的標記
    const handleMarkers = (regex: RegExp, options: { isVersion?: boolean } = {}) => {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const [fullMatch, main, additional] = match;

        // 添加未匹配的前置文本
        if (match.index > lastIndex) {
          parsedContents.push({
            type: 'text',
            content: line.slice(lastIndex, match.index)
          });
        }

        const isModified = options.isVersion === true;

        parsedContents.push({
          type: 'furigana',
          content: main,
          furigana: additional,
          isModified: isModified || false
        });

        lastIndex = match.index + fullMatch.length;
      }
    };

    // 依序處理不同類型的標記
    handleMarkers(this.FURIGANA_REGEX);
    handleMarkers(this.ADVANCED_REGEX);
    handleMarkers(this.VERSION_REGEX, { isVersion: true });

    // 添加剩餘文本
    if (lastIndex < line.length) {
      parsedContents.push({
        type: 'text',
        content: line.slice(lastIndex)
      });
    }

    return parsedContents;
  }
}
