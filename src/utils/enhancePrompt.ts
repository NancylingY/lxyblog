type Copy = readonly [zh: string, en: string]

interface TaskRule {
  matches: RegExp
  deliverable: Copy
  missing: readonly { present: RegExp; label: Copy }[]
}

const email: TaskRule = {
  matches: /(?:写|起草|拟|回复|润色|改写|生成)[^。！？\n]{0,20}(?:邮件|电邮)|\b(?:write|draft|compose|rewrite|reply to)\b[^.!?\n]{0,45}\b(?:email|e-mail)\b/i,
  deliverable: [
    '按原要求起草邮件。若未指定结构，提供主题和正文，用适合收件人和沟通目的的语气。',
    'Draft the email as requested. If no structure is specified, include a subject and body, with a tone suited to the recipient and purpose.',
  ],
  missing: [
    { present: /收件人|发给|给.{1,20}(?:邮件|写信)|客户|同事|老师|领导|recipient|client|customer|manager|colleague|email\s+to\b/i, label: ['收件人', 'Recipient'] },
  ],
}

const delayEmail: TaskRule = {
  ...email,
  deliverable: [
    '起草延期通知邮件。若未指定结构，提供主题和正文，说明延期情况、已知影响和下一步安排。',
    'Draft a delay notification email. If no structure is specified, include a subject and body covering the delay, known impact, and next steps.',
  ],
  missing: [
    ...email.missing,
    { present: /(?:项目名称|项目名|project name)\s*[:：]\s*\S|[「『《“][^」』》”]+[」』》”]\s*项目/i, label: ['项目名称', 'Project name'] },
    { present: /(?:原因|reason)\s*[:：]\s*\S|由于|因为|\b(?:because|due to)\b/i, label: ['延期原因', 'Reason for delay'] },
    { present: /(?:延期至|推迟到|交付日期\s*[:：]|new delivery date\s*[:：]|(?:delayed|postponed) until)\s*[^\s，。,.!?]|\d{1,2}月\d{1,2}[日号]|\b\d{4}-\d{2}-\d{2}\b/i, label: ['预计交付日期', 'Expected delivery date'] },
  ],
}

const coding: TaskRule = {
  matches: /(?:写|实现|修复|重构|调试|优化)[^。！？\n]{0,22}(?:代码|函数|脚本|组件|接口|bug)|\b(?:write|implement|fix|refactor|debug)\b[^.!?\n]{0,40}\b(?:code|function|script|component|bug|endpoint)\b/i,
  deliverable: [
    '按要求给出实现或修复，覆盖已描述的输入和边界情况。若原要求允许，附上最小使用或验证示例。',
    'Provide the requested implementation or fix and cover the stated inputs and edge cases. Include a minimal usage or verification example if the request allows.',
  ],
  missing: [
    { present: /语言\s*[:：]|环境\s*[:：]|\b(?:python|javascript|typescript|java|rust|golang|vue|react|node\.js|sql|c\+\+)\b/i, label: ['编程语言或运行环境', 'Language or runtime'] },
  ],
}

const summary: TaskRule = {
  matches: /总结|概括|摘要|提炼要点|\b(?:summari[sz]e|summary|recap|key takeaways)\b/i,
  deliverable: [
    '依据原材料提炼关键结论和支撑信息。材料含有明确的决定、待办或截止时间时，一并保留。沿用原要求的篇幅和格式。',
    'Extract the main conclusions and supporting details from the source. Include decisions, action items, and deadlines where stated. Follow the requested length and format.',
  ],
  missing: [
    { present: /https?:\/\/|已上传|附件|\b(?:attached|attachment)\b|\n\s*\S|(?:材料|原文|source)\s*[:：]\s*\S/i, label: ['原文或材料链接', 'Source text or link'] },
  ],
}

export function enhancePrompt(draft: string, preferChinese: boolean): string {
  const input = draft.trim()
  if (!input) return ''

  const englishWords = input.match(/[a-z]{2,}/gi)?.length ?? 0
  const hanCharacters = input.match(/\p{Script=Han}/gu)?.length ?? 0
  const chinese = hanCharacters === englishWords ? preferChinese : hanCharacters > englishWords
  const localize = ([zh, en]: Copy) => chinese ? zh : en

  // Multiple task types can appear in one draft. Keep their original scope intact.
  const matches = [email, coding, summary].filter((rule) => rule.matches.test(input))
  const [matched] = matches
  let rule = matches.length === 1 ? matched : undefined
  if (rule === email && /延期|延迟交付|\b(?:delay|postpone|reschedule)\w*\b/i.test(input)) {
    rule = delayEmail
  }

  const deliverable = rule?.deliverable ?? [
    '按原要求交付可直接使用的结果。若未指定格式，采用适合任务的结构。',
    'Provide a usable result that follows the original request. If no format is specified, choose one suited to the task.',
  ]
  const sections = [
    localize(['## 任务', '## Task']),
    input,
    '',
    localize(['## 交付要求', '## Deliverable']),
    localize(deliverable),
    localize([
      '以原要求为准。保留已给出的事实、格式和限制。遇到影响结果的缺项或冲突时，先提出具体问题。',
      'Follow the original requirements. Preserve stated facts, format, and constraints. Ask focused questions about gaps or conflicts that affect the result.',
    ]),
  ]

  const missing = rule?.missing.filter((field) => !field.present.test(input)) ?? []
  if (missing.length) {
    sections.push(
      '',
      localize(['## 待确认信息', '## Details to confirm']),
      localize([
        '以下字段如原文已提供，直接沿用。需要先给草稿时，用方括号保留仍缺失的字段。',
        'Use any details already supplied. If a draft is needed first, keep any unresolved fields as bracketed placeholders.',
      ]),
      ...missing.map((field) => `- [${localize(field.label)}]`),
    )
  }
  return sections.join('\n')
}
