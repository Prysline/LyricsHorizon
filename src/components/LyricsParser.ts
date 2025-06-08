import { lyricsElementType, type ParsedLyricsElement } from '@/types/lyrics'
import { getPronunciationsByArtist } from '@/data/pronunciations'

enum matchType {
  VERSION = 'version',
  ADVANCED = 'advanced',
  NORMAL = 'normal',
  FIXED = 'fixed',
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

/**
 * 歌詞解析器主類別
 * 
 * 功能範圍：
 * - 多層次標音格式解析（手動標音、進階標記、固定標音）
 * - 系列特定固定標音規則應用
 * - HTML 與純文字混合內容處理
 * - 巢狀標記結構支援
 * 
 * 解析優先序：手動標音 > 進階標記 > 固定標音規則
 */
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
   * 解析完整文檔內容為結構化歌詞元素
   * 
   * @param content 完整文檔內容，包含前置設定與歌詞主體
   * @param artistId 藝術家系列識別碼，用於載入對應固定標音規則
   * @returns 按行分組的解析後歌詞元素陣列
   * 
   * 處理流程：
   * 1. 移除文檔前置設定資訊（YAML front matter）
   * 2. 逐行解析歌詞內容
   * 3. 識別並處理 HTML 區塊
   * 4. 應用系列特定的固定標音規則
   */
  public static parse(content: string, artistId?: string): ParsedLyricsElement[][] {
    const mainContent = content
      .trim()
      .replace(/^---[\s\S]*?---/, '')
      .trim()
    const lines = mainContent.split('\n')
    const result: ParsedLyricsElement[][] = []
    let htmlBlock = ''
    let inHtmlBlock = false

    // 載入系列特定的固定標音規則
    const fixedPronunciations = artistId ? getPronunciationsByArtist(artistId) : {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // HTML 區塊處理邏輯
      if (/<[^>]+>/.test(trimmedLine) && !inHtmlBlock) {
        inHtmlBlock = true
        htmlBlock = line

        // 單行 HTML 標記檢測
        if (LyricsParser.countTags(line)) {
          result.push([{ type: lyricsElementType.HTML, content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // HTML 區塊延續處理
      if (inHtmlBlock) {
        htmlBlock += `\n${line}`
        if (line.includes('</div>')) {
          result.push([{ type: lyricsElementType.HTML, content: htmlBlock }])
          inHtmlBlock = false
          htmlBlock = ''
        }
        continue
      }

      // 一般歌詞行處理
      if (line.trim() === '') {
        result.push([{ type: lyricsElementType.HTML, content: '<br>' }])
      } else {
        result.push([
          ...this.parseLine(line, fixedPronunciations),
          { type: lyricsElementType.HTML, content: '<br>' }
        ])
      }
    }
    return result
  }

  /**
   * HTML 標記對稱性檢查
   * 判斷單行內容是否包含完整的開始與結束標記
   * 
   * @param text 待檢查的文字內容
   * @returns 布林值，表示標記是否對稱完整
   */
  private static countTags(text: string): boolean {
    const openTags = text.match(/<[^/][^>]*>/g) ?? []
    const closeTags = text.match(/<\/[^>]+>/g) ?? []
    return openTags.length === closeTags.length
  }

  /**
   * 巢狀內容遞迴解析
   * 處理標音內容中可能包含的進一步標記結構
   * 
   * @param content 待解析的巢狀內容
   * @returns 解析後的歌詞元素陣列
   * 
   * 註記：巢狀解析不適用固定標音規則，避免過度處理
   */
  private static parseNestedContent(content: string): ParsedLyricsElement[] {
    const hasSpecialMarks
      = new RegExp(this.MATCH_CONDITIONS[0].regex).test(content)
      || new RegExp(this.MATCH_CONDITIONS[1].regex).test(content)
      || new RegExp(this.MATCH_CONDITIONS[2].regex).test(content)

    if (!hasSpecialMarks) {
      return []
    }

    return this.parseLine(content, {}) // 巢狀內容不套用固定標音
  }

  /**
   * 正規表示式匹配結果收集
   * 
   * @param currentLine 當前處理行內容
   * @param regex 匹配規則表示式
   * @param type 匹配類型識別
   * @returns 匹配結果陣列
   */
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

  /**
   * 固定標音規則應用處理
   * 在無手動標音的詞彙上套用系列特定的固定標音
   * 
   * @param text 待處理文字內容
   * @param fixedPronunciations 固定標音規則對照表
   * @returns 固定標音匹配結果陣列
   * 
   * 處理策略：
   * - 使用詞邊界匹配，確保完整詞彙對應
   * - 支援大小寫敏感匹配，適應不同語言特性
   * - 避免與手動標音產生衝突覆蓋
   */
  private static applyFixedPronunciations(
    text: string,
    fixedPronunciations: Record<string, string>
  ): Match[] {
    const matches: Match[] = []

    for (const [word, pronunciation] of Object.entries(fixedPronunciations)) {
      // 使用全域搜尋，支援同行多次出現的詞彙
      const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'g')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: word,
          furigana: pronunciation,
          type: matchType.FIXED,
          matchString: word,
        })
      }
    }

    return matches
  }

  /**
   * 正規表示式特殊字元轉義處理
   * 確保詞彙內容作為字面值進行匹配
   * 
   * @param string 待轉義的字串
   * @returns 轉義後的字串
   */
  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 所有類型匹配結果統合收集
   * 
   * @param currentLine 當前處理行
   * @param conditions 標準匹配條件陣列
   * @param fixedPronunciations 固定標音規則
   * @returns 統合後的匹配結果陣列
   * 
   * 處理邏輯：
   * 1. 收集所有標準格式匹配（手動標音、進階標記等）
   * 2. 收集固定標音匹配
   * 3. 過濾重疊衝突，確保手動標音優先
   */
  private static collectMatches(
    currentLine: string,
    conditions: MatchCondition[],
    fixedPronunciations: Record<string, string>
  ): Match[] {
    const matches: Match[] = []

    // 收集標準格式匹配
    conditions.forEach((condition) => {
      matches.push(...this.findMatches(currentLine, condition.regex, condition.type))
    })

    // 收集固定標音匹配
    const fixedMatches = this.applyFixedPronunciations(currentLine, fixedPronunciations)

    // 過濾重疊衝突：固定標音避讓手動標音
    const validFixedMatches = fixedMatches.filter(fixedMatch => {
      return !matches.some(existingMatch =>
        this.isOverlapping(fixedMatch, existingMatch)
      )
    })

    matches.push(...validFixedMatches)
    return matches
  }

  /**
   * 匹配區間重疊檢測
   * 
   * @param match1 第一個匹配項目
   * @param match2 第二個匹配項目
   * @returns 布林值，表示是否存在重疊
   */
  private static isOverlapping(match1: Match, match2: Match): boolean {
    const end1 = match1.index + match1.length
    const end2 = match2.index + match2.length

    return !(end1 <= match2.index || end2 <= match1.index)
  }

  /**
   * 匹配結果位置排序
   * 
   * @param matches 匹配結果陣列
   * @returns 按文字位置排序的匹配陣列
   */
  private static sortMatches(matches: Match[]): Match[] {
    return matches.sort((a, b) => a.index - b.index)
  }

  /**
   * 單行歌詞解析核心邏輯
   * 
   * @param line 待解析的單行歌詞
   * @param fixedPronunciations 固定標音規則
   * @returns 解析後的歌詞元素陣列
   * 
   * 處理階段：
   * 1. 收集並排序所有類型的匹配
   * 2. 檢查並移除重疊衝突的匹配
   * 3. 按位置順序處理每個匹配項目
   * 4. 處理匹配間隙的純文字內容
   */
  private static parseLine(
    line: string,
    fixedPronunciations: Record<string, string> = {}
  ): ParsedLyricsElement[] {
    const parsedContents: ParsedLyricsElement[] = []
    const currentLine = line
    let lastIndex = 0

    // 收集並排序所有匹配
    const matches = this.sortMatches(
      this.collectMatches(currentLine, this.MATCH_CONDITIONS, fixedPronunciations)
    )

    // 移除被包含的重疊匹配
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

    // 按順序處理每個有效匹配
    validMatches.forEach((match) => {
      // 處理匹配前的純文字內容
      if (match.index > lastIndex) {
        parsedContents.push({
          type: lyricsElementType.TEXT,
          content: currentLine.slice(lastIndex, match.index),
        })
      }

      // 檢查標音內容是否需要巢狀解析
      const nestedElements = this.parseNestedContent(match.furigana)

      // 建立標音元素
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

    // 處理剩餘的純文字內容
    if (lastIndex < currentLine.length) {
      parsedContents.push({
        type: lyricsElementType.TEXT,
        content: currentLine.slice(lastIndex),
      })
    }

    return parsedContents
  }
}