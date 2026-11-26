<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from '../i18n'
import { copyText } from '../utils/clipboard'
import { enhancePrompt, PROMPT_EXAMPLES } from '../utils/enhancePrompt'
import {
  computeEnhancementStats,
  detectChineseLanguage,
  evaluatePromptQuality,
  parsePromptBlocks,
} from '../utils/promptQuality'
import type {
  EnhanceMode,
  EnhanceStyle,
  EnhancementResult,
  PromptExample,
} from '../utils/promptTypes'
import { completionEndpoint, rewritePrompt } from '../utils/rewritePrompt'

const { isZh } = useI18n()
const tr = (zh: string, en: string) => (isZh.value ? zh : en)

// 核心输入与配置
const mode = ref<EnhanceMode>('local')
const style = ref<EnhanceStyle>('concise')
const draft = ref('')
const context = ref('')
const contextOpen = ref(false)

// AI 接口配置（不持久化密钥）
const endpoint = ref('https://api.deepseek.com')
const model = ref('deepseek-flash')
const apiKey = ref('')
const showKey = ref(false)
const configOpen = ref(false)

// 结果与版本管理
const current = ref<EnhancementResult | null>(null)
const resultText = ref('')
const sourceDraft = ref('')
const versions = ref<EnhancementResult[]>([])
const outputView = ref<'preview' | 'edit' | 'compare'>('preview')

// 迭代微调与交互状态
const feedback = ref('')
const busy = ref(false)
const activeStage = ref(0)
const copied = ref(false)
const statusText = ref('')
const statusTone = ref<'info' | 'success' | 'error'>('info')

let request: AbortController | undefined
let stageTimer = 0
let copyTimer = 0

const draftField = useTemplateRef<HTMLTextAreaElement>('draftField')
const contextField = useTemplateRef<HTMLTextAreaElement>('contextField')
const feedbackField = useTemplateRef<HTMLTextAreaElement>('feedbackField')

const PIPELINE_STAGES = computed(() => [
  {
    key: 'intent',
    num: '01',
    title: tr('意图识别', 'Intent'),
    desc: tr('判定任务类型与交付目标', 'Classify task & deliverable'),
  },
  {
    key: 'streamline',
    num: '02',
    title: tr('表达精简', 'Streamline'),
    desc: tr('去除寒暄冗余，保留核心事实', 'Trim filler, keep all facts'),
  },
  {
    key: 'complete',
    num: '03',
    title: tr('信息补全', 'Complete'),
    desc: tr('融合背景并标记关键缺项', 'Merge context & flag gaps'),
  },
  {
    key: 'constrain',
    num: '04',
    title: tr('约束补充', 'Constrain'),
    desc: tr('补齐防幻觉与领域边界要求', 'Add guardrails & scope limits'),
  },
  {
    key: 'structure',
    num: '05',
    title: tr('结构重组', 'Restructure'),
    desc: tr('重组为高密度直发指令或清晰层次', 'Organize into crisp direct or layered format'),
  },
  {
    key: 'quality',
    num: '06',
    title: tr('质量检查', 'Quality check'),
    desc: tr('核对保真度、完整性与可读性', 'Verify fidelity & readiness'),
  },
])

const STYLE_OPTIONS = computed(
  () =>
    [
      {
        value: 'concise' as const,
        label: tr('标准直发', 'Direct'),
        hint: tr('WorkBuddy 标准风格：高密度自然指令，无模板套话，可直接发送', 'WorkBuddy style: crisp, dense direct prompt with zero boilerplate'),
      },
      {
        value: 'balanced' as const,
        label: tr('分点清晰', 'Structured'),
        hint: tr('主指令 + 覆盖要点与约束清单，层次一目了然', 'Lead directive with concise elements & constraints list'),
      },
      {
        value: 'detailed' as const,
        label: tr('完整规范', 'Detailed'),
        hint: tr('目标、核心要素、执行步骤、边界与验收完整分节', 'Full sections for scope, elements, steps, guardrails & checks'),
      },
    ] as const,
)

const QUICK_FEEDBACKS = computed(() => [
  {
    label: tr('更精简', 'Shorter'),
    text: tr('压缩篇幅 30%，保留核心约束与输出格式。', 'Shorten by ~30% while keeping core constraints and output format.'),
  },
  {
    label: tr('口吻更正式', 'More formal'),
    text: tr('整体表述调整为更正式、专业的职场书面语。', 'Adjust the tone to be more formal and executive-ready.'),
  },
  {
    label: tr('补充验收标准', 'Add checks'),
    text: tr('补充具体的边界条件检查项和可验证的验收标准。', 'Add concrete edge-case checks and verifiable acceptance criteria.'),
  },
])

const hasResult = computed(() => !!resultText.value.trim())
const versionNumber = computed(() => versions.value.length + (hasResult.value ? 1 : 0))
const draftChangedSinceRun = computed(
  () => hasResult.value && sourceDraft.value !== draft.value.trim(),
)
const canRefine = computed(() => hasResult.value && !draftChangedSinceRun.value)
const aiConfigReady = computed(() => !!endpoint.value.trim() && !!model.value.trim() && !!apiKey.value.trim())

const renderedBlocks = computed(() => parsePromptBlocks(resultText.value))

const qualitySummary = computed(() => {
  const checks = current.value?.checks ?? []
  if (!checks.length) return { ok: 0, attention: 0, total: 0 }
  const attention = checks.filter((item) => item.status === 'attention').length
  return { ok: checks.length - attention, attention, total: checks.length }
})

const placeholderText = computed(() =>
  tr(
    '输入一句简短需求，例如：读取项目记忆 / 修复项目漏洞 / 汇报项目进展 / 我要新增一个表单提交功能…',
    'Enter a brief request, e.g. Read project memory / Fix project vulnerabilities / Add a form submission feature…',
  ),
)

// 切换到 AI 模式且未填密钥时，展开配置面板提示填写
watch(mode, (next) => {
  clearStatus()
  if (next === 'ai' && !apiKey.value.trim()) {
    configOpen.value = true
  }
})

// 本地模式下已有结果且原稿未改时，切换风格即时重算，体验丝滑
watch(style, () => {
  if (mode.value === 'local' && hasResult.value && !draftChangedSinceRun.value && !busy.value) {
    runLocalEnhance(false)
  }
})

onBeforeUnmount(() => {
  request?.abort()
  window.clearInterval(stageTimer)
  window.clearTimeout(copyTimer)
})

function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info') {
  statusText.value = message
  statusTone.value = tone
}

function clearStatus() {
  copied.value = false
  statusText.value = ''
}

function startStageProgress() {
  activeStage.value = 0
  window.clearInterval(stageTimer)
  stageTimer = window.setInterval(() => {
    if (activeStage.value < 5) activeStage.value += 1
  }, 650)
}

function stopStageProgress() {
  window.clearInterval(stageTimer)
  stageTimer = 0
}

function applyResult(output: EnhancementResult, pushHistory = true) {
  if (pushHistory && current.value && sourceDraft.value === draft.value.trim()) {
    versions.value = [
      ...versions.value.slice(-9),
      {
        ...current.value,
        prompt: resultText.value,
        changes: [...current.value.changes],
        questions: [...current.value.questions],
        checks: [...current.value.checks],
      },
    ]
  } else if (sourceDraft.value !== draft.value.trim()) {
    versions.value = []
  }

  current.value = output
  resultText.value = output.prompt
  sourceDraft.value = draft.value.trim()
  feedback.value = ''
  if (outputView.value === 'compare' && !output.prompt) {
    outputView.value = 'preview'
  }
}

function runLocalEnhance(pushHistory = true) {
  const text = draft.value.trim()
  if (!text) return
  const output = enhancePrompt(text, {
    preferChinese: isZh.value,
    context: context.value.trim(),
    style: style.value,
  })
  applyResult(output, pushHistory)
  setStatus(
    tr('已完成 6 步本地增强。可切换「标准直发 / 分点清晰 / 完整规范」实时对比。', '6-step local enhancement complete. Switch styles to compare instantly.'),
    'success',
  )
}

async function enhance(refine = false) {
  const text = draft.value.trim()
  if (!text || busy.value) return
  clearStatus()
  if (refine && (!canRefine.value || !feedback.value.trim())) return

  if (mode.value === 'local') {
    runLocalEnhance(true)
    return
  }

  let url: URL
  try {
    url = completionEndpoint(endpoint.value)
  } catch {
    configOpen.value = true
    setStatus(
      tr(
        '请输入完整的 HTTPS 接口地址，且不要包含凭据、查询参数或片段。',
        'Enter a valid HTTPS endpoint without credentials, query parameters, or fragments.',
      ),
      'error',
    )
    return
  }
  if (!model.value.trim() || !apiKey.value.trim()) {
    configOpen.value = true
    setStatus(tr('请先在模型配置中填写模型名称与 API 密钥。', 'Fill in the model name and API key in Model Settings first.'), 'error')
    return
  }

  configOpen.value = false
  const controller = new AbortController()
  request = controller
  busy.value = true
  startStageProgress()
  let timedOut = false
  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 90_000)

  try {
    const output = await rewritePrompt(
      {
        endpoint: url,
        model: model.value.trim(),
        key: apiKey.value.trim(),
        draft: text,
        context: context.value.trim(),
        style: style.value,
        previousPrompt: refine ? resultText.value : '',
        feedback: refine ? feedback.value.trim() : '',
        preferChinese: isZh.value,
      },
      controller.signal,
    )

    if (typeof output === 'number') {
      const hints: Record<number, [string, string]> = {
        401: ['密钥无效或已过期。', 'API key is invalid or expired.'],
        403: ['当前密钥没有调用权限。', 'This key lacks permission.'],
        404: ['接口地址或模型不存在，请检查配置。', 'Endpoint or model not found. Check your settings.'],
        429: ['调用频率或额度受限，请稍后重试或检查余额。', 'Rate or quota limit reached. Retry later or check balance.'],
      }
      const hint = hints[output] ?? [
        '模型服务暂时无法处理请求，请稍后重试。',
        'The service could not process this request. Try again later.',
      ]
      setStatus(`HTTP ${output} · ${tr(...hint)}`, 'error')
    } else if (output) {
      if (controller.signal.aborted) return
      activeStage.value = 5
      applyResult(output, true)
      setStatus(
        refine
          ? tr('已按反馈完成迭代改写。', 'Refined prompt based on your feedback.')
          : tr('AI 增强与质量自检完成。', 'AI enhancement and quality check complete.'),
        'success',
      )
    } else {
      setStatus(
        tr(
          '接口未返回符合约定的完整提示词，请重试或更换模型。',
          'Response did not contain a valid enhanced prompt. Retry or try another model.',
        ),
        'error',
      )
    }
  } catch {
    if (timedOut) {
      setStatus(tr('AI 改写超时，请重试。', 'Request timed out. Please try again.'), 'error')
    } else if (controller.signal.aborted) {
      setStatus(tr('已停止请求，保留当前结果。', 'Request stopped. Existing result preserved.'), 'info')
    } else {
      setStatus(
        tr(
          '接口调用失败，请检查网络及接口是否允许浏览器跨域访问。',
          'Request failed. Check network connectivity and CORS support on the endpoint.',
        ),
        'error',
      )
    }
  } finally {
    window.clearTimeout(timer)
    stopStageProgress()
    request = undefined
    busy.value = false
  }
}

function onManualResultEdit() {
  copied.value = false
  if (!current.value) return
  const edited = resultText.value
  const isChinese = detectChineseLanguage(sourceDraft.value || edited, isZh.value)
  current.value = {
    ...current.value,
    prompt: edited,
    checks: evaluatePromptQuality({
      originalDraft: sourceDraft.value,
      enhancedPrompt: edited,
      context: context.value.trim(),
      intent: current.value.intent,
      style: style.value,
      questions: current.value.questions,
      trimmedFiller: current.value.stats.trimmedFiller,
      isChinese,
    }),
    stats: computeEnhancementStats(
      sourceDraft.value,
      edited,
      current.value.questions.length,
      current.value.stats.trimmedFiller,
    ),
  }
}

function undo() {
  const previous = versions.value.pop()
  if (!previous) return
  current.value = previous
  resultText.value = previous.prompt
  setStatus(tr('已撤回到上一版本。', 'Reverted to previous version.'), 'info')
}

function applyExample(item: PromptExample) {
  if (busy.value) return
  draft.value = isZh.value ? item.draft[0] : item.draft[1]
  if (item.context) {
    context.value = isZh.value ? item.context[0] : item.context[1]
    contextOpen.value = true
  }
  clearStatus()
  draftField.value?.focus()
}

async function answerQuestion(question: string) {
  if (busy.value) return
  const prefix = tr(`补充「${question.replace(/[？?]$/, '')}」：`, `Answer (${question.replace(/[？?]$/, '')}): `)
  if (mode.value === 'ai' && canRefine.value) {
    feedback.value = feedback.value.trim() ? `${feedback.value.trim()}\n${prefix}` : prefix
    await nextTick()
    feedbackField.value?.focus()
    return
  }
  contextOpen.value = true
  context.value = context.value.trim() ? `${context.value.trim()}\n${prefix}` : prefix
  await nextTick()
  contextField.value?.focus()
}

function useQuickFeedback(text: string) {
  if (busy.value) return
  feedback.value = feedback.value.trim() ? `${feedback.value.trim()} ${text}` : text
  feedbackField.value?.focus()
}

function clearAll() {
  draft.value = ''
  context.value = ''
  feedback.value = ''
  resultText.value = ''
  sourceDraft.value = ''
  current.value = null
  versions.value = []
  outputView.value = 'preview'
  clearStatus()
  draftField.value?.focus()
}

async function copyResult() {
  const text = resultText.value
  if (!text.trim()) return
  const success = await copyText(text)
  if (text !== resultText.value) return
  copied.value = success
  if (success) {
    setStatus(tr('增强后的提示词已复制到剪贴板。', 'Enhanced prompt copied to clipboard.'), 'success')
    window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => {
      copied.value = false
    }, 2200)
  } else {
    setStatus(tr('复制失败，请切换至编辑视图手动复制。', 'Copy failed. Switch to Edit view to copy manually.'), 'error')
  }
}

function onDraftKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void enhance(false)
  }
}

function onFeedbackKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void enhance(true)
  }
}
</script>

<template>
  <section class="section pe-page">
    <div class="container">
      <!-- 顶部导航与标题区 -->
      <header class="pe-head section-head is-visible">
        <div class="pe-head__meta">
          <RouterLink class="pe-back" to="/tools">
            <span aria-hidden="true">←</span>
            <span>{{ tr('返回工具', 'Back to Tools') }}</span>
          </RouterLink>
          <span class="section-label pe-label">~/tools/prompt-enhancer</span>
        </div>
        <h1 class="section-title">{{ tr('提示词增强', 'Prompt Enhancer') }}</h1>
        <p class="section-sub pe-sub">
          {{
            tr(
              '沿用意图识别、表达精简、信息补全、约束补充、结构重组与质量自检六步逻辑，将口语草稿整理为高可执行度指令。',
              'Transform rough drafts into structured, executable prompts through intent recognition, streamlining, context & constraint completion, restructuring, and quality checks.',
            )
          }}
        </p>
      </header>

      <!-- 顶部控制栏：模式 + 风格 + 模型配置触发器 -->
      <div class="pe-bar" role="region" :aria-label="tr('增强配置', 'Enhancement controls')">
        <div class="pe-bar__group">
          <span class="pe-bar__label">{{ tr('方式', 'Mode') }}</span>
          <div class="pe-seg" role="group" :aria-label="tr('增强方式', 'Enhancement mode')">
            <button
              type="button"
              class="pe-seg__btn"
              :class="{ 'is-active': mode === 'local' }"
              :aria-pressed="mode === 'local'"
              :disabled="busy"
              @click="mode = 'local'"
            >
              <span class="pe-seg__dot" aria-hidden="true" />
              {{ tr('本地增强', 'Local') }}
            </button>
            <button
              type="button"
              class="pe-seg__btn"
              :class="{ 'is-active': mode === 'ai' }"
              :aria-pressed="mode === 'ai'"
              :disabled="busy"
              @click="mode = 'ai'"
            >
              <span class="pe-seg__dot" aria-hidden="true" />
              {{ tr('AI 改写', 'AI Rewrite') }}
            </button>
          </div>
        </div>

        <div class="pe-bar__group">
          <span class="pe-bar__label">{{ tr('强度', 'Depth') }}</span>
          <div class="pe-seg" role="group" :aria-label="tr('改写风格', 'Rewrite style')">
            <button
              v-for="opt in STYLE_OPTIONS"
              :key="opt.value"
              type="button"
              class="pe-seg__btn"
              :class="{ 'is-active': style === opt.value }"
              :aria-pressed="style === opt.value"
              :title="opt.hint"
              :disabled="busy"
              @click="style = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <button
          v-if="mode === 'ai'"
          type="button"
          class="pe-config-toggle"
          :class="{ 'is-open': configOpen, 'is-ready': aiConfigReady }"
          :aria-expanded="configOpen"
          :disabled="busy"
          @click="configOpen = !configOpen"
        >
          <span class="pe-config-toggle__dot" aria-hidden="true" />
          <span class="pe-config-toggle__model">{{ model.trim() || tr('未设模型', 'No model') }}</span>
          <span class="pe-config-toggle__state">
            {{ aiConfigReady ? tr('已就绪', 'Ready') : tr('待填密钥', 'Key needed') }}
          </span>
          <span class="pe-config-toggle__caret" aria-hidden="true">{{ configOpen ? '▴' : '▾' }}</span>
        </button>
      </div>

      <!-- AI 模型配置抽屉（按需展开，不挤压主工作区） -->
      <Transition name="pe-fold">
        <fieldset v-if="mode === 'ai' && configOpen" class="pe-panel pe-config" :disabled="busy">
          <legend class="sr-only">{{ tr('AI 模型配置', 'AI Model Settings') }}</legend>
          <div class="pe-config__grid">
            <label class="pe-field">
              <span class="pe-field__label">{{ tr('接口地址（Chat Completions 兼容）', 'Endpoint (Chat Completions)') }}</span>
              <input
                v-model="endpoint"
                type="url"
                placeholder="https://api.deepseek.com"
                autocomplete="off"
              />
            </label>
            <label class="pe-field">
              <span class="pe-field__label">{{ tr('模型名称', 'Model name') }}</span>
              <input v-model="model" type="text" placeholder="deepseek-flash" autocomplete="off" />
            </label>
            <label class="pe-field">
              <span class="pe-field__label">{{ tr('API 密钥（仅当前会话使用）', 'API Key (session only)') }}</span>
              <div class="pe-key-wrap">
                <input
                  v-model="apiKey"
                  :type="showKey ? 'text' : 'password'"
                  autocomplete="off"
                  :placeholder="tr('输入 sk-...', 'Enter sk-...')"
                />
                <button
                  type="button"
                  class="pe-key-eye"
                  :aria-label="showKey ? tr('隐藏密钥', 'Hide key') : tr('显示密钥', 'Show key')"
                  @click="showKey = !showKey"
                >
                  {{ showKey ? tr('隐藏', 'Hide') : tr('显示', 'Show') }}
                </button>
              </div>
            </label>
          </div>
          <p class="pe-config__note">
            {{
              tr(
                '仅填写你信任的接口地址。草稿与密钥仅直接发送到该接口，本页面不会在本地保存密钥；DeepSeek 官方接口默认关闭思考模式以降低耗时。',
                'Use only trusted endpoints. Drafts and keys are sent directly to that URL and never stored locally. Thinking mode is disabled on the official DeepSeek endpoint for faster rewrites.',
              )
            }}
          </p>
        </fieldset>
      </Transition>

      <!-- 状态反馈条 -->
      <Transition name="pe-fold">
        <div
          v-if="statusText"
          class="pe-notice"
          :class="`pe-notice--${statusTone}`"
          role="status"
          aria-live="polite"
        >
          <span class="pe-notice__icon" aria-hidden="true">
            {{ statusTone === 'error' ? '!' : statusTone === 'success' ? '✓' : 'i' }}
          </span>
          <span class="pe-notice__text">{{ statusText }}</span>
          <button
            type="button"
            class="pe-notice__close"
            :aria-label="tr('关闭提示', 'Dismiss')"
            @click="clearStatus"
          >
            ×
          </button>
        </div>
      </Transition>

      <!-- 主双栏工作台 -->
      <form class="pe-workbench" @submit.prevent="enhance(false)">
        <!-- 左栏：原始输入 -->
        <section class="pe-panel pe-pane pe-pane--input">
          <div class="pe-pane__head">
            <div class="pe-pane__title-row">
              <label for="prompt-draft" class="pe-pane__title">{{ tr('原始提示词', 'Original Prompt') }}</label>
              <span class="pe-counter">{{ draft.length }} / 12000</span>
            </div>
            <div class="pe-examples" :aria-label="tr('快速示例', 'Quick examples')">
              <span class="pe-examples__label">{{ tr('示例', 'Try') }}</span>
              <button
                v-for="item in PROMPT_EXAMPLES"
                :key="item.id"
                type="button"
                class="pe-chip"
                :disabled="busy"
                @click="applyExample(item)"
              >
                {{ isZh ? item.tag[0] : item.tag[1] }}
              </button>
            </div>
          </div>

          <textarea
            id="prompt-draft"
            ref="draftField"
            v-model="draft"
            class="pe-textarea pe-textarea--draft"
            :readonly="busy"
            maxlength="12000"
            :placeholder="placeholderText"
            @keydown="onDraftKeydown"
          />

          <!-- 补充背景材料（本地与 AI 均可用） -->
          <div class="pe-context">
            <button
              type="button"
              class="pe-context__toggle"
              :aria-expanded="contextOpen"
              @click="contextOpen = !contextOpen"
            >
              <span>{{ tr('补充背景与材料（可选）', 'Background & source context (optional)') }}</span>
              <span v-if="context.trim()" class="pe-badge pe-badge--accent">
                {{ tr(`已填 ${context.trim().length} 字`, `${context.trim().length} chars`) }}
              </span>
              <span class="pe-context__arrow" aria-hidden="true">{{ contextOpen ? '▴' : '▾' }}</span>
            </button>
            <Transition name="pe-fold">
              <div v-if="contextOpen" class="pe-context__body">
                <label class="sr-only" for="prompt-context">
                  {{ tr('受众、已有资料、技术栈、限制条件或待确认问题的补充答案', 'Audience, source material, stack, constraints, or answers to questions') }}
                </label>
                <textarea
                  id="prompt-context"
                  ref="contextField"
                  v-model="context"
                  class="pe-textarea pe-textarea--short"
                  :readonly="busy"
                  maxlength="24000"
                  :placeholder="
                    tr(
                      '可粘贴受众说明、项目名称、技术栈、会议原文，或点击右侧「待确认信息」一键回填答案…',
                      'Add audience, project name, tech stack, raw notes, or click a clarification item on the right to answer…',
                    )
                  "
                  @keydown="onDraftKeydown"
                />
              </div>
            </Transition>
          </div>

          <div class="pe-pane__foot">
            <button
              type="button"
              class="pe-btn pe-btn--subtle"
              :disabled="busy || (!draft && !resultText && !context && !feedback)"
              @click="clearAll"
            >
              {{ tr('清空', 'Clear') }}
            </button>

            <div class="pe-pane__foot-right">
              <button
                v-if="busy"
                type="button"
                class="pe-btn pe-btn--danger"
                @click="request?.abort()"
              >
                {{ tr('停止', 'Stop') }}
              </button>
              <button
                type="submit"
                class="pe-btn pe-btn--primary"
                :disabled="busy || !draft.trim()"
              >
                <span aria-hidden="true">✦</span>
                <span>
                  {{
                    busy
                      ? tr('正在增强…', 'Enhancing…')
                      : draftChangedSinceRun
                        ? tr('重新增强', 'Re-enhance')
                        : tr('增强提示词', 'Enhance Prompt')
                  }}
                </span>
                <kbd class="pe-kbd" aria-hidden="true">Ctrl ↵</kbd>
              </button>
            </div>
          </div>
        </section>

        <!-- 右栏：增强结果 -->
        <section class="pe-panel pe-pane pe-pane--output" :class="{ 'is-busy': busy }">
          <div class="pe-pane__head">
            <div class="pe-pane__title-row">
              <div class="pe-output-meta">
                <h2 class="pe-pane__title">{{ tr('增强结果', 'Enhanced Prompt') }}</h2>
                <span v-if="current && hasResult" class="pe-badge pe-badge--accent">
                  {{ current.intent.label }}
                </span>
                <span v-if="versionNumber > 1" class="pe-badge">v{{ versionNumber }}</span>
              </div>

              <div v-if="hasResult && !busy" class="pe-tabs" role="tablist" :aria-label="tr('展示视图', 'Output view')">
                <button
                  type="button"
                  role="tab"
                  class="pe-tabs__btn"
                  :class="{ 'is-active': outputView === 'preview' }"
                  :aria-selected="outputView === 'preview'"
                  @click="outputView = 'preview'"
                >
                  {{ tr('阅读', 'Read') }}
                </button>
                <button
                  type="button"
                  role="tab"
                  class="pe-tabs__btn"
                  :class="{ 'is-active': outputView === 'edit' }"
                  :aria-selected="outputView === 'edit'"
                  @click="outputView = 'edit'"
                >
                  {{ tr('编辑', 'Edit') }}
                </button>
                <button
                  type="button"
                  role="tab"
                  class="pe-tabs__btn"
                  :class="{ 'is-active': outputView === 'compare' }"
                  :aria-selected="outputView === 'compare'"
                  @click="outputView = 'compare'"
                >
                  {{ tr('对比', 'Compare') }}
                </button>
              </div>
            </div>
          </div>

          <!-- 结果展示主体 -->
          <div class="pe-output-body">
            <!-- 处理中：六步流水线动效 -->
            <div v-if="busy" class="pe-pipeline-loading" role="status" aria-live="polite">
              <p class="pe-pipeline-loading__title">
                {{ tr('正在按 WorkBuddy 六步标准重构提示词…', 'Running 6-step prompt enhancement…') }}
              </p>
              <ol class="pe-stage-list">
                <li
                  v-for="(stage, idx) in PIPELINE_STAGES"
                  :key="stage.key"
                  class="pe-stage"
                  :class="{
                    'is-done': idx < activeStage,
                    'is-active': idx === activeStage,
                  }"
                >
                  <span class="pe-stage__num">{{ idx < activeStage ? '✓' : stage.num }}</span>
                  <div class="pe-stage__info">
                    <strong>{{ stage.title }}</strong>
                    <span>{{ stage.desc }}</span>
                  </div>
                </li>
              </ol>
            </div>

            <!-- 空态：清晰呈现 6 步增强能力 -->
            <div v-else-if="!hasResult" class="pe-empty">
              <div class="pe-empty__head">
                <span class="pe-empty__mark" aria-hidden="true">✦</span>
                <div>
                  <h3>{{ tr('准备就绪', 'Ready to enhance') }}</h3>
                  <p>
                    {{
                      tr(
                        '在左侧输入草稿或点选上方示例，工具将按以下 6 步完成结构化增强：',
                        'Enter a draft or pick an example on the left. Your prompt goes through 6 optimization steps:',
                      )
                    }}
                  </p>
                </div>
              </div>
              <ol class="pe-stage-grid">
                <li v-for="stage in PIPELINE_STAGES" :key="stage.key" class="pe-stage-card">
                  <span class="pe-stage-card__num">{{ stage.num }}</span>
                  <strong>{{ stage.title }}</strong>
                  <span>{{ stage.desc }}</span>
                </li>
              </ol>
            </div>

            <!-- 阅读视图（安全结构化渲染，高亮占位符） -->
            <article v-else-if="outputView === 'preview'" class="pe-reader">
              <template v-for="(block, bIdx) in renderedBlocks" :key="bIdx">
                <h3 v-if="block.kind === 'heading'" class="pe-reader__h" :class="`pe-reader__h--${block.level}`">
                  {{ block.text }}
                </h3>
                <pre v-else-if="block.kind === 'code'" class="pe-reader__code"><code>{{ block.content }}</code></pre>
                <ol v-else-if="block.kind === 'list' && block.ordered" class="pe-reader__list pe-reader__list--ol">
                  <li v-for="(item, iIdx) in block.items" :key="iIdx">
                    <template v-for="(seg, sIdx) in item" :key="sIdx">
                      <mark v-if="seg.kind === 'placeholder'" class="pe-placeholder">{{ seg.text }}</mark>
                      <code v-else-if="seg.kind === 'code'" class="pe-inline-code">{{ seg.text }}</code>
                      <strong v-else-if="seg.kind === 'strong'">{{ seg.text }}</strong>
                      <template v-else>{{ seg.text }}</template>
                    </template>
                  </li>
                </ol>
                <ul v-else-if="block.kind === 'list'" class="pe-reader__list">
                  <li v-for="(item, iIdx) in block.items" :key="iIdx">
                    <template v-for="(seg, sIdx) in item" :key="sIdx">
                      <mark v-if="seg.kind === 'placeholder'" class="pe-placeholder">{{ seg.text }}</mark>
                      <code v-else-if="seg.kind === 'code'" class="pe-inline-code">{{ seg.text }}</code>
                      <strong v-else-if="seg.kind === 'strong'">{{ seg.text }}</strong>
                      <template v-else>{{ seg.text }}</template>
                    </template>
                  </li>
                </ul>
                <p v-else class="pe-reader__p">
                  <template v-for="(seg, sIdx) in block.segments" :key="sIdx">
                    <mark v-if="seg.kind === 'placeholder'" class="pe-placeholder">{{ seg.text }}</mark>
                    <code v-else-if="seg.kind === 'code'" class="pe-inline-code">{{ seg.text }}</code>
                    <strong v-else-if="seg.kind === 'strong'">{{ seg.text }}</strong>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </p>
              </template>
            </article>

            <!-- 编辑视图（可直接微调最终提示词） -->
            <div v-else-if="outputView === 'edit'" class="pe-edit-wrap">
              <label class="sr-only" for="prompt-result">{{ tr('编辑增强结果', 'Edit enhanced prompt') }}</label>
              <textarea
                id="prompt-result"
                v-model="resultText"
                class="pe-textarea pe-textarea--result"
                :readonly="busy"
                @input="onManualResultEdit"
              />
            </div>

            <!-- 前后对比视图 -->
            <div v-else class="pe-compare">
              <div class="pe-compare__block">
                <div class="pe-compare__label">
                  <span>{{ tr('原始草稿', 'Original draft') }}</span>
                  <span class="pe-counter">{{ sourceDraft.length }} {{ tr('字', 'chars') }}</span>
                </div>
                <pre class="pe-compare__text pe-compare__text--before">{{ sourceDraft }}</pre>
              </div>
              <div class="pe-compare__block">
                <div class="pe-compare__label">
                  <span>{{ tr('增强版本', 'Enhanced version') }}</span>
                  <span class="pe-counter">{{ resultText.trim().length }} {{ tr('字', 'chars') }}</span>
                </div>
                <pre class="pe-compare__text pe-compare__text--after">{{ resultText }}</pre>
              </div>
            </div>
          </div>

          <div class="pe-pane__foot">
            <div class="pe-stats" v-if="current && hasResult">
              <span>{{ current.stats.originalChars }} → {{ current.stats.enhancedChars }} {{ tr('字', 'chars') }}</span>
              <span v-if="current.stats.sectionCount > 1">· {{ current.stats.sectionCount }} {{ tr('个区块', 'sections') }}</span>
            </div>
            <span v-else class="pe-stats">{{ tr('支持自然阅读、直接编辑与一键复制', 'Clean reader, direct edit & one-click copy') }}</span>

            <div class="pe-pane__foot-right">
              <button
                type="button"
                class="pe-btn pe-btn--subtle"
                :disabled="busy || !versions.length"
                @click="undo"
              >
                {{ tr('撤回上一版', 'Undo') }}
              </button>
              <button
                type="button"
                class="pe-btn pe-btn--primary"
                :class="{ 'is-copied': copied }"
                :disabled="busy || !hasResult"
                @click="copyResult"
              >
                {{ copied ? tr('✓ 已复制', '✓ Copied') : tr('一键复制', 'Copy Result') }}
              </button>
            </div>
          </div>
        </section>
      </form>

      <!-- 下方诊断与迭代区（仅在有结果时呈现） -->
      <div v-if="current && hasResult" class="pe-insights">
        <!-- 质量检查总览 -->
        <section class="pe-panel pe-quality">
          <div class="pe-section-bar">
            <div class="pe-section-bar__title">
              <h2>{{ tr('质量检查', 'Quality Check') }}</h2>
              <span class="pe-badge pe-badge--accent">
                {{
                  tr(
                    `${qualitySummary.ok}/${qualitySummary.total} 项达标`,
                    `${qualitySummary.ok}/${qualitySummary.total} passed`,
                  )
                }}
              </span>
              <span v-if="qualitySummary.attention" class="pe-badge pe-badge--amber">
                {{ tr(`${qualitySummary.attention} 项建议补充`, `${qualitySummary.attention} to review`) }}
              </span>
            </div>
          </div>
          <ul class="pe-check-grid">
            <li
              v-for="item in current.checks"
              :key="item.id"
              class="pe-check"
              :class="`pe-check--${item.status}`"
            >
              <span class="pe-check__icon" aria-hidden="true">
                {{ item.status === 'attention' ? '!' : item.status === 'improved' ? '✦' : '✓' }}
              </span>
              <div class="pe-check__body">
                <strong>{{ item.label }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            </li>
          </ul>
        </section>

        <!-- 改动说明 & 待确认信息（支持一键回填） -->
        <div
          v-if="current.changes.length || current.questions.length"
          class="pe-detail-grid"
          :class="{ 'pe-detail-grid--single': !current.changes.length || !current.questions.length }"
        >
          <section v-if="current.changes.length" class="pe-panel pe-card-list">
            <h2>{{ tr('本次优化说明', 'What Changed') }}</h2>
            <ul class="pe-changes">
              <li v-for="(change, idx) in current.changes" :key="idx">{{ change }}</li>
            </ul>
          </section>

          <section v-if="current.questions.length" class="pe-panel pe-card-list pe-card-list--questions">
            <div class="pe-section-bar">
              <h2>{{ tr('待确认信息', 'Details to Clarify') }}</h2>
              <span class="pe-hint-inline">
                {{ tr('点击可一键回填补充', 'Click to answer') }}
              </span>
            </div>
            <ul class="pe-questions">
              <li v-for="(question, idx) in current.questions" :key="idx" class="pe-question-item">
                <span>{{ question }}</span>
                <button
                  type="button"
                  class="pe-chip pe-chip--action"
                  :disabled="busy"
                  @click="answerQuestion(question)"
                >
                  + {{ tr('补充', 'Answer') }}
                </button>
              </li>
            </ul>
          </section>
        </div>

        <!-- 继续迭代优化（AI 模式支持按反馈改写） -->
        <section v-if="mode === 'ai'" class="pe-panel pe-refine">
          <div class="pe-section-bar">
            <label for="prompt-feedback" class="pe-refine__title">{{ tr('继续调整当前版本', 'Refine This Version') }}</label>
            <div class="pe-examples">
              <button
                v-for="item in QUICK_FEEDBACKS"
                :key="item.label"
                type="button"
                class="pe-chip"
                :disabled="busy || !canRefine"
                @click="useQuickFeedback(item.text)"
              >
                + {{ item.label }}
              </button>
            </div>
          </div>

          <textarea
            id="prompt-feedback"
            ref="feedbackField"
            v-model="feedback"
            class="pe-textarea pe-textarea--short"
            :readonly="busy"
            maxlength="4000"
            :placeholder="
              tr(
                '输入微调要求或待确认问题的答案，例如：缩短到 200 字以内、项目名称为「智阅」、交付日期顺延至下周五…',
                'Describe adjustments or answer the questions above, e.g. shorten under 200 words, set new delivery date to next Friday…',
              )
            "
            @keydown="onFeedbackKeydown"
          />

          <div class="pe-pane__foot">
            <p v-if="!canRefine" class="pe-warn-inline">
              {{ tr('原始提示词已修改，请先点击上方「重新增强」。', 'Original draft changed. Run Re-enhance above first.') }}
            </p>
            <span v-else class="pe-stats">
              {{ tr('基于当前版本增量改写，保留其他已确认约束', 'Revises current prompt incrementally while keeping other constraints') }}
            </span>

            <button
              type="button"
              class="pe-btn pe-btn--primary"
              :disabled="busy || !canRefine || !feedback.trim()"
              @click="enhance(true)"
            >
              <span>{{ tr('按反馈改写', 'Apply Feedback') }}</span>
              <kbd class="pe-kbd" aria-hidden="true">Ctrl ↵</kbd>
            </button>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pe-page {
  padding-top: calc(var(--nav-h) + 40px);
  padding-bottom: 88px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---------- 头部 ---------- */
.pe-head {
  margin-bottom: 24px;
}

.pe-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.pe-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-1);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.pe-back:hover {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.pe-label {
  margin-bottom: 0;
}

.pe-sub {
  max-width: 720px;
  margin-bottom: 0;
}

/* ---------- 顶部紧凑控制栏 ---------- */
.pe-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--bg-3), var(--bg-1));
  box-shadow: inset 0 1px 0 var(--card-top-sheen);
}

.pe-bar__group {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.pe-bar__label {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-faint);
  white-space: nowrap;
}

.pe-seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg-2);
}

.pe-seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  line-height: 1.2;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.pe-seg__btn:hover:not(:disabled) {
  color: var(--ink);
}

.pe-seg__btn.is-active {
  color: var(--accent);
  background: var(--bg-3);
  border-color: var(--accent-border);
  box-shadow: 0 2px 6px rgba(13, 43, 62, 0.06);
  font-weight: 600;
}

.pe-seg__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.pe-seg__btn.is-active .pe-seg__dot {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.pe-config-toggle {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid var(--line-bright);
  border-radius: 10px;
  background: var(--bg-3);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.pe-config-toggle:hover:not(:disabled),
.pe-config-toggle.is-open {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.pe-config-toggle__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--amber);
}

.pe-config-toggle.is-ready .pe-config-toggle__dot {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.pe-config-toggle__model {
  font-weight: 600;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pe-config-toggle__state {
  color: var(--ink-dim);
}

.pe-config-toggle__caret {
  color: var(--ink-faint);
}

/* ---------- 通用面板 ---------- */
.pe-panel {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--bg-3), var(--bg-1));
  box-shadow: inset 0 1px 0 var(--card-top-sheen);
}

/* ---------- AI 配置抽屉 ---------- */
.pe-config {
  margin: 0 0 16px;
  padding: 16px 18px;
}

.pe-config__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 12px;
}

.pe-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.pe-field__label {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-dim);
}

.pe-field input {
  width: 100%;
  min-width: 0;
  padding: 9px 12px;
  border: 1px solid var(--line-bright);
  border-radius: var(--radius-sm);
  background: var(--bg-3);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pe-field input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.pe-key-wrap {
  display: flex;
  gap: 6px;
}

.pe-key-eye {
  flex: none;
  padding: 0 11px;
  border: 1px solid var(--line-bright);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  transition: border-color 0.2s ease, color 0.2s ease;
}

.pe-key-eye:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.pe-config__note {
  margin-top: 12px;
  font-size: var(--fs-sm);
  line-height: 1.6;
  color: var(--ink-faint);
}

/* ---------- 状态提示条 ---------- */
.pe-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--bg-1);
  font-size: var(--fs-md);
  color: var(--ink);
}

.pe-notice--success {
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.pe-notice--error {
  border-color: color-mix(in srgb, var(--danger) 38%, transparent);
  background: color-mix(in srgb, var(--danger) 8%, var(--bg-1));
}

.pe-notice__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--on-accent);
  background: var(--accent);
}

.pe-notice--error .pe-notice__icon {
  background: var(--danger);
  color: #fff;
}

.pe-notice__text {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}

.pe-notice__close {
  flex: none;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-dim);
  font-size: 16px;
  line-height: 1;
}

.pe-notice__close:hover {
  background: var(--bg-2);
  color: var(--ink);
}

/* ---------- 主双栏工作台 ---------- */
.pe-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
  gap: 18px;
  align-items: stretch;
}

.pe-pane {
  display: flex;
  flex-direction: column;
  padding: 18px;
  gap: 14px;
  transition: border-color 0.25s ease;
}

.pe-pane--output.is-busy {
  border-color: var(--accent-border);
}

.pe-pane__head {
  display: grid;
  gap: 10px;
}

.pe-pane__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pe-pane__title {
  font-family: var(--font-mono);
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.pe-output-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pe-counter {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

/* ---------- 示例与轻标签 ---------- */
.pe-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.pe-examples__label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
  margin-inline-end: 2px;
}

.pe-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-2);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.3;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
}

.pe-chip:hover:not(:disabled) {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.pe-chip--action {
  flex: none;
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-soft);
}

.pe-chip--action:hover:not(:disabled) {
  background: var(--accent);
  color: var(--on-accent);
}

.pe-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.pe-badge--accent {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
}

.pe-badge--amber {
  border-color: var(--amber-border);
  background: var(--amber-soft);
  color: var(--amber);
}

/* ---------- 文本输入域 ---------- */
.pe-textarea {
  width: 100%;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg-3);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: var(--fs-lg);
  line-height: 1.72;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pe-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.pe-textarea::placeholder {
  color: var(--ink-faint);
}

.pe-textarea--draft {
  min-height: 250px;
  flex: 1 1 auto;
}

.pe-textarea--result {
  min-height: 310px;
  height: 100%;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  line-height: 1.7;
}

.pe-textarea--short {
  min-height: 92px;
  font-size: var(--fs-md);
}

/* ---------- 补充背景折叠块 ---------- */
.pe-context {
  border: 1px dashed var(--line-bright);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
  overflow: hidden;
}

.pe-context__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  text-align: left;
  transition: color 0.2s ease;
}

.pe-context__toggle:hover {
  color: var(--accent);
}

.pe-context__arrow {
  margin-inline-start: auto;
  color: var(--ink-faint);
}

.pe-context__body {
  padding: 0 12px 12px;
}

/* ---------- 右侧视图切换 ---------- */
.pe-tabs {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-2);
}

.pe-tabs__btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.pe-tabs__btn:hover {
  color: var(--ink);
}

.pe-tabs__btn.is-active {
  background: var(--bg-3);
  color: var(--accent);
  font-weight: 600;
}

/* ---------- 输出内容容器 ---------- */
.pe-output-body {
  flex: 1 1 auto;
  min-height: 310px;
  display: flex;
  flex-direction: column;
}

/* 空态：6步概览 */
.pe-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 18px;
  border: 1px dashed var(--line-bright);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
}

.pe-empty__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pe-empty__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 10px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 16px;
}

.pe-empty__head h3 {
  font-size: var(--fs-lg);
  color: var(--ink);
  margin-bottom: 3px;
}

.pe-empty__head p {
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.pe-stage-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.pe-stage-card {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg-1);
}

.pe-stage-card__num {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--accent);
  letter-spacing: 0.08em;
}

.pe-stage-card strong {
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--ink);
}

.pe-stage-card span:last-child {
  font-size: var(--fs-xs);
  color: var(--ink-dim);
  line-height: 1.45;
}

/* 加载态：6步动态步骤条 */
.pe-pipeline-loading {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-sm);
  background: radial-gradient(ellipse at 0 0, var(--accent-soft), transparent 65%), var(--bg-2);
}

.pe-pipeline-loading__title {
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--accent);
  font-weight: 600;
}

.pe-stage-list {
  list-style: none;
  display: grid;
  gap: 8px;
}

.pe-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--bg-1);
  opacity: 0.52;
  transition: opacity 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
}

.pe-stage.is-done {
  opacity: 0.9;
  border-color: var(--accent-border);
}

.pe-stage.is-active {
  opacity: 1;
  border-color: var(--accent);
  background: var(--accent-soft);
}

.pe-stage__num {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
  border: 1px solid var(--line-bright);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
}

.pe-stage.is-done .pe-stage__num,
.pe-stage.is-active .pe-stage__num {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}

.pe-stage__info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  min-width: 0;
}

.pe-stage__info strong {
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--ink);
}

.pe-stage__info span {
  font-size: var(--fs-xs);
  color: var(--ink-dim);
}

/* 阅读视图：高可读性排版 */
.pe-reader {
  flex: 1 1 auto;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg-3);
  overflow-y: auto;
  max-height: 520px;
  color: var(--ink);
  font-size: var(--fs-lg);
  line-height: 1.85;
}

.pe-reader__h {
  font-family: var(--font-mono);
  color: var(--accent);
  margin: 14px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px dashed var(--line);
}

.pe-reader__h:first-child {
  margin-top: 0;
}

.pe-reader__h--1 {
  font-size: var(--fs-xl);
}

.pe-reader__h--2 {
  font-size: var(--fs-md);
}

.pe-reader__h--3 {
  font-size: var(--fs-base);
}

.pe-reader__p {
  margin: 6px 0;
  color: var(--ink);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.pe-reader__list {
  margin: 6px 0 8px;
  padding-inline-start: 20px;
  display: grid;
  gap: 5px;
  overflow-wrap: anywhere;
}

.pe-reader__list li {
  color: var(--ink);
}

.pe-reader__code {
  margin: 8px 0;
  padding: 11px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--bg-2);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  overflow-x: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.pe-inline-code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.pe-placeholder {
  display: inline-block;
  padding: 0 6px;
  border-radius: 5px;
  border: 1px solid var(--amber-border);
  background: var(--amber-soft);
  color: var(--amber);
  font-family: var(--font-mono);
  font-size: 0.9em;
  font-weight: 600;
}

.pe-edit-wrap {
  flex: 1 1 auto;
  display: flex;
}

/* 对比视图 */
.pe-compare {
  flex: 1 1 auto;
  display: grid;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
}

.pe-compare__block {
  display: grid;
  gap: 6px;
}

.pe-compare__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
}

.pe-compare__text {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: 1.68;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.pe-compare__text--before {
  background: var(--bg-2);
  color: var(--ink-dim);
}

.pe-compare__text--after {
  background: var(--bg-3);
  border-color: var(--accent-border);
  color: var(--ink);
}

/* ---------- 面板底部操作栏 ---------- */
.pe-pane__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
}

.pe-pane__foot-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
}

.pe-stats {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

.pe-warn-inline {
  font-size: var(--fs-sm);
  color: var(--amber);
}

/* ---------- 按钮 ---------- */
.pe-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line-bright);
  background: var(--bg-3);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  font-weight: 500;
  line-height: 1.2;
  transition:
    transform 0.16s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.pe-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.pe-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.pe-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.pe-btn--subtle {
  background: transparent;
  border-color: var(--line);
  color: var(--ink-dim);
}

.pe-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}

.pe-btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--on-accent);
  box-shadow: var(--glow);
}

.pe-btn--primary.is-copied {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.pe-btn--danger {
  border-color: color-mix(in srgb, var(--danger) 45%, transparent);
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
}

.pe-btn--danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

.pe-kbd {
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--on-accent) 32%, transparent);
  background: color-mix(in srgb, var(--on-accent) 14%, transparent);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  opacity: 0.9;
}

/* ---------- 诊断、质量检查与迭代区 ---------- */
.pe-insights {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.pe-quality,
.pe-card-list,
.pe-refine {
  padding: 16px 18px;
}

.pe-section-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pe-section-bar__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pe-quality h2,
.pe-card-list h2,
.pe-refine__title {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.pe-hint-inline {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

.pe-check-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pe-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg-2);
}

.pe-check--improved {
  border-color: var(--accent-border);
  background: color-mix(in srgb, var(--accent-soft) 55%, var(--bg-2));
}

.pe-check--attention {
  border-color: var(--amber-border);
  background: color-mix(in srgb, var(--amber-soft) 65%, var(--bg-2));
}

.pe-check__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  margin-top: 1px;
  background: var(--accent-soft);
  color: var(--accent);
}

.pe-check--attention .pe-check__icon {
  background: var(--amber-soft);
  color: var(--amber);
}

.pe-check__body {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.pe-check__body strong {
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--ink);
}

.pe-check__body p {
  font-size: var(--fs-xs);
  line-height: 1.5;
  color: var(--ink-dim);
}

.pe-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.pe-detail-grid--single {
  grid-template-columns: minmax(0, 1fr);
}

.pe-changes {
  margin: 10px 0 0;
  padding-inline-start: 18px;
  display: grid;
  gap: 7px;
  font-size: var(--fs-md);
  color: var(--ink-dim);
  line-height: 1.6;
}

.pe-questions {
  list-style: none;
  display: grid;
  gap: 8px;
}

.pe-question-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--amber-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--amber-soft) 50%, var(--bg-2));
  font-size: var(--fs-md);
  color: var(--ink);
  line-height: 1.55;
}

.pe-refine {
  display: grid;
  gap: 10px;
}

/* ---------- 折叠动画 ---------- */
.pe-fold-enter-active,
.pe-fold-leave-active {
  transition: opacity 0.2s ease, transform 0.2s var(--ease-out);
}

.pe-fold-enter-from,
.pe-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- 响应式 ---------- */
@media (max-width: 960px) {
  .pe-workbench {
    grid-template-columns: minmax(0, 1fr);
  }

  .pe-check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pe-config__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 680px) {
  .pe-page {
    padding-top: calc(var(--nav-h) + 24px);
    padding-bottom: 64px;
  }

  .pe-bar {
    padding: 12px;
  }

  .pe-config-toggle {
    width: 100%;
    justify-content: space-between;
    margin-inline-start: 0;
  }

  .pe-pane {
    padding: 14px;
  }

  .pe-stage-grid,
  .pe-check-grid,
  .pe-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .pe-kbd {
    display: none;
  }
}
</style>
