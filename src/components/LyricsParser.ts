import { lyricsElementType, type ParsedLyricsElement } from '@/types/lyrics'

enum matchType {
  VERSION = 'version',
  ADVANCED = 'advanced',
  NORMAL = 'normal',
}

interface Match {
  index: number
  length: number
  content: string
  furigana: string
  type: matchType
  matchString: string
}

interface MatchCondition {
  type: matchType
  regex: RegExp
}

export class LyricsParser {
  private static readonly MATCH_CONDITIONS: MatchCondition[] = [
    { type: matchType.VERSION, regex: /__\{\{([^:]+):([^}]+)\}\}__/g },
    { type: matchType.ADVANCED, regex: /\{\{((?=[^{}:]+:)[^{}:]{1,50}):([^{}:]{1,50})\}\}/g },
    {
      type: matchType.NORMAL,
      regex: /(\p{Script=Han}+)\(([\p{Script=Hiragana}\p{Script=Katakana}]+)\)/gu,
    },
  ]

  /**
   * 解析完整文檔內容
   * @param content 完整文檔內容
   * @returns 解析後的內容陣列
   */
  public static parse(content: string): ParsedLyricsElement[][] {
    const mainContent = content
      .trim()
      .replace(/^---[\s\S]*?---/, '')
      .trim()
    const lines = mainContent.split('\n')
    const result: ParsedLyricsElement[][] = []
    let htmlBlock = ''
    let inHtmlBlock = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // 檢查 HTML 區塊開始
      if (/<[^>]+>/.test(trimmedLine) && !inHtmlBlock) {
        inHtmlBlock = true
        htmlBlock = line
        // 如果是單行 HTML
        if (LyricsParser.countTags(line)) {
          result.push([{ type: lyricsElementType.HTML, content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // 在 HTML 區塊內
      if (inHtmlBlock) {
        htmlBlock += `\n${line}`
        if (line.includes('</div>')) {
          result.push([{ type: lyricsElementType.HTML, content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // 處理非 HTML 的一般行
      if (line.trim() === '') {
        result.push([{ type: lyricsElementType.HTML, content: '<br>' }])
      }
      else {
        result.push([...this.parseLine(line), { type: lyricsElementType.HTML, content: '<br>' }])
      }
    }
    return result
  }

  private static countTags(text: string): boolean {
    const openTags = text.match(/<[^/][^>]*>/g) ?? []
    const closeTags = text.match(/<\/[^>]+>/g) ?? []
    return openTags.length === closeTags.length
  }

  private static parseNestedContent(content: string): ParsedLyricsElement[] {
    // 先檢查內容是否包含需要解析的標記
    const hasSpecialMarks
      = new RegExp(this.MATCH_CONDITIONS[0].regex).test(content)
      || new RegExp(this.MATCH_CONDITIONS[1].regex).test(content)
      || new RegExp(this.MATCH_CONDITIONS[2].regex).test(content)

    if (!hasSpecialMarks) {
      return []
    }

    return this.parseLine(content)
  }

  private static findMatches(currentLine: string, regex: RegExp, type: Match['type']): Match[] {
    const matches: Match[] = []
    let match: RegExpExecArray | null = regex.exec(currentLine)
    while (match !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        content: match[1],
        furigana: match[2],
        type,
        matchString: match[0],
      })
      match = regex.exec(currentLine)
    }
    return matches
  }

  private static collectMatches(currentLine: string, conditions: MatchCondition[]) {
    const matches: Match[] = []
    conditions.forEach((condition) => {
      matches.push(...this.findMatches(currentLine, condition.regex, condition.type))
    })
    return matches
  }

  private static sortMatches(matches: Match[]): Match[] {
    return matches.sort((a, b) => a.index - b.index)
  }

  /**
   * 解析單行文本
   * @param line 待解析的文本行
   * @returns 解析後的內容陣列
   */
  private static parseLine(line: string): ParsedLyricsElement[] {
    const parsedContents: ParsedLyricsElement[] = []
    const currentLine = line
    let lastIndex = 0

    // 收集所有匹配並根據位置排序
    const matches = this.sortMatches(this.collectMatches(currentLine, this.MATCH_CONDITIONS))

    // 檢查重疊並移除被包含的匹配
    const validMatches = matches.filter((match, index) => {
      for (let i = 0; i < matches.length; i++) {
        if (i !== index) {
          const other = matches[i]
          if (
            other.index <= match.index
            && other.index + other.length >= match.index + match.length
          ) {
            return false
          }
        }
      }
      return true
    })

    // 按順序處理匹配
    validMatches.forEach((match) => {
      if (match.index > lastIndex) {
        parsedContents.push({
          type: lyricsElementType.TEXT,
          content: currentLine.slice(lastIndex, match.index),
        })
      }

      // 檢查 furigana 是否需要進一步解析
      const nestedElements = this.parseNestedContent(match.furigana)

      parsedContents.push({
        type:
          match.type === matchType.VERSION ? lyricsElementType.SPECIAL : lyricsElementType.FURIGANA,
        content: match.content,
        furigana: match.furigana,
        nestedElements: nestedElements.length > 0 ? nestedElements : undefined,
        isModified: match.type === matchType.VERSION,
        isNested: nestedElements.length > 0,
      })

      lastIndex = match.index + match.length
    })

    // 處理剩餘文本
    if (lastIndex < currentLine.length) {
      parsedContents.push({
        type: lyricsElementType.TEXT,
        content: currentLine.slice(lastIndex),
      })
    }

    return parsedContents
  }
}
