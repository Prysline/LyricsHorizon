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
    const processedContent = this.preprocessMultiColumn(mainContent)
    const lines = processedContent.split('\n')
    const result: ParsedLyricsElement[][] = []
    let htmlBlock = ''
    let inHtmlBlock = false

    // 載入系列特定的固定標音規則
    const fixedPronunciations = artistId ? getPronunciationsByArtist(artistId) : {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      const multiColumnMatch = line.match(/__MULTI_COLUMN_START__(.*?)__MULTI_COLUMN_END__/)
      if (multiColumnMatch) {
        try {
          const columnsData = JSON.parse(multiColumnMatch[1])
          // 傳遞固定標音規則給多欄資料
          const processedColumns = columnsData.map((column: any) => ({
            ...column,
            content: this.reprocessColumnWithPronunciations(column.content, fixedPronunciations)
          }))

          result.push([{
            type: lyricsElementType.MULTI_COLUMN,
            content: '',
            columns: processedColumns
          }])
          continue
        } catch (error) {
          console.warn('Failed to parse multi-column data:', error)
        }
      }

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
   * 多欄格式預處理
   * 僅識別行首的特定語法標記，避免內容干擾
   */
  private static preprocessMultiColumn(content: string): string {
    const multiColumnRegex = /^:::multi-column\s*$\n([\s\S]*?)\n^:::$/gm

    const result = content.replace(multiColumnRegex, (match, columnContent) => {

      try {
        const multiColumnData = this.parseMultiColumnBlock(columnContent)

        const jsonString = JSON.stringify(multiColumnData)

        return `__MULTI_COLUMN_START__${jsonString}__MULTI_COLUMN_END__`
      } catch (error) {
        console.error('多欄解析失敗：', error)
        return match.replace(/^:::.*$/gm, '').trim()
      }
    })

    return result
  }

  /**
   * 解析多欄區塊內容
   * 嚴格識別 ::column-數字 和 ::end 標記
   */
  private static parseMultiColumnBlock(columnContent: string): {
    number: number
    content: ParsedLyricsElement[][]
  }[] {
    const columns: { number: number; content: ParsedLyricsElement[][] }[] = []

    // 分割內容為行陣列，便於逐行分析
    const lines = columnContent.split('\n')
    let currentColumn: { number: number; lines: string[] } | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 精確匹配：行首的欄位開始標記
      const columnStartMatch = line.match(/^::column-(\d+)$/)
      if (columnStartMatch) {
        // 保存前一欄位（如果存在）
        if (currentColumn) {
          columns.push(this.processColumnContent(currentColumn))
        }

        // 開始新欄位
        currentColumn = {
          number: parseInt(columnStartMatch[1], 10),
          lines: []
        }
        continue
      }

      // 精確匹配：行首的欄位結束標記
      if (line === '::end') {
        if (currentColumn) {
          columns.push(this.processColumnContent(currentColumn))
          currentColumn = null
        }
        continue
      }

      // 收集欄位內容（忽略非語法標記的冒號）
      if (currentColumn) {
        currentColumn.lines.push(lines[i]) // 保留原始行內容，包含空白
      }
    }

    // 處理最後一個欄位（如果沒有明確的 ::end）
    if (currentColumn) {
      columns.push(this.processColumnContent(currentColumn))
    }

    // 按編號排序，保持原始間隔
    return columns.sort((a, b) => a.number - b.number)
  }

  /**
   * 處理單一欄位的內容解析
   */
  private static processColumnContent(column: { number: number; lines: string[] }): {
    number: number
    content: ParsedLyricsElement[][]
  } {
    const parsedContent: ParsedLyricsElement[][] = []

    column.lines.forEach(line => {
      if (line.trim() === '') {
        parsedContent.push([{ type: lyricsElementType.HTML, content: '<br>' }])
      } else {
        // 重用現有解析邏輯，不會受內容中的冒號影響
        parsedContent.push(this.parseLine(line, {}))
      }
    })

    return {
      number: column.number,
      content: parsedContent
    }
  }

  /**
   * 重新處理欄位內容，套用固定標音規則
   * @param columnContent 原始欄位內容
   * @param fixedPronunciations 固定標音規則
   * @returns 重新處理後的欄位內容
   */
  private static reprocessColumnWithPronunciations(
    columnContent: ParsedLyricsElement[][],
    fixedPronunciations: Record<string, string>
  ): ParsedLyricsElement[][] {
    return columnContent.map(line => {
      return line.map(element => {
        // 僅重新處理純文字元素
        if (element.type === lyricsElementType.TEXT && element.content.trim()) {
          // 重新解析並套用固定標音
          return this.parseLine(element.content.trim(), fixedPronunciations)
        }
        return [element] // 其他類型元素保持不變
      }).flat()
    })
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

    // 分離一般詞彙與特殊符號規則
    const { regularWords, specialSymbols } = this.categorizeFixedPronunciations(fixedPronunciations)

    // 優先處理特殊符號（避免被一般詞彙處理覆蓋）
    for (const [symbol, pronunciation] of Object.entries(specialSymbols)) {
      const escapedSymbol = this.escapeRegExp(symbol)
      const regex = new RegExp(escapedSymbol, 'g')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: symbol,
          furigana: pronunciation,
          type: matchType.FIXED,
          matchString: symbol,
        })
      }
    }

    // 處理一般詞彙（使用詞邊界匹配）
    for (const [word, pronunciation] of Object.entries(regularWords)) {
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
   * 分類固定標音規則
   * 區分一般詞彙與特殊符號
   */
  private static categorizeFixedPronunciations(
    fixedPronunciations: Record<string, string>
  ): {
    regularWords: Record<string, string>
    specialSymbols: Record<string, string>
  } {
    const regularWords: Record<string, string> = {}
    const specialSymbols: Record<string, string> = {}

    Object.entries(fixedPronunciations).forEach(([key, value]) => {
      // 檢查是否包含特殊符號（非字母、數字、假名、漢字）
      if (/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(key)) {
        specialSymbols[key] = value
      } else {
        regularWords[key] = value
      }
    })

    return { regularWords, specialSymbols }
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
    const multiColumnMatch = line.match(/__MULTI_COLUMN_START__(.*?)__MULTI_COLUMN_END__/)
    if (multiColumnMatch) {
      try {
        const columnsData = JSON.parse(multiColumnMatch[1])
        return [{
          type: lyricsElementType.MULTI_COLUMN,
          content: '',
          columns: columnsData
        }]
      } catch (error) {
        console.warn('Failed to parse multi-column data:', error)
        return [{ type: lyricsElementType.TEXT, content: line }]
      }
    }

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