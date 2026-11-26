import type {
  EnhanceStyle,
  EnhancementStats,
  InlineSegment,
  PromptBlock,
  PromptIntent,
  QualityCheckItem,
} from './promptTypes'

const FILLER_CHECK_RE =
  /(?:你好[，,！!\s]*|请问一下|麻烦你?帮我|能不能帮我|我想让你帮我|帮我一下|谢谢[！!。.]?$|拜托了|\b(?:hi|hello|hey there|please help me|could you please|would you mind|thanks in advance)\b)/i

const BOILERPLATE_ROLE_RE =
  /^(?:##\s*(?:角色|Role)\s*\n)?(?:你是一位|你是资深|你是一名|Act as an? expert|You are a senior)/i

const CONSTRAINT_SIGNAL_RE =
  /(?:不要|避免|禁止|必须|确保|严格|限制|仅|不超过|控制在|保持|遵循|兼容|边界|异常|不得|不编造|最小|不影响|防止|优先|如实说明|标明|标注待补充|\b(?:do not|don't|avoid|must|ensure|strictly|only|limit|within|preserve|keep|compatible|edge cases?|minimal|prevent|without affecting|no fabrication)\b)/i

const FORMAT_SIGNAL_RE =
  /(?:格式|结构|分点|表格|清单|Markdown|JSON|正文|主题|代码|步骤|结论|摘要|输出|交付|列出|包含|内容包括|汇报|验证结果|反馈|\b(?:format|structure|bullet|table|list|markdown|json|subject|body|code|steps?|deliverable|output|summary|report|include|feedback|verification)\b)/i

const ACTION_SIGNAL_RE =
  /(?:读取|审查|排查|撰写|汇报|新增|写|起草|生成|实现|修复|重构|优化|调试|定位|总结|概括|提炼|整理|分析|对比|评估|设计|规划|拆解|翻译|润色|改写|\b(?:read|review|audit|write|draft|report|add|create|implement|fix|refactor|optimize|debug|summari[sz]e|extract|analy[sz]e|compare|evaluate|design|plan|break down|translate|polish|rewrite)\b)/i

const NEGATION_TOKEN_RE =
  /(?:不要|不能|不可|不得|禁止|避免|无需|不用|切忌|不影响|防止|\b(?:do not|don't|never|avoid|without|must not|cannot|prevent)\b)/gi

const NUMBER_TOKEN_RE = /\b\d+(?:[.,:/-]\d+)*%?\b/g

export function detectChineseLanguage(text: string, preferChinese: boolean): boolean {
  const hanChars = text.match(/\p{Script=Han}/gu)?.length ?? 0
  const latinWords = text.match(/[a-z]{2,}/gi)?.length ?? 0
  if (hanChars === 0 && latinWords === 0) return preferChinese
  if (hanChars >= 4 && hanChars * 2 >= latinWords) return true
  return hanChars === latinWords ? preferChinese : hanChars > latinWords
}

export function countSections(text: string): number {
  const headings = text
    .split(/\r?\n/)
    .filter((line) => /^#{1,3}\s+\S/.test(line.trim()) || /^【[^】]+】/.test(line.trim())).length
  if (headings > 0) return headings
  // 对于 WorkBuddy 直发自然段风格，按非空段落数统计逻辑块
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean).length
}

export function computeEnhancementStats(
  originalDraft: string,
  enhancedPrompt: string,
  missingCount: number,
  trimmedFiller: boolean,
): EnhancementStats {
  return {
    originalChars: originalDraft.trim().length,
    enhancedChars: enhancedPrompt.trim().length,
    sectionCount: countSections(enhancedPrompt),
    missingCount,
    trimmedFiller,
  }
}

export interface QualityEvalInput {
  originalDraft: string
  enhancedPrompt: string
  context?: string
  intent: PromptIntent
  style: EnhanceStyle
  questions: string[]
  trimmedFiller: boolean
  isChinese: boolean
}

/**
 * WorkBuddy 六维质量检查：
 * 1. 意图聚焦  2. 事实保真  3. 信息完备  4. 约束边界  5. 结构清晰  6. 表达精简
 */
export function evaluatePromptQuality(input: QualityEvalInput): QualityCheckItem[] {
  const { originalDraft, enhancedPrompt, intent, style, questions, trimmedFiller, isChinese } = input
  const t = (zh: string, en: string) => (isChinese ? zh : en)

  const draftTrimmed = originalDraft.trim()
  const enhancedTrimmed = enhancedPrompt.trim()

  // 1. 意图聚焦
  const hasAction = ACTION_SIGNAL_RE.test(enhancedTrimmed)
  const intentCheck: QualityCheckItem = {
    id: 'intent',
    label: t('意图聚焦', 'Intent clarity'),
    status: hasAction && intent.id !== 'general' ? 'pass' : hasAction ? 'improved' : 'attention',
    detail:
      intent.id !== 'general'
        ? t(`已识别为「${intent.label}」并明确核心目标`, `Recognized as "${intent.label}" with clear goal`)
        : hasAction
          ? t('已明确执行动词与交付目标', 'Clear action verb and target deliverable')
          : t('建议进一步明确具体动作或产出物', 'Specify a concrete action or expected deliverable'),
  }

  // 2. 事实与约束保真（数字、日期、否定约束是否保留）
  const originalNumbers = Array.from(new Set(draftTrimmed.match(NUMBER_TOKEN_RE) ?? []))
  const keptNumbers = originalNumbers.filter((num) => enhancedTrimmed.includes(num))
  const hadNegation = NEGATION_TOKEN_RE.test(draftTrimmed)
  NEGATION_TOKEN_RE.lastIndex = 0
  const keptNegation = !hadNegation || NEGATION_TOKEN_RE.test(enhancedTrimmed)
  NEGATION_TOKEN_RE.lastIndex = 0

  const numbersPreserved = originalNumbers.length === 0 || keptNumbers.length === originalNumbers.length
  const preservationOk = numbersPreserved && keptNegation
  const preservationCheck: QualityCheckItem = {
    id: 'preservation',
    label: t('事实保真', 'Fact fidelity'),
    status: preservationOk ? 'pass' : 'attention',
    detail: preservationOk
      ? originalNumbers.length > 0 || hadNegation
        ? t('原稿中的关键数字、限定词与否定约束均已保留', 'Key numbers and negation constraints from draft preserved')
        : t('完整沿用原意图，未引入无根据假设', 'Original intent preserved without fabricated facts')
      : t('检测到原稿部分数字或否定要求可能弱化，请复核', 'Some numbers or negations from the draft may have changed; please verify'),
  }

  // 3. 信息完备
  const placeholderCount = (enhancedTrimmed.match(/\[[^\]]{1,40}\]/g) ?? []).length
  const hasGaps = questions.length > 0 || placeholderCount > 0
  const completenessCheck: QualityCheckItem = {
    id: 'completeness',
    label: t('信息完备', 'Completeness'),
    status: hasGaps ? 'attention' : 'pass',
    detail: hasGaps
      ? t(
          `发现 ${Math.max(questions.length, placeholderCount)} 项建议补充信息，已列出待确认提示`,
          `${Math.max(questions.length, placeholderCount)} detail(s) recommended to supply`,
        )
      : t('已补全关键任务要素与兜底说明，可直接发送执行', 'Task scope, elements, and fallback rules are ready to execute'),
  }

  // 4. 约束边界
  const hasConstraints = CONSTRAINT_SIGNAL_RE.test(enhancedTrimmed)
  const hadDraftConstraints = CONSTRAINT_SIGNAL_RE.test(draftTrimmed)
  const constraintsCheck: QualityCheckItem = {
    id: 'constraints',
    label: t('约束边界', 'Guardrails'),
    status: hasConstraints ? (hadDraftConstraints ? 'pass' : 'improved') : 'attention',
    detail: hasConstraints
      ? hadDraftConstraints
        ? t('已保留原有限制并补齐边界要求', 'Preserved original constraints and added guardrails')
        : t('已补充边界条件、最小改动或防编造约束', 'Added domain guardrails, edge-case handling, and grounding rules')
      : t('缺少明确的边界或限制条件', 'No explicit guardrails or boundaries detected'),
  }

  // 5. 结构清晰（同时认可 WorkBuddy 自然段直发结构 与 分点/分节结构）
  const headingCount = enhancedTrimmed
    .split(/\r?\n/)
    .filter((line) => /^#{1,3}\s+\S/.test(line.trim())).length
  const hasList = /^\s*(?:[-*•]|\d+\.)\s+/m.test(enhancedTrimmed)
  const hasFormat = FORMAT_SIGNAL_RE.test(enhancedTrimmed)
  const sentenceCount = enhancedTrimmed
    .split(/[。！？；.!?;]+/)
    .map((s) => s.trim())
    .filter(Boolean).length
  const proseStructured = hasAction && hasFormat && hasConstraints && sentenceCount >= 2

  const wellStructured =
    style === 'concise'
      ? proseStructured || hasList || headingCount >= 1
      : style === 'balanced'
        ? hasList || headingCount >= 1 || proseStructured
        : headingCount >= 2 || (headingCount >= 1 && hasList)

  const structureCheck: QualityCheckItem = {
    id: 'structure',
    label: t('结构清晰', 'Structure'),
    status: wellStructured ? (headingCount >= 2 || hasList ? 'improved' : 'pass') : 'attention',
    detail: wellStructured
      ? headingCount >= 2
        ? t(`已重组为 ${headingCount} 个清晰区块并明确交付要求`, `Organized into ${headingCount} clear sections with deliverables`)
        : hasList
          ? t('采用要点列表分层展开，目标与约束一目了然', 'Layered with crisp bullet points for scanability')
          : t('指令层次清晰（目标要素 → 约束边界 → 交付兜底），可直接发送', 'Clean flow (goal & elements → guardrails → output/fallback), ready to send')
      : t('建议按任务目标、约束边界与输出要求分段组织', 'Consider separating goal, constraints, and output requirements'),
  }

  // 6. 表达精简（同时检测口语冗余与角色套话膨胀）
  const stillHasFiller = FILLER_CHECK_RE.test(enhancedTrimmed)
  const hasRoleBoilerplate = style === 'concise' && BOILERPLATE_ROLE_RE.test(enhancedTrimmed)
  const overBloated = style === 'concise' && enhancedTrimmed.length > 360
  const concisenessCheck: QualityCheckItem = {
    id: 'conciseness',
    label: t('表达精简', 'Conciseness'),
    status:
      stillHasFiller || hasRoleBoilerplate || overBloated
        ? 'attention'
        : trimmedFiller
          ? 'improved'
          : 'pass',
    detail: stillHasFiller
      ? t('仍存在少量客套或口语冗余，可继续精简', 'Contains residual conversational filler that can be trimmed')
      : hasRoleBoilerplate
        ? t('标准直发风格建议去掉套路化角色开场，直奔主题', 'Remove boilerplate role preamble in concise style')
        : overBloated
          ? t('标准精简模式下篇幅偏长，可进一步压缩冗余表述', 'Slightly long for concise mode; consider tightening')
          : trimmedFiller
            ? t('已去除口语起手与冗余表述，信息密度高', 'Trimmed conversational phrasing for crisp, high-density wording')
            : t('表达自然克制、无模板套话，信息密度高', 'Direct, natural phrasing with zero boilerplate fluff'),
  }

  return [
    intentCheck,
    preservationCheck,
    completenessCheck,
    constraintsCheck,
    structureCheck,
    concisenessCheck,
  ]
}

/**
 * 安全解析增强结果中的轻量 Markdown 结构，供阅读视图渲染（不使用 v-html，杜绝 XSS）
 */
export function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  const tokenRe = /(\[[^\]\n]{1,48}\]|`[^`\n]+`|\*\*[^*\n]+\*\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: text.slice(lastIndex, match.index) })
    }
    const token = match[0]
    if (token.startsWith('[') && token.endsWith(']')) {
      segments.push({ kind: 'placeholder', text: token })
    } else if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ kind: 'code', text: token.slice(1, -1) })
    } else if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ kind: 'strong', text: token.slice(2, -2) })
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) })
  }
  return segments.length ? segments : [{ kind: 'text', text }]
}

export function parsePromptBlocks(markdown: string): PromptBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: PromptBlock[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i] ?? ''
    const trimmed = rawLine.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    const fenceMatch = trimmed.match(/^```([\w-]*)$/)
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? ''
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '')
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ kind: 'code', lang, content: codeLines.join('\n') })
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1]!.length) as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, text: headingMatch[2]!.trim() })
      i += 1
      continue
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const items: InlineSegment[][] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*[-*•]\s+/, '').trim()
        items.push(parseInlineSegments(itemText))
        i += 1
      }
      blocks.push({ kind: 'list', ordered: false, items })
      continue
    }

    if (/^\d+[.)、]\s*/.test(trimmed)) {
      const items: InlineSegment[][] = []
      while (i < lines.length && /^\s*\d+[.)、]\s*/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*\d+[.)、]\s*/, '').trim()
        items.push(parseInlineSegments(itemText))
        i += 1
      }
      blocks.push({ kind: 'list', ordered: true, items })
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length) {
      const cur = (lines[i] ?? '').trim()
      if (
        !cur ||
        /^```/.test(cur) ||
        /^#{1,3}\s+/.test(cur) ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)、]\s*/.test(cur)
      ) {
        break
      }
      paraLines.push(cur)
      i += 1
    }
    blocks.push({
      kind: 'paragraph',
      segments: parseInlineSegments(paraLines.join('\n')),
    })
  }

  return blocks
}
