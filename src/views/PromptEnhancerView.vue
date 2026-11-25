<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { useI18n } from '../i18n'
import { copyText } from '../utils/clipboard'
import { enhancePrompt } from '../utils/enhancePrompt'
import { completionEndpoint, rewritePrompt, type RewriteResult } from '../utils/rewritePrompt'

const { isZh } = useI18n()
const tr = (zh: string, en: string) => isZh.value ? zh : en
const draft = ref('')
const result = ref('')
const status = ref('')
const copied = ref(false)
const mode = ref<'local' | 'ai'>('ai')
const endpoint = ref('https://api.deepseek.com')
const model = ref('deepseek-flash')
const apiKey = ref('')
const busy = ref(false)
const context = ref('')
const style = ref<'concise' | 'balanced' | 'detailed'>('concise')
const feedback = ref('')
const changes = ref<string[]>([])
const questions = ref<string[]>([])
const sourceDraft = ref('')
const versions = ref<RewriteResult[]>([])
const canRefine = computed(() => !!result.value.trim() && sourceDraft.value === draft.value.trim())
let request: AbortController | undefined
onBeforeUnmount(() => request?.abort())
const draftField = useTemplateRef('draftField')
const example = computed(() => tr(
  '帮我写一封给客户的邮件，说明项目延期，并提出下一步安排。',
  'Write an email to a client explaining a project delay and proposing next steps.',
))
function applyResult(output: RewriteResult) {
  if (result.value.trim() && sourceDraft.value === draft.value.trim()) {
    versions.value = [...versions.value.slice(-9), {
      prompt: result.value, changes: [...changes.value], questions: [...questions.value],
    }]
  } else {
    versions.value = []
  }
  result.value = output.prompt
  changes.value = output.changes
  questions.value = output.questions
  sourceDraft.value = draft.value.trim()
  feedback.value = ''
  resetFeedback()
}

function undo() {
  const previous = versions.value.pop()
  if (!previous) return
  result.value = previous.prompt
  changes.value = previous.changes
  questions.value = previous.questions
  resetFeedback()
}

async function enhance(refine = false) {
  const text = draft.value.trim()
  if (!text || busy.value) return
  resetFeedback()
  if (refine && (!canRefine.value || !feedback.value.trim())) return
  if (mode.value === 'local') {
    applyResult({ prompt: enhancePrompt(text, isZh.value), changes: [], questions: [] })
    return
  }
  let url: URL
  try {
    url = completionEndpoint(endpoint.value)
  } catch {
    status.value = tr('请输入完整的 HTTPS 接口地址，地址中请勿包含凭据、查询参数或片段。', 'Enter a full HTTPS endpoint without credentials, query parameters, or a fragment.')
    return
  }
  if (!model.value.trim() || !apiKey.value.trim()) {
    status.value = tr('请输入模型名称和 API 密钥。', 'Enter a model name and API key.')
    return
  }

  const controller = new AbortController()
  request = controller
  busy.value = true
  let timedOut = false
  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 90_000)
  try {
    const output = await rewritePrompt({
      endpoint: url,
      model: model.value.trim(),
      key: apiKey.value.trim(),
      draft: text,
      context: context.value.trim(),
      style: style.value,
      previousPrompt: refine ? result.value : '',
      feedback: refine ? feedback.value.trim() : '',
    }, controller.signal)
    if (typeof output === 'number') {
      const hints: Record<number, [string, string]> = {
        401: ['密钥无效或已过期。', 'The key is invalid or expired.'],
        403: ['当前密钥没有调用权限。', 'This key lacks permission.'],
        404: ['接口地址或模型不存在，请检查配置。', 'Check the endpoint and model name.'],
        429: ['调用频率或额度受限，请稍后重试或检查余额。', 'Rate or quota limit reached. Retry later or check your balance.'],
      }
      const hint = hints[output] ?? ['模型服务暂时无法处理请求，请稍后重试。', 'The service cannot process this request. Try again later.']
      status.value = `HTTP ${output} · ${tr(...hint)}`
    } else if (output) {
      if (controller.signal.aborted) return
      applyResult(output)
      status.value = tr('AI 改写完成。', 'AI rewrite complete.')
    } else {
      status.value = tr('接口未返回符合约定的完整提示词。请重试或切换模型。', 'The response did not contain a complete prompt in the expected format. Retry or try another model.')
    }
  } catch {
    if (timedOut) {
      status.value = tr('AI 改写超时，请重试。', 'The AI rewrite timed out. Try again.')
    } else if (controller.signal.aborted) {
      status.value = tr('已停止，保留现有结果。', 'Stopped. The existing result is preserved.')
    } else {
      status.value = tr('接口调用失败。请检查网络，以及接口是否允许浏览器跨域请求。', 'Request failed. Check your connection and whether the endpoint allows cross-origin browser requests.')
    }
  } finally {
    window.clearTimeout(timer)
    request = undefined
    busy.value = false
  }
}

function resetFeedback() {
  copied.value = false
  status.value = ''
}

function clearAll() {
  draft.value = ''
  result.value = ''
  context.value = ''
  feedback.value = ''
  sourceDraft.value = ''
  changes.value = []
  questions.value = []
  versions.value = []
  resetFeedback()
  draftField.value?.focus()
}

async function copyResult() {
  const text = result.value
  const success = await copyText(text)
  if (text !== result.value) return
  copied.value = success
  status.value = success
    ? tr('已复制。', 'Copied.')
    : tr('复制失败，请手动选中并复制。', 'Copy failed. Select and copy the text manually.')
}
</script>

<template>
  <section class="section">
    <div class="container">
      <RouterLink to="/tools">{{ tr('← 返回工具', '← Back to Tools') }}</RouterLink>
      <h1 class="section-title">{{ tr('提示词增强', 'Prompt enhancer') }}</h1>
      <p class="section-sub">{{ tr('用本地规则或自选模型整理草稿，补充交付要求和待确认信息。', 'Refine a draft with local rules or a model you configure.') }}</p>

      <form class="workspace" @submit.prevent="enhance()">
        <fieldset class="editor settings" :disabled="busy">
          <label>
            {{ tr('增强方式', 'Enhancement mode') }}
            <select v-model="mode" @change="resetFeedback">
              <option value="local">{{ tr('本地增强', 'Local enhancement') }}</option>
              <option value="ai">{{ tr('AI 改写', 'AI rewrite') }}</option>
            </select>
          </label>
          <template v-if="mode === 'ai'">
            <label>{{ tr('接口地址（兼容 Chat Completions）', 'Endpoint (Chat Completions compatible)') }}
              <input v-model="endpoint" type="url" placeholder="https://api.example.com/v1/chat/completions" required />
            </label>
            <label>{{ tr('模型名称', 'Model name') }} <input v-model="model" required /></label>
            <label>{{ tr('API 密钥', 'API key') }} <input v-model="apiKey" type="password" autocomplete="off" required /></label>
            <label>{{ tr('改写方式', 'Rewrite style') }}
              <select v-model="style">
                <option value="concise">{{ tr('精简 · 少量调整', 'Concise · minimal edits') }}</option>
                <option value="balanced">{{ tr('均衡 · 清晰可执行', 'Balanced · actionable') }}</option>
                <option value="detailed">{{ tr('详细 · 步骤与验收要求', 'Detailed · steps and checks') }}</option>
              </select>
            </label>
            <p class="settings-note">{{ tr('只填写你信任的接口。草稿和密钥会发送到该地址，页面不会保存密钥。', 'Use a trusted endpoint. Your draft and key are sent there. The page does not persist your key.') }}</p>
            <p class="settings-note">{{ tr('默认 DeepSeek V4.1 Flash，精简改写。官方接口关闭思考模式，每次操作调用一次。', 'Defaults to DeepSeek V4.1 Flash with concise rewrites. Thinking is disabled on the official endpoint; each action makes one request.') }}</p>
          </template>
        </fieldset>
        <details v-if="mode === 'ai'" class="editor">
          <summary>{{ tr('补充背景与材料（可选）', 'Context and source material (optional)') }}</summary>
          <label for="prompt-context">{{ tr('受众、已有资料、限制条件，或待确认问题的答案', 'Audience, source material, constraints, or answers to clarification questions') }}</label>
          <textarea id="prompt-context" v-model="context" :readonly="busy" maxlength="24000" class="short-input" />
        </details>
        <div class="editors">
          <div class="editor">
            <label for="prompt-draft">{{ tr('原始提示词', 'Original prompt') }}</label>
            <textarea id="prompt-draft" ref="draftField" v-model="draft" :readonly="busy" required maxlength="12000" :placeholder="example" />
            <div class="actions">
              <button class="clear" type="button" :disabled="busy || (!draft && !result && !context && !feedback)" @click="clearAll">{{ tr('清空全部', 'Clear all') }}</button>
              <button type="button" :disabled="busy" @click="draft = example">{{ tr('填入示例', 'Use example') }}</button>
              <button class="primary" type="submit" :disabled="busy || !draft.trim()">{{ busy ? tr('正在改写…', 'Rewriting…') : tr('增强提示词', 'Enhance prompt') }}</button>
              <button v-if="busy" type="button" @click="request?.abort()">{{ tr('停止', 'Stop') }}</button>
            </div>
          </div>
          <div class="editor">
            <label for="prompt-result">{{ tr('增强结果', 'Enhanced prompt') }}</label>
            <textarea id="prompt-result" v-model="result" :readonly="busy" @input="resetFeedback" />
            <div class="actions">
              <button type="button" :disabled="busy || !versions.length" @click="undo">{{ tr('撤回上一版', 'Undo last rewrite') }}</button>
              <button class="primary" type="button" :disabled="busy || !result.trim()" @click="copyResult">
                {{ copied ? tr('✓ 已复制', '✓ Copied') : tr('一键复制', 'Copy result') }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="mode === 'ai' && (changes.length || questions.length)" class="editors">
          <section v-if="changes.length" class="editor">
            <h2>{{ tr('改动说明', 'What changed') }}</h2>
            <ul><li v-for="(change, index) in changes" :key="index">{{ change }}</li></ul>
          </section>
          <section v-if="questions.length" class="editor">
            <h2>{{ tr('待确认信息', 'Details to clarify') }}</h2>
            <ul><li v-for="(question, index) in questions" :key="index">{{ question }}</li></ul>
          </section>
        </div>
        <section v-if="mode === 'ai' && result" class="editor">
          <label for="prompt-feedback">{{ tr('继续调整', 'Refine this version') }}</label>
          <textarea id="prompt-feedback" v-model="feedback" :readonly="busy" maxlength="4000" class="short-input"
            :placeholder="tr('例如：缩短到 200 字，保留交付要求；或填写待确认问题的答案。', 'For example: shorten to 200 words while keeping the deliverables, or answer the clarification questions.')" />
          <p v-if="!canRefine" class="settings-note">{{ tr('原始提示词已修改，请先重新增强。', 'The original draft changed. Generate a new rewrite first.') }}</p>
          <div class="actions">
            <button class="primary" type="button" :disabled="busy || !canRefine || !feedback.trim()" @click="enhance(true)">{{ tr('按反馈改写', 'Apply feedback') }}</button>
          </div>
        </section>
        <p class="status" :class="{ 'status--hidden': copied || !status }" role="status">{{ status }}</p>
      </form>
    </div>
  </section>
</template>

<style scoped>
.section-title { margin-top: 16px; }
.workspace { display: grid; gap: 16px; margin-top: 24px; }
.editor {
  min-width: 0;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--bg-1);
}
.editors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.editor, label { display: grid; gap: 8px; }
details.editor { display: block; }
details.editor[open] > label { margin-top: 16px; margin-bottom: 8px; }
summary { cursor: pointer; }
.editor h2 { font-size: 1rem; margin: 0; }
.editor ul { margin: 0; padding-inline-start: 20px; overflow-wrap: anywhere; }
.editor li { margin-block: 6px; }
.short-input { min-height: 100px; }
.settings { grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); }
.settings-note { grid-column: 1 / -1; margin: 4px 0 0; font-size: .875rem; }
textarea, button, input, select {
  font: inherit;
  color: inherit;
  border: 1px solid var(--line-bright);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--bg-3);
}
textarea, input, select { width: 100%; min-width: 0; }
textarea { resize: vertical; min-height: 250px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.clear { margin-inline-end: auto; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .55; }
.actions button:not(:disabled):hover { border-color: var(--accent); }
.primary { color: var(--accent); background: var(--accent-soft); border-color: var(--accent-border); font-weight: 700; }
.status { margin: 0; overflow-wrap: anywhere; }
.status--hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (max-width: 700px) {
  .editors { grid-template-columns: minmax(0, 1fr); }
}
</style>
