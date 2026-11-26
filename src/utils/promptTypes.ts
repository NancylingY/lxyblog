export type EnhanceMode = 'local' | 'ai'
export type EnhanceStyle = 'concise' | 'balanced' | 'detailed'

export type PromptIntentId =
  | 'coding'
  | 'writing'
  | 'summary'
  | 'analysis'
  | 'planning'
  | 'translation'
  | 'general'

export interface PromptIntent {
  id: PromptIntentId
  label: string
  subLabel?: string
  confidence: 'high' | 'medium'
}

export type QualityCheckId =
  | 'intent'
  | 'preservation'
  | 'completeness'
  | 'constraints'
  | 'structure'
  | 'conciseness'

export type QualityStatus = 'pass' | 'improved' | 'attention'

export interface QualityCheckItem {
  id: QualityCheckId
  label: string
  status: QualityStatus
  detail: string
}

export interface EnhancementStats {
  originalChars: number
  enhancedChars: number
  sectionCount: number
  missingCount: number
  trimmedFiller: boolean
}

export interface EnhancementResult {
  prompt: string
  intent: PromptIntent
  changes: string[]
  questions: string[]
  checks: QualityCheckItem[]
  stats: EnhancementStats
}

export interface PromptExample {
  id: string
  tag: readonly [zh: string, en: string]
  draft: readonly [zh: string, en: string]
  context?: readonly [zh: string, en: string]
}

export type InlineSegment =
  | { kind: 'text'; text: string }
  | { kind: 'placeholder'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }

export type PromptBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'list'; ordered: boolean; items: InlineSegment[][] }
  | { kind: 'code'; lang: string; content: string }
  | { kind: 'paragraph'; segments: InlineSegment[] }
