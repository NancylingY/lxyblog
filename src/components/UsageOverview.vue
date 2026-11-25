<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

const props = defineProps<{ endpoint: string; chinese: boolean }>()
const text = (zh: string, en: string) => props.chinese ? zh : en

type UsageRow = { source: string; model: string; minute: number; input: number; output: number; cached: number; written: number; reasoning: number; requests: number; total: number }
type ModelTotals = { source: string; model: string; input: number; output: number; cached: number; written: number; reasoning: number; requests: number; total: number }
type Snapshot = { ws?: unknown[]; models?: unknown[]; sess?: { w: number; r: unknown[][] }[]; buckets?: Record<string, unknown>[] }

const rows = shallowRef<UsageRow[]>([])
const updated = ref<number>()
const period = ref(7)
const source = ref('')
const modelQuery = ref('')
const showAll = ref(false)
const loading = ref(false)
const failed = ref(false)
let inFlight: AbortController | undefined

const periods = [
  { days: 1, zh: '24 小时', en: '24 hours' },
  { days: 7, zh: '7 天', en: '7 days' },
  { days: 30, zh: '30 天', en: '30 days' },
]
const formatter = computed(() => new Intl.NumberFormat(props.chinese ? 'zh-CN' : 'en-US'))
const number = (value: number) => formatter.value.format(value)
const choices = computed(() => [...new Set(rows.value.map(row => row.source))].sort())
const classified = (name: string) => name.startsWith('T3 Code · ') ? name : /^(?:Trae|TRAE)(?:\b|\s|[·：])/i.test(name) ? 'Trae' : 'WorkBuddy'

function count(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function normalize(data: Snapshot): UsageRow[] {
  if (Array.isArray(data.buckets)) {
    return data.buckets.flatMap(bucket => {
      if (!bucket || typeof bucket.source !== 'string' || !bucket.source) return []
      const minute = Math.floor(count(bucket.ts) / 60)
      if (!minute) return []
      const input = count(bucket.input)
      const output = count(bucket.output)
      const cached = Math.min(input, count(bucket.cached))
      return [{ source: bucket.source, model: typeof bucket.model === 'string' ? bucket.model : '',
        minute, input, output, cached, written: Math.min(input - cached, count(bucket.cache_written)),
        reasoning: count(bucket.reasoning), requests: count(bucket.records), total: count(bucket.total) || input + output }]
    })
  }
  if (!Array.isArray(data.ws) || !Array.isArray(data.models) || !Array.isArray(data.sess)) {
    throw new Error('Unexpected usage response')
  }
  const workspaceNames = data.ws
  const models = data.models
  return data.sess.flatMap(session => {
    if (!session || !Array.isArray(session.r)) return []
    const workspace = workspaceNames[session.w]
    const source = classified(typeof workspace === 'string' ? workspace : '')
    return session.r.flatMap(record => {
      if (!Array.isArray(record)) return []
      const model = models[count(record[1])]
      const minute = count(record[0])
      if (typeof model !== 'string' || !minute || typeof record[1] !== 'number') return []
      const input = count(record[3])
      const cached = Math.min(input, count(record[5]))
      return [{ source, model, minute, input, output: count(record[4]), cached,
        written: Math.min(input - cached, count(record[6])), reasoning: count(record[7]), requests: 1, total: count(record[2]) }]
    })
  })
}

async function refresh() {
  inFlight?.abort()
  const request = new AbortController()
  inFlight = request
  loading.value = true
  failed.value = false
  const timer = window.setTimeout(() => request.abort(), 9000)
  try {
    const response = await fetch(props.endpoint, { cache: 'no-store', credentials: 'same-origin', signal: request.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const next = normalize(await response.json())
    if (request !== inFlight) return
    rows.value = next
    updated.value = Date.now()
    if (source.value && !choices.value.includes(source.value)) source.value = ''
  } catch {
    if (request === inFlight) failed.value = true
  } finally {
    window.clearTimeout(timer)
    if (request === inFlight) loading.value = false
  }
}

const summary = computed(() => {
  const end = (updated.value ?? Date.now()) / 60000
  const start = end - period.value * 1440
  const groups = new Map<string, ModelTotals>()
  const total = { input: 0, output: 0, cached: 0, written: 0, reasoning: 0, requests: 0, total: 0 }
  for (const row of rows.value) {
    if (row.minute < start || row.minute > end || (source.value && source.value !== row.source)) continue
    const key = JSON.stringify([row.source, row.model])
    let group = groups.get(key)
    if (!group) {
      group = { source: row.source, model: row.model, input: 0, output: 0, cached: 0, written: 0, reasoning: 0, requests: 0, total: 0 }
      groups.set(key, group)
    }
    for (const item of [group, total]) {
      item.input += row.input
      item.output += row.output
      item.cached += row.cached
      item.written += row.written
      item.reasoning += row.reasoning
      item.requests += row.requests
      item.total += row.total
    }
  }
  return { total, groups: [...groups.values()].sort((a, b) => b.total - a.total) }
})

const filtered = computed(() => {
  const query = modelQuery.value.trim().toLowerCase()
  return summary.value.groups.filter(group => (group.model || group.source).toLowerCase().includes(query))
})
const hasModelDetails = computed(() => summary.value.groups.some(group => group.model))
const visible = computed(() => showAll.value ? filtered.value : filtered.value.slice(0, 8))
const cacheRate = computed(() => summary.value.total.input
  ? new Intl.NumberFormat(props.chinese ? 'zh-CN' : 'en-US', {
    style: 'percent', maximumFractionDigits: 1,
  }).format(summary.value.total.cached / summary.value.total.input)
  : '—')
const updatedLabel = computed(() => updated.value ? new Intl.DateTimeFormat(props.chinese ? 'zh-CN' : 'en-US', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(updated.value) : '')

onMounted(refresh)
onBeforeUnmount(() => {
  const request = inFlight
  inFlight = undefined
  request?.abort()
})
</script>

<template>
  <section class="usage-overview" aria-labelledby="usage-overview-title">
    <header class="usage-heading">
      <div>
        <h3 id="usage-overview-title">{{ text('用量概览', 'Usage overview') }}</h3>
        <p v-if="updatedLabel" class="updated">{{ text('读取于', 'Read at') }} {{ updatedLabel }}</p>
      </div>
      <button class="btn btn--ghost refresh" type="button" :disabled="loading" @click="refresh">
        {{ loading ? text('读取中…', 'Loading…') : text('刷新', 'Refresh') }}
      </button>
    </header>

    <p v-if="failed" class="notice" role="status">
      {{ updated ? text('刷新失败，仍显示上次读取的统计。', 'Refresh failed. Showing the previous snapshot.')
        : text('暂时无法读取概览，可在下方看板查看。', 'The overview is unavailable. See the dashboard below.') }}
    </p>
    <p v-else-if="loading && !updated" class="notice" role="status">{{ text('正在读取用量…', 'Loading usage…') }}</p>

    <template v-if="updated">
      <div class="filters">
        <div class="segments" role="group" :aria-label="text('时间范围', 'Date range')">
          <button v-for="item in periods" :key="item.days" type="button" :aria-pressed="period === item.days"
            @click="period = item.days; showAll = false">{{ text(item.zh, item.en) }}</button>
        </div>
        <label class="source-select">
          <span>{{ text('来源', 'Source') }}</span>
          <select v-model="source" @change="showAll = false">
            <option value="">{{ text('全部来源', 'All sources') }}</option>
            <option v-for="name in choices" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
      </div>

      <dl class="metrics">
        <div><dt>{{ text('总 Token', 'Total tokens') }}</dt><dd>{{ number(summary.total.total) }}</dd></div>
        <div><dt>{{ text('输入', 'Input') }}</dt><dd>{{ number(summary.total.input) }}</dd></div>
        <div><dt>{{ text('输出', 'Output') }}</dt><dd>{{ number(summary.total.output) }}</dd></div>
        <div><dt>{{ text('缓存命中率', 'Cache hit rate') }}</dt><dd>{{ cacheRate }}</dd></div>
      </dl>

      <div v-if="summary.groups.length" class="breakdown">
        <div class="breakdown-heading">
          <h4>{{ hasModelDetails ? text('模型明细', 'Model breakdown') : text('来源明细', 'Source breakdown') }}</h4>
          <input v-model="modelQuery" type="search" :aria-label="hasModelDetails ? text('搜索模型', 'Search models') : text('搜索来源', 'Search sources')"
            :placeholder="hasModelDetails ? text('搜索模型', 'Search models') : text('搜索来源', 'Search sources')" @input="showAll = false">
        </div>
        <div v-if="visible.length" class="table-scroll" tabindex="0" role="region" :aria-label="text('用量明细表', 'Usage breakdown table')">
          <table>
            <thead><tr>
              <th scope="col">{{ hasModelDetails ? text('模型 / 来源', 'Model / Source') : text('来源', 'Source') }}</th>
              <th scope="col">{{ text('总 Token', 'Total tokens') }}</th>
              <th scope="col">{{ text('输入', 'Input') }}</th>
              <th scope="col">{{ text('输出', 'Output') }}</th>
              <th scope="col">{{ text('缓存读取', 'Cache read') }}</th>
              <th scope="col">{{ text('缓存写入', 'Cache write') }}</th>
              <th scope="col">{{ text('推理', 'Reasoning') }}</th>
              <th scope="col">{{ text('记录数', 'Records') }}</th>
            </tr></thead>
            <tbody><tr v-for="row in visible" :key="JSON.stringify([row.source, row.model])">
              <th scope="row">{{ row.model || row.source }}<small v-if="row.model">{{ row.source }}</small></th>
              <td>{{ number(row.total) }}</td><td>{{ number(row.input) }}</td>
              <td>{{ number(row.output) }}</td><td>{{ number(row.cached) }}</td>
              <td>{{ row.written ? number(row.written) : '—' }}</td>
              <td>{{ row.reasoning ? number(row.reasoning) : '—' }}</td><td>{{ number(row.requests) }}</td>
            </tr></tbody>
          </table>
        </div>
        <p v-else class="notice">{{ text('未找到匹配项。', 'No matching results.') }}</p>
        <button v-if="filtered.length > 8" class="btn btn--ghost more" type="button" @click="showAll = !showAll">
          {{ showAll ? text('收起', 'Show less') : text('显示全部', 'Show all') }}
        </button>
      </div>
      <p v-else class="notice">{{ text('所选范围没有用量记录。', 'No usage in this range.') }}</p>
    </template>
  </section>
</template>

<style scoped>
.usage-overview { margin-top: 22px; padding: clamp(14px, 3vw, 26px); border: 1px solid var(--line);
  border-radius: var(--radius-sm); background: var(--bg-1); color: var(--ink); }
.usage-heading, .filters, .breakdown-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.usage-heading h3 { margin: 0; font-size: clamp(1.15rem, 2vw, 1.5rem); }
.updated, .notice, small { color: var(--ink-dim); font-size: .82rem; }
.updated { margin: 4px 0 0; }
.notice { margin: 14px 0 0; }
.refresh { min-width: 5rem; }
.filters { margin-top: 18px; }
.segments { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid var(--line); border-radius: 8px; }
.segments button { border: 1px solid transparent; background: transparent; color: var(--ink-dim); border-radius: 5px;
  padding: 5px 10px; font: inherit; font-size: .84rem; cursor: pointer; }
.segments button[aria-pressed='true'] { color: var(--accent); background: var(--accent-soft); border-color: var(--accent-border); }
.source-select { display: flex; gap: 8px; align-items: center; font-size: .84rem; color: var(--ink-dim); }
input, select { min-height: 34px; border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px;
  color: var(--ink); background: var(--bg-0); font: inherit; font-size: .84rem; }
input { width: min(100%, 215px); }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 14px 0 20px; }
.metrics > div { border: 1px solid var(--line); background: var(--bg-0); border-radius: 8px; padding: 10px 12px; }
.metrics dt { color: var(--ink-dim); font-size: .8rem; }
.metrics dd { margin: 3px 0 0; color: var(--ink); font-size: clamp(1rem, 2.6vw, 1.65rem);
  font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.breakdown-heading { margin-bottom: 8px; }
.breakdown-heading h4 { margin: 0; font-size: 1rem; }
.table-scroll { overflow: auto; border: 1px solid var(--line); border-radius: 8px; }
table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: .81rem;
  font-variant-numeric: tabular-nums; text-align: right; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); }
thead th { color: var(--ink-dim); white-space: nowrap; }
tr:last-child td, tbody tr:last-child th { border-bottom: 0; }
th:first-child { text-align: left; overflow-wrap: anywhere; }
small { display: block; font-weight: 400; }
.more { margin-top: 10px; }
@media (max-width: 650px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>

