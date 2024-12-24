import type { ParsedContent } from '@/types/lyrics'

export class LyricsParser {
  private static readonly FURIGANA_REGEX = /(\p{Script=Han}+)\((\p{Script=Hiragana}+)\)/gu
  private static readonly ADVANCED_REGEX = /\{\{([^{}]+):([^{}]+)\}\}/g
  private static readonly VERSION_REGEX = /__\{\{([^:]+):([^}]+)\}\}__/g

  /**
   * 解析完整文檔內容
   * @param content 完整文檔內容
   * @returns 解析後的內容陣列
   */
  public static parse(content: string): ParsedContent[][] {
    const mainContent = content
      .trim()
      .replace(/^---[\s\S]*?---/, '')
      .trim()
    const lines = mainContent.split('\n')
    const result: ParsedContent[][] = []
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
          result.push([{ type: 'html', content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // 在 HTML 區塊內
      if (inHtmlBlock) {
        htmlBlock += `\n${line}`
        if (line.includes('</div>')) {
          result.push([{ type: 'html', content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // 處理非 HTML 的一般行
      if (line.trim() === '') {
        result.push([{ type: 'html', content: '<br>' }])
      }
      else {
        result.push([...this.parseLine(line), { type: 'html', content: '<br>' }])
      }
    }
    // console.log(result)
    return result
  }

  private static countTags(text: string): boolean {
    const openTags = text.match(/<[^/][^>]*>/g) || []
    const closeTags = text.match(/<\/[^>]+>/g) || []
    return openTags.length === closeTags.length
  }

  /**
   * 解析單行文本
   * @param line 待解析的文本行
   * @returns 解析後的內容陣列
   */
  private static parseLine(line: string): ParsedContent[] {
    const parsedContents: ParsedContent[] = []
    const currentLine = line
    let lastIndex = 0

    // 收集匹配資訊
    interface Match {
      index: number
      length: number
      content: string
      furigana: string
      type: 'version' | 'advanced' | 'normal'
      matchString: string
    }

    const findMatches = (regex: RegExp, type: Match['type']): Match[] => {
      const matches: Match[] = []
      let match
      while ((match = regex.exec(currentLine)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: match[1],
          furigana: match[2],
          type,
          matchString: match[0],
        })
      }
      return matches
    }

    // 收集所有匹配並根據位置排序
    const matches = [
      ...findMatches(this.VERSION_REGEX, 'version'),
      ...findMatches(this.ADVANCED_REGEX, 'advanced'),
      ...findMatches(this.FURIGANA_REGEX, 'normal'),
    ].sort((a, b) => a.index - b.index)

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
          type: 'text',
          content: currentLine.slice(lastIndex, match.index),
        })
      }

      parsedContents.push({
        type: match.type === 'version' ? 'special' : 'furigana',
        content: match.content,
        furigana: match.furigana,
        isModified: match.type === 'version',
      })

      lastIndex = match.index + match.length
    })

    // 處理剩餘文本
    if (lastIndex < currentLine.length) {
      parsedContents.push({
        type: 'text',
        content: currentLine.slice(lastIndex),
      })
    }

    return parsedContents
  }
}
