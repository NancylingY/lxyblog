import type {
  EnhanceStyle,
  EnhancementResult,
  PromptExample,
  PromptIntent,
  PromptIntentId,
} from './promptTypes'
import {
  computeEnhancementStats,
  detectChineseLanguage,
  evaluatePromptQuality,
} from './promptQuality'

type Copy = readonly [zh: string, en: string]

interface SlotCheck {
  present: RegExp
  label: Copy
  question: Copy
}

interface ConstraintRule {
  alreadyStated?: RegExp
  text: Copy
  priority: 'core' | 'standard'
}

interface IntentProfile {
  id: PromptIntentId
  key: string
  matches: RegExp
  scoreBoost?: RegExp
  /** 判定是否为简洁标准指令（命中后直接输出自然顺滑的 WorkBuddy 直发句式，不再重复原话） */
  canonicalOnly?: RegExp
  label: Copy
  /** WorkBuddy 标准直发指令（精简模式核心句式） */
  directPrompt: Copy
  /** 当用户附带了额外业务限定时，追加到直发指令中以 100% 保留原意图 */
  directWithFocus?: (cleaned: string, isZh: boolean) => string
  /** 核心补全要素（供均衡/详细模式使用） */
  elements: readonly Copy[]
  /** 执行/检查要点（供详细模式使用） */
  steps: readonly Copy[]
  constraints: readonly ConstraintRule[]
  outputFormat: Copy
  acceptance: Copy
  slots: readonly SlotCheck[]
}

export const PROMPT_EXAMPLES: readonly PromptExample[] = [
  {
    id: 'project-memory',
    tag: ['读取项目记忆', 'Project memory'],
    draft: ['读取项目记忆', 'Read project memory'],
  },
  {
    id: 'security-fix',
    tag: ['修复项目漏洞', 'Fix vulnerabilities'],
    draft: ['修复项目漏洞', 'Fix project vulnerabilities'],
  },
  {
    id: 'progress-report',
    tag: ['汇报项目进展', 'Progress report'],
    draft: ['汇报项目进展', 'Write a project progress report'],
  },
  {
    id: 'form-submit',
    tag: ['新增表单提交', 'Form submission'],
    draft: ['我要新增一个表单提交功能', 'I want to add a form submission feature'],
  },
  {
    id: 'delay-email',
    tag: ['延期邮件', 'Delay email'],
    draft: [
      '你好，麻烦帮我写一封给客户的邮件，说明项目延期一周并提出下一步安排，谢谢。',
      'Hi, please help me write an email to a client explaining a one-week project delay and next steps. Thanks!',
    ],
  },
]

const PROFILES: readonly IntentProfile[] = [
  // 1. 读取项目记忆 / 上下文梳理（严格只读）
  {
    id: 'summary',
    key: 'project-memory',
    matches:
      /(?:读取|查看|加载|获取|整理|梳理|回顾)[^。！？\n]{0,16}(?:项目记忆|上下文记录|项目上下文|记忆|项目背景)|\b(?:read|load|check|review|summari[sz]e)\b[^.!?\n]{0,30}\b(?:project\s+memory|project\s+context|memory\s+files?)\b/i,
    scoreBoost: /记忆|上下文|memory|context/i,
    canonicalOnly: /^(?:请)?(?:读取|查看|加载|获取)(?:当前)?(?:项目)?(?:记忆|上下文)(?:记录)?[。.]?$|^(?:read|load)\s+(?:the\s+)?project\s+(?:memory|context)[.]?$/i,
    label: ['项目记忆读取', 'Project Memory Recall'],
    directPrompt: [
      '请读取当前项目中可用的记忆或上下文记录，提取并汇总与项目目标、技术栈、架构约定、开发进度、未完成事项和关键约束相关的信息。输出简洁清晰的项目记忆摘要，并标明信息来源；若未找到相关记录，请说明未找到，不要修改任何代码或文件。',
      'Read all available memory or context records in the current project and summarize information related to project goals, tech stack, architecture conventions, development progress, open tasks, and key constraints. Output a concise, clear project memory summary with explicit sources; if no records are found, state so clearly without modifying any code or files.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请读取当前项目中可用的记忆或上下文记录，围绕「${stripEndPunct(cleaned)}」，提取并汇总与项目目标、技术栈、架构约定、开发进度、未完成事项和关键约束相关的信息。输出简洁清晰的项目记忆摘要，并标明信息来源；若未找到相关记录，请说明未找到，不要修改任何代码或文件。`
        : `Read available memory or context records in the current project, focusing on "${stripEndPunct(cleaned)}", and summarize project goals, tech stack, architecture conventions, progress, open items, and key constraints. Output a concise summary with sources; if none exist, state so without modifying any code or files.`,
    elements: [
      ['项目目标、业务背景与核心技术栈', 'Project goals, domain background, and core tech stack'],
      ['架构约定、目录结构与编码/部署规范', 'Architecture conventions, directory layout, and coding/deployment rules'],
      ['当前开发进度、未完成事项与关键约束条件', 'Current progress, unfinished tasks, and key constraints'],
    ],
    steps: [
      ['检索当前工作区中可用的记忆文档、说明文件或上下文记录。', 'Locate available memory notes, project docs, or context records in the workspace.'],
      ['按主题提炼关键信息，去除重复或过期表述，并记录对应文件路径或来源。', 'Extract key points by topic, deduplicate stale info, and record exact file paths/sources.'],
      ['若无可用记录或某维度缺失，如实标注未找到，不做猜测或补写。', 'Explicitly note missing records or gaps without guessing or fabricating details.'],
    ],
    constraints: [
      {
        text: ['仅执行只读梳理，不要修改任何代码或文件。', 'Read-only inspection: do not modify any code or files.'],
        priority: 'core',
      },
      {
        text: ['输出中需标明每类信息的来源；若未找到相关记录，请直接说明未找到，严禁编造。', 'Cite the source for each section; if no records exist, state so clearly without inventing facts.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '输出简洁清晰的项目记忆摘要（按维度分点），并标明信息来源。',
      'Output a concise project memory summary grouped by dimension, with explicit sources.',
    ],
    acceptance: [
      '核对所有摘要均可追溯至实际记录，且工作区未产生任何文件改动。',
      'Verify every item traces back to an actual record and no workspace files were altered.',
    ],
    slots: [],
  },

  // 2. 修复项目漏洞 / 安全审查与修复
  {
    id: 'coding',
    key: 'security-fix',
    matches:
      /(?:修复|排查|审查|扫描|解决|处理)[^。！？\n]{0,20}(?:漏洞|安全风险|安全隐患|安全问题|CVE|注入|XSS|CSRF|越权)|\b(?:fix|patch|audit|resolve|remediate)\b[^.!?\n]{0,36}\b(?:vulnerabilit(?:y|ies)|security\s+(?:issues?|risks?|flaws?)|cve|xss|csrf|injection)\b/i,
    scoreBoost: /漏洞|安全|CVE|XSS|CSRF|注入|越权|vulnerabilit|security/i,
    canonicalOnly: /^(?:请)?(?:审查并)?(?:修复|排查|解决)(?:当前)?(?:项目)?(?:安全)?漏洞[。.]?$|^(?:fix|patch)\s+(?:the\s+)?project\s+vulnerabilities[.]?$/i,
    label: ['安全审计与漏洞修复', 'Security Audit & Patch'],
    directPrompt: [
      '请审查当前项目的代码、依赖配置与关键接口，修复可确认的安全漏洞，优先处理高危风险，并尽量保持改动最小且不影响现有功能。请列出每个漏洞的位置、影响、修复内容及验证结果，确保项目仍可正常构建和运行。',
      'Review the current project’s code, dependency configurations, and key endpoints to fix confirmed security vulnerabilities—prioritizing high-severity risks while keeping changes minimal and preserving existing functionality. List each vulnerability’s location, impact, fix details, and verification results, and confirm the project still builds and runs cleanly.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」审查当前项目的代码、依赖配置与关键接口，修复可确认的安全漏洞，优先处理高危风险，并尽量保持改动最小且不影响现有功能。请列出每个漏洞的位置、影响、修复内容及验证结果，确保项目仍可正常构建和运行。`
        : `Focus on "${stripEndPunct(cleaned)}" while reviewing the project's code, dependencies, and key endpoints to fix confirmed security vulnerabilities—prioritizing high-severity risks with minimal changes that preserve existing behavior. List each vulnerability's location, impact, fix, and verification results, ensuring the project builds and runs normally.`,
    elements: [
      ['全面审查范围：业务源码、依赖配置（如 package/lock 文件）与关键接口/鉴权入口', 'Audit scope: application source code, dependency configs, and critical endpoints/auth boundaries'],
      ['分级修复策略：仅修复可确认的安全漏洞，按高危 → 中危顺序优先处理', 'Triage strategy: fix confirmed vulnerabilities only, prioritizing high-severity risks first'],
      ['验证闭环：对每项修复进行验证，并确认项目完整构建与核心功能运行正常', 'Verification loop: verify each fix and confirm full project build and runtime health'],
    ],
    steps: [
      ['扫描并审查代码实现、依赖版本配置及对外/敏感接口，识别可确认的安全漏洞。', 'Audit source code, dependencies, and critical endpoints to identify confirmed vulnerabilities.'],
      ['按风险等级排序，优先以最小侵入方式修复高危漏洞，避免无关重构。', 'Prioritize high-severity issues and apply minimal-impact patches without unrelated refactoring.'],
      ['运行构建与回归检查，逐条整理漏洞清单与验证结果。', 'Run build/regression checks and document each fix with verification results.'],
    ],
    constraints: [
      {
        text: ['仅修复可确认的真实漏洞，优先处理高危风险，避免无依据改动或过度重构。', 'Fix only confirmed vulnerabilities, prioritizing high-severity risks without speculative edits.'],
        priority: 'core',
      },
      {
        text: ['尽量保持改动最小且不影响现有功能，修复后需确保项目可正常构建和运行。', 'Keep changes minimal and backward-compatible; ensure the project still builds and runs cleanly.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按漏洞逐条列出：漏洞位置、风险影响、具体修复内容及验证结果（含构建与运行状态）。',
      'List for each vulnerability: location, impact, fix applied, and verification results (including build/run status).',
    ],
    acceptance: [
      '确认高危漏洞已关闭、改动聚焦最小、项目构建通过且原有核心功能不受影响。',
      'Confirm high-severity risks are resolved, diffs remain minimal, build passes, and core features work normally.',
    ],
    slots: [],
  },

  // 3. 汇报项目进展 / 项目周报与状态汇报
  {
    id: 'writing',
    key: 'progress-report',
    matches:
      /(?:汇报|撰写|写|整理|生成|输出)[^。！？\n]{0,18}(?:项目进展|项目进度|工作进展|进度汇报|项目周报|阶段汇报)|\b(?:write|draft|prepare|create)\b[^.!?\n]{0,30}\b(?:project\s+)?(?:progress\s+report|status\s+(?:report|update))\b/i,
    scoreBoost: /进展|进度|周报|汇报|progress|status\s+report/i,
    canonicalOnly: /^(?:请)?(?:帮我)?(?:撰写|写|整理)?(?:一份)?(?:汇报)?(?:项目)?(?:进展|进度)(?:汇报)?[。.]?$|^(?:write|draft)\s+(?:a\s+)?project\s+progress\s+report[.]?$/i,
    label: ['项目进展汇报', 'Project Progress Report'],
    directPrompt: [
      '请根据提供的项目信息撰写一份项目进展汇报，内容包括当前阶段、已完成工作、正在进行任务、关键里程碑达成情况、当前风险与问题、资源或协作需求，以及下一步计划和时间安排。要求结构清晰、语言简洁，突出成果、阻塞原因及改进措施；如信息不足，请标注待补充，不要编造。',
      'Draft a project progress report based on the provided project information covering: current phase, completed work, in-progress tasks, key milestone status, current risks and issues, resource or collaboration needs, and next steps with timeline. Keep the structure clear and wording concise, highlighting achievements, blockers, and corrective actions; mark any missing details as TBD without fabricating facts.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请根据提供的项目信息，围绕「${stripEndPunct(cleaned)}」撰写一份项目进展汇报，内容包括当前阶段、已完成工作、正在进行任务、关键里程碑达成情况、当前风险与问题、资源或协作需求，以及下一步计划和时间安排。要求结构清晰、语言简洁，突出成果、阻塞原因及改进措施；如信息不足，请标注待补充，不要编造。`
        : `Based on the provided project information and focusing on "${stripEndPunct(cleaned)}", write a project progress report covering current phase, completed work, in-progress tasks, milestone status, risks/issues, resource or collaboration needs, and next steps with timeline. Keep it structured and concise, highlighting outcomes, blockers, and mitigations; mark missing details as TBD without fabricating.`,
    elements: [
      ['当前阶段、已完成工作与正在进行的重点任务', 'Current phase, completed work, and active tasks'],
      ['关键里程碑达成情况（含节点偏差说明）', 'Key milestone status (including any schedule variance)'],
      ['当前风险与问题（阻塞原因 + 改进措施）及资源/协作需求', 'Current risks & blockers (root causes + mitigations) and resource/collaboration needs'],
      ['下一步工作计划与明确的时间安排', 'Next-step plan with clear timeline'],
    ],
    steps: [
      ['梳理已提供的阶段成果与任务状态，优先提炼可量化产出。', 'Summarize confirmed outcomes and task statuses, prioritizing measurable progress.'],
      ['归类核心风险与阻塞原因，配套说明对应改进措施与协作诉求。', 'Highlight blockers with concrete mitigation actions and any needed support.'],
      ['列出下阶段行动计划与时间节点，缺失字段统一标注 [待补充]。', 'Outline next steps and dates, marking any unprovided fields as [TBD].'],
    ],
    constraints: [
      {
        text: ['结构清晰、语言简洁，重点突出成果、阻塞原因及改进措施，避免空洞套话。', 'Keep structure clear and language concise, emphasizing outcomes, blockers, and actions rather than filler.'],
        priority: 'core',
      },
      {
        text: ['严格依据提供的项目信息；如信息不足，请标注待补充，严禁编造数据或进度。', 'Ground strictly in supplied project info; mark missing details as TBD and never fabricate progress or metrics.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「当前阶段 / 已完成工作 / 进行中任务 / 里程碑达成 / 风险问题与措施 / 资源协作需求 / 下一步计划与排期」清晰分节输出。',
      'Organize into clear sections: Current Phase, Completed, In Progress, Milestones, Risks & Mitigations, Resource Needs, and Next Steps & Timeline.',
    ],
    acceptance: [
      '核对各项进展均有依据，阻塞项具备对应改进措施，缺失信息均明确标注待补充。',
      'Verify every update is grounded in source info, blockers have actions, and gaps are marked TBD.',
    ],
    slots: [
      {
        present: /已完成|进行中|里程碑|阶段|本周|本月|上线|联调|阻塞|风险|\n.{15,}|(?:背景|信息|记录|进展|completed|milestone|blocker)\s*[:：]\s*\S/i,
        label: ['项目当前进展与基础事实', 'Current project updates & facts'],
        question: ['请补充项目当前阶段、已完成事项、进行中任务或关键风险（可在左侧「补充背景」粘贴原始工作记录）。', 'Share the current phase, completed items, ongoing tasks, or blockers (paste notes in Context on the left).'],
      },
    ],
  },

  // 4. 新增表单提交功能（前端/全栈具体交互功能）
  {
    id: 'coding',
    key: 'feature-form',
    matches:
      /(?:新增|增加|添加|实现|开发|写|做|补一个)[^。！？\n]{0,22}(?:表单提交|提交表单|表单功能)|\b(?:add|create|implement|build)\b[^.!?\n]{0,32}\bform\s+submi(?:t|ssion)\b/i,
    scoreBoost: /表单|form/i,
    canonicalOnly: /^(?:请)?(?:在现有项目中)?(?:新增|增加|添加|实现|做)(?:一个)?表单提交(?:功能)?[。.]?$|^(?:add|implement)\s+(?:a\s+)?form\s+submission(?:\s+feature)?[.]?$/i,
    label: ['功能开发 · 表单提交', 'Feature · Form Submission'],
    directPrompt: [
      '请在现有项目中新增一个表单提交功能，包含必要的表单字段、必填项与格式校验、提交按钮、提交中状态以及成功/失败反馈。实现时保持项目现有结构和交互风格，防止重复提交，并妥善处理空值、格式错误和提交失败等边界情况。',
      'Add a form submission feature to the existing project, including necessary form fields, required-field and format validation, a submit button, loading/submitting state, and success/failure feedback. Follow the project’s existing architecture and UI conventions, prevent duplicate submissions, and properly handle edge cases such as empty values, format errors, and submission failures.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请在现有项目中实现「${stripEndPunct(cleaned)}」，包含必要的表单字段、必填项与格式校验、提交按钮、提交中状态以及成功/失败反馈。实现时保持项目现有结构和交互风格，防止重复提交，并妥善处理空值、格式错误和提交失败等边界情况。`
        : `Implement "${stripEndPunct(cleaned)}" in the existing project, including necessary form fields, required/format validation, submit button, submitting state, and success/error feedback. Match the existing project structure and interaction style, prevent duplicate submissions, and handle empty values, invalid formats, and failed requests cleanly.`,
    elements: [
      ['表单交互要素：必要表单字段、必填项与格式校验、清晰错误提示', 'Form UI & validation: required fields, format validation, and clear inline errors'],
      ['提交状态闭环：提交按钮、提交中（Loading/禁用）状态、成功与失败反馈', 'Submission states: submit action, loading/disabled state, and success/error feedback'],
      ['边界处理：防重复提交、空值裁剪、格式错误拦截与网络/接口失败兜底', 'Edge cases: duplicate-submit guard, empty-value handling, invalid format checks, and failure recovery'],
    ],
    steps: [
      ['先参考项目现有组件结构、样式变量与交互风格确定表单接入位置。', 'Inspect existing components, design tokens, and interaction patterns to align placement and styling.'],
      ['实现表单状态管理、字段必填与格式校验逻辑，并接入防重复提交与加载态控制。', 'Implement form state, required/format validation, duplicate-submission prevention, and loading states.'],
      ['补齐成功/失败反馈提示及空值、格式错误、异常提交的边界验证。', 'Add success/error feedback and verify empty, malformed, and failed submission edge cases.'],
    ],
    constraints: [
      {
        text: ['保持项目现有目录结构、代码规范与整体交互风格一致，不引入无关改动。', 'Keep implementation aligned with existing project structure, conventions, and interaction style.'],
        priority: 'core',
      },
      {
        text: ['必须防止重复提交，并妥善处理空值、格式错误和提交失败等边界情况。', 'Prevent duplicate submissions and handle empty inputs, invalid formats, and submission errors gracefully.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '提供完整可集成的表单实现代码、关键状态与校验逻辑说明，以及核心边界场景验证方式。',
      'Deliver ready-to-integrate form code, a brief summary of validation/state logic, and key edge-case checks.',
    ],
    acceptance: [
      '验证空提交、非法格式、连续快速点击提交及接口失败时的状态与反馈均正常。',
      'Verify empty submit, invalid format, rapid double-click prevention, and error-state feedback.',
    ],
    slots: [],
  },

  // 5. 延期沟通邮件
  {
    id: 'writing',
    key: 'delay-email',
    matches:
      /(?:写|起草|拟|回复|润色|改写|生成|发)[^。！？\n]{0,24}(?:邮件|电邮)|\b(?:write|draft|compose|rewrite|reply to|send)\b[^.!?\n]{0,45}\b(?:email|e-mail)\b/i,
    scoreBoost: /延期|推迟|延迟交付|顺延|\b(?:delay|postpone|reschedule|slip)\w*\b/i,
    label: ['商务邮件 · 延期说明', 'Client Email · Delay Notice'],
    directPrompt: [
      '请起草一封发给客户的延期说明邮件，包含清晰的邮件主题与正文，先坦诚说明项目延期情况及原因，再补充已知影响、补救措施与下一步时间安排。要求语气专业克制、重点突出，严格依据已有事实，未提供的项目名称或新交付日期请用方括号标注待补充，不要编造。',
      'Draft a client delay notification email with a clear subject and body: state the delay and confirmed reason upfront, followed by known impact, mitigation steps, and next-step schedule. Keep the tone professional and accountable, rely only on stated facts, and mark any unprovided project name or revised date as bracketed placeholders without fabricating details.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请按需求「${stripEndPunct(cleaned)}」起草邮件，提供清晰的邮件主题与正文，说明延期情况、已知影响、补救措施与下一步安排。要求语气专业克制、语言简洁，严格依据已提供的事实，未给出的具体项目名称或日期用方括号标注待补充，不要编造。`
        : `Draft the email per "${stripEndPunct(cleaned)}" with a clear subject and body covering the delay, known impact, mitigation, and next steps. Keep the tone professional and concise, stick strictly to stated facts, and use bracketed placeholders for any unprovided specifics.`,
    elements: [
      ['清晰主题与首段结论：直接交代项目延期调整', 'Clear subject line and upfront delay update'],
      ['客观说明原因与已知影响，避免推诿或冗长铺垫', 'Objective explanation of cause and scope of impact'],
      ['具体补救措施、调整后时间节点与下次同步安排', 'Concrete mitigation plan, revised timeline, and next check-in'],
    ],
    steps: [
      ['拟定简明邮件主题，正文首段直接说明进度调整。', 'Draft a direct subject line and state the schedule change in the opening paragraph.'],
      ['简述已确认的延期原因与影响范围，提出明确补救方案。', 'Summarize confirmed cause/impact and outline concrete mitigation steps.'],
      ['说明下一步时间安排与联系人，未提供的信息保留方括号占位。', 'Specify next steps and contact point, keeping missing details as bracketed placeholders.'],
    ],
    constraints: [
      {
        alreadyStated: /语气|正式|客气|礼貌|专业|\b(?:tone|formal|polite|professional)\b/i,
        text: ['语气专业、坦诚、有担当，避免套话与空洞致歉。', 'Use an accountable, professional tone; avoid clichés and hollow filler.'],
        priority: 'core',
      },
      {
        text: ['严格依据已提供事实，未提供的项目名称、日期或承诺用方括号标注待补充，不要编造。', 'Use only provided facts; mark missing project names or dates as bracketed placeholders without inventing details.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「邮件主题 + 邮件正文」输出，可直接复制发送。',
      'Output as Subject + Body ready to copy and send.',
    ],
    acceptance: [
      '确认包含延期结论、原因/影响、下一步安排，且无虚构日期或承诺。',
      'Verify the delay, cause/impact, and next steps are clear with zero fabricated dates or commitments.',
    ],
    slots: [
      {
        present: /收件人|发给|给.{1,18}(?:邮件|写信)|客户|同事|领导|老师|recipient|client|customer|manager|colleague|email\s+to\b/i,
        label: ['收件人/称呼', 'Recipient'],
        question: ['收件人是谁（如客户姓名/职位或合作团队），希望使用什么称呼？', 'Who is the recipient and preferred salutation?'],
      },
      {
        present: /(?:项目名称|项目名|project name)\s*[:：]\s*\S|[「『《“][^」』》”]+[」』》”]\s*项目/i,
        label: ['项目名称', 'Project name'],
        question: ['涉及的具体项目名称是什么？', 'What is the specific project name?'],
      },
      {
        present: /(?:原因|reason)\s*[:：]\s*\S|由于|因为|主要是|\b(?:because|due to)\b/i,
        label: ['延期原因', 'Reason for delay'],
        question: ['需要向对方说明的延期原因或影响范围是什么？', 'What confirmed reason or impact should be shared?'],
      },
      {
        present: /(?:延期至|推迟到|交付日期\s*[:：]|new delivery date\s*[:：]|(?:delayed|postponed) until)\s*[^\s，。,.!?]|\d{1,2}月\d{1,2}[日号]|\b\d{4}-\d{2}-\d{2}\b/i,
        label: ['预计新交付日期', 'Revised delivery date'],
        question: ['调整后的预计交付日期或下一次同步时间是什么？', 'What is the revised delivery date or next check-in time?'],
      },
    ],
  },

  // 6. 通用邮件写作
  {
    id: 'writing',
    key: 'email',
    matches:
      /(?:写|起草|拟|回复|润色|改写|生成|发)[^。！？\n]{0,24}(?:邮件|电邮)|\b(?:write|draft|compose|rewrite|reply to|send)\b[^.!?\n]{0,45}\b(?:email|e-mail)\b/i,
    label: ['邮件写作', 'Email Writing'],
    directPrompt: [
      '请按要求起草一封结构清晰、重点突出的邮件，提供邮件主题与正文，开篇说明沟通目的并明确下一步期望动作。语气贴合收件人身份、简洁自然；仅依据已提供事实，缺失信息以方括号标注待补充，不要编造。',
      'Draft a clear, purposeful email with a subject and body that states the goal upfront and clarifies any requested next step. Match the tone to the recipient, keep wording concise, and mark any unprovided specifics as bracketed placeholders without fabricating facts.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」起草邮件，提供清晰的邮件主题与正文，开篇点明目的并明确下一步期望动作。要求语气得体简洁，仅基于已有事实，未提供的细节以方括号标注待补充，不要编造。`
        : `Draft an email for "${stripEndPunct(cleaned)}" with a clear subject and body stating the purpose upfront and the requested next step. Keep the tone appropriate and concise, and use bracketed placeholders for missing details.`,
    elements: [
      ['简明邮件主题与开篇核心诉求', 'Concise subject line and upfront core ask'],
      ['分层呈现关键事实或待确认事项', 'Structured supporting facts or items'],
      ['明确的结尾行动项或期望回复节点', 'Clear closing call to action or reply timeline'],
    ],
    steps: [
      ['提炼直奔主题的标题与开篇目的句。', 'Write a direct subject line and opening purpose statement.'],
      ['分点补充必要信息，控制篇幅便于快速阅读。', 'Organize supporting details concisely for quick scanning.'],
      ['明确收件人需配合的动作或时间节点。', 'Close with clear next steps or expected reply timing.'],
    ],
    constraints: [
      {
        alreadyStated: /语气|正式|轻松|委婉|礼貌|\b(?:tone|formal|casual|polite)\b/i,
        text: ['语气贴合收件人关系，直接自然，避免客套冗余。', 'Match tone to the recipient; avoid generic filler.'],
        priority: 'core',
      },
      {
        text: ['仅使用已有事实，未提供的时间、姓名或细节以方括号标注待补充。', 'Use only stated facts; mark missing details as bracketed placeholders.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '输出「主题 + 正文」结构，可直接发送。',
      'Output as Subject + Body ready to send.',
    ],
    acceptance: [
      '确认邮件目的清晰、收件人行动项明确、无虚构事实。',
      'Confirm purpose, requested action, and factual accuracy.',
    ],
    slots: [
      {
        present: /收件人|发给|给.{1,18}(?:邮件|写信)|客户|同事|领导|老师|HR|面试官|recipient|client|customer|manager|colleague|email\s+to\b/i,
        label: ['收件人及身份', 'Recipient'],
        question: ['收件人是谁（如客户、主管、同事），希望采用正式还是偏日常的语气？', 'Who is the recipient and preferred tone?'],
      },
    ],
  },

  // 7. 代码排错与修复
  {
    id: 'coding',
    key: 'coding-debug',
    matches:
      /(?:修复|修一下|排查|调试|解决|定位|看看)[^。！？\n]{0,28}(?:bug|报错|异常|错误|问题|崩溃|失败|401|403|404|500|接口|代码)|\b(?:fix|debug|troubleshoot|diagnose|resolve)\b[^.!?\n]{0,45}\b(?:bug|error|exception|issue|crash|failure|endpoint|code|api)\b/i,
    label: ['代码排错与修复', 'Debugging & Bug Fix'],
    directPrompt: [
      '请排查并修复当前问题，先定位触发根因并给出最小化修改方案，同时覆盖空值、异常与边界情况。实现时尽量保持现有对外接口和核心逻辑不变，列出问题原因、修改位置与验证步骤，确保项目仍可正常构建和运行。',
      'Diagnose and fix the issue by identifying the root cause first and applying a minimal patch that covers null, error, and edge cases. Preserve existing public interfaces and core behavior, and provide root cause, changed locations, and verification steps confirming the project builds and runs normally.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」排查根因并给出最小化修复方案，覆盖相关异常与边界情况。修改时保持现有对外接口和无关逻辑兼容，不引入无依据改动，并说明根因、修改内容及验证步骤，确保项目可正常构建和运行。`
        : `Diagnose and apply a minimal fix for "${stripEndPunct(cleaned)}", covering relevant error and edge cases. Keep existing public interfaces compatible without unrelated refactoring, and report root cause, changes made, and verification steps.`,
    elements: [
      ['问题根因与触发路径定位', 'Root cause and trigger path analysis'],
      ['最小侵入式修复改动与边界异常处理', 'Minimal-impact patch with edge-case & error handling'],
      ['复现与回归验证步骤（含构建运行确认）', 'Reproduction and regression verification steps'],
    ],
    steps: [
      ['分析报错现象与相关上下文，锁定可确认的根本原因。', 'Analyze symptoms and context to confirm the root cause.'],
      ['实施最小改动修复并补齐空值、并发或异常边界防护。', 'Apply a minimal fix covering null, concurrency, or error edge cases.'],
      ['给出验证步骤与回归结果，确认不影响既有功能与构建。', 'Provide verification steps confirming existing behavior and builds remain healthy.'],
    ],
    constraints: [
      {
        alreadyStated: /兼容|不改.*(?:格式|接口|签名|API)|\b(?:backward|compatible|without changing|preserve.*schema|interface)\b/i,
        text: ['保持现有对外接口与核心逻辑向后兼容，尽量保持改动最小。', 'Preserve existing public interfaces and keep changes minimal.'],
        priority: 'core',
      },
      {
        text: ['覆盖异常与边界分支，不编造未查看的源码或库 API，确保可正常构建运行。', 'Cover edge cases, avoid inventing unseen code/APIs, and ensure builds/tests pass.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「根因说明 → 修改内容与位置 → 验证步骤」清晰输出。',
      'Output as: Root Cause → Changes & Locations → Verification Steps.',
    ],
    acceptance: [
      '确认修复直击根因、未违反原稿限制、构建与关键回归验证通过。',
      'Confirm the root cause is resolved, all constraints are respected, and build/regression checks pass.',
    ],
    slots: [
      {
        present: /```|报错信息|堆栈|日志|错误码|代码片段|复现|401|403|404|500|\b(?:stack trace|error log|repro|snippet|attached)\b/i,
        label: ['相关代码或报错日志', 'Relevant code or error log'],
        question: ['如有具体代码片段、报错堆栈或复现路径，可补充到左侧「补充背景」中以提升定位精度。', 'Share any relevant code snippet, stack trace, or repro steps in Context for more precise debugging.'],
      },
    ],
  },

  // 8. 功能新增 / 代码实现与重构
  {
    id: 'coding',
    key: 'coding-build',
    matches:
      /(?:写|实现|开发|重构|封装|优化|编写|新增|增加|添加)[^。！？\n]{0,26}(?:功能|代码|函数|脚本|组件|接口|页面|工具|算法|SQL|模块|样式)|\b(?:write|implement|build|refactor|create|optimize|add)\b[^.!?\n]{0,45}\b(?:feature|code|function|script|component|endpoint|api|module|query|sql|algorithm)\b/i,
    label: ['功能实现与开发', 'Feature & Code Implementation'],
    directPrompt: [
      '请在现有项目中按要求完成该功能实现，补齐必要的输入校验、状态反馈及异常边界处理。实现时保持项目现有目录结构、代码规范和交互风格，尽量控制改动范围，并说明核心改动位置与验证方式，确保项目可正常构建和运行。',
      'Implement the requested feature in the existing project with proper input validation, state feedback, and edge-case handling. Follow existing project structure, conventions, and UI style with minimal side effects, and provide changed locations plus verification steps confirming the project builds and runs cleanly.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请在现有项目中完成「${stripEndPunct(cleaned)}」，补齐必要的参数校验、状态反馈及空值/失败等边界处理。实现时保持项目现有结构和交互风格，避免无关改动，并说明修改内容与验证方式，确保项目可正常构建和运行。`
        : `Implement "${stripEndPunct(cleaned)}" in the existing project, including necessary validation, state feedback, and edge-case/error handling. Keep existing structure and style intact, avoid unrelated changes, and summarize changes plus verification steps.`,
    elements: [
      ['核心功能实现与清晰的状态/输入输出约定', 'Core functionality with clear input/output and state flow'],
      ['输入校验、空值/异常及失败边界处理', 'Input validation and empty/error edge-case handling'],
      ['与现有架构、样式和代码规范保持一致', 'Consistency with existing project architecture and conventions'],
    ],
    steps: [
      ['先对齐现有项目目录结构、公共组件与交互风格，确定最小接入方案。', 'Review existing structure and patterns to design a clean, minimal integration.'],
      ['实现核心逻辑、状态管理与边界/异常处理，避免引入不必要依赖。', 'Implement core logic, states, and edge-case handling without unnecessary dependencies.'],
      ['说明改动文件并完成核心路径与边界场景验证，确保构建通过。', 'Summarize touched files and verify main flows, edge cases, and build health.'],
    ],
    constraints: [
      {
        text: ['保持项目现有结构、命名约定和交互风格一致，不做无关重构。', 'Preserve existing project structure, conventions, and style without unrelated refactors.'],
        priority: 'core',
      },
      {
        text: ['妥善处理空值、非法输入和异常失败等边界情况，确保项目可正常构建和运行。', 'Handle empty inputs, invalid data, and failure edge cases cleanly; ensure build/runtime remain healthy.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '给出实现代码、关键改动说明与最小验证步骤。',
      'Provide implementation code, key change summary, and minimal verification steps.',
    ],
    acceptance: [
      '确认功能完整可用、边界情况已覆盖、构建无报错且不影响既有模块。',
      'Confirm feature works end-to-end, edge cases are covered, and builds pass with no regressions.',
    ],
    slots: [],
  },

  // 9. 会议纪要与总结提炼
  {
    id: 'summary',
    key: 'meeting-summary',
    matches: /会议纪要|会议记录|评审记录|讨论记录|\b(?:meeting\s+(?:notes?|recap|minutes))\b/i,
    label: ['会议纪要整理', 'Meeting Minutes'],
    directPrompt: [
      '请根据提供的会议记录整理一份结构化会议纪要，包含核心议题、已达成结论、待办事项（含责任人与截止时间）以及待确认问题。要求条理清晰、语言简洁，严格忠于原文，未提及的责任人或时间请标注待补充，不要编造。',
      'Organize the provided meeting notes into structured minutes covering key topics, confirmed decisions, action items (with owners and deadlines), and open questions. Keep it clear and concise, stay strictly faithful to the source, and mark any unstated owners or dates as TBD without fabricating.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」整理结构化会议纪要，包含核心议题、已达成结论、待办事项（含责任人与截止时间）及待确认问题。要求条理清晰、语言简洁，严格忠于原始记录，未提及的责任人或截止时间请标注待补充，不要编造。`
        : `Organize structured meeting minutes for "${stripEndPunct(cleaned)}" covering key topics, confirmed decisions, action items (owners & due dates), and open questions. Stay strictly faithful to the source and mark missing owners or dates as TBD.`,
    elements: [
      ['核心议题摘要与已达成结论', 'Key topic summary and confirmed decisions'],
      ['可执行待办事项（事项 / 责任人 / 截止时间）', 'Actionable items (task / owner / due date)'],
      ['分歧点或遗留待确认问题', 'Open questions or unresolved blockers'],
    ],
    steps: [
      ['按议题归纳讨论内容，去除口语重复与寒暄。', 'Group notes by topic and remove conversational noise.'],
      ['明确区分已定结论与待确认事项，提炼可执行待办。', 'Separate confirmed decisions from open items and extract action items.'],
      ['核对原文事实，缺失责任人或日期统一标注 [待补充]。', 'Cross-check against source notes and mark missing owners/dates as [TBD].'],
    ],
    constraints: [
      {
        text: ['严格忠于原始记录，未提及的决策、责任人或截止时间请标注待补充，不要编造。', 'Stay strictly faithful to the source; mark unmentioned decisions, owners, or dates as TBD.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「核心结论 / 议题摘要 / 待办事项 / 待确认问题」清晰分节输出。',
      'Output as: Key Decisions / Topic Summary / Action Items / Open Questions.',
    ],
    acceptance: [
      '确认每条结论与待办均可追溯至原文，无遗漏关键时间节点。',
      'Verify every decision and action item traces to the source with no missed deadlines.',
    ],
    slots: [
      {
        present: /https?:\/\/|已上传|附件|如下|以下[:：]\s*\S|\n.{15,}|(?:记录|原文|材料|notes?)\s*[:：]\s*\S/i,
        label: ['会议原始记录', 'Raw meeting notes'],
        question: ['请将需要整理的会议原始记录或转写文本粘贴至「补充背景与材料」中。', 'Paste the raw meeting notes or transcript into Background & Context.'],
      },
    ],
  },

  // 10. 通用内容总结
  {
    id: 'summary',
    key: 'summary',
    matches: /总结|概括|摘要|提炼要点|归纳|梳理重点|\b(?:summari[sz]e|summary|recap|key takeaways|tl;dr|digest)\b/i,
    label: ['信息提炼与总结', 'Summarization'],
    directPrompt: [
      '请根据提供的材料提炼核心结论与关键要点，保留其中的重要数据、决定、待办与时间节点。要求结构清晰、语言精炼，严格基于原文归纳，不添加无依据推断；如原文缺少关键信息，请明确标注待补充。',
      'Distill the provided material into core conclusions and key points while preserving important figures, decisions, action items, and dates. Keep structure clear and wording tight, stay strictly grounded in the source without unsupported inference, and mark missing info as TBD.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」提炼核心结论与支撑要点，保留关键数据、决定与后续行动项。要求结论先行、表达精炼，严格依据原文归纳，不编造材料之外的信息。`
        : `Distill core conclusions and supporting points for "${stripEndPunct(cleaned)}", preserving key figures, decisions, and action items. Lead with conclusions, stay concise, and avoid adding ungrounded assumptions.`,
    elements: [
      ['一句话全局结论（结论先行）', 'One-line executive takeaway upfront'],
      ['按主题归类的核心要点与关键事实/数据', 'Grouped key points with exact facts and figures'],
      ['原文提及的决定、待办与截止时间（如有）', 'Decisions, action items, and deadlines if present'],
    ],
    steps: [
      ['先提炼整体核心结论，再按逻辑归并支撑要点。', 'Extract the overarching takeaway first, then cluster supporting points.'],
      ['完整保留原文数字、专有名词与行动项，去除重复表述。', 'Preserve exact metrics, proper nouns, and action items while trimming repetition.'],
    ],
    constraints: [
      {
        text: ['严格基于提供材料归纳，不编造事实或擅自外推结论。', 'Ground strictly in the source material without fabricating facts or extrapolations.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「核心结论 + 分点关键要点（+ 行动项，如有）」输出。',
      'Output as: Core Takeaway + Bulleted Key Points (+ Action Items if applicable).',
    ],
    acceptance: [
      '核对关键数据与结论与原文一致，篇幅紧凑无冗余。',
      'Verify figures and conclusions match the source with no redundancy.',
    ],
    slots: [
      {
        present: /https?:\/\/|已上传|附件|\n.{15,}|(?:材料|原文|内容|source|text)\s*[:：]\s*\S/i,
        label: ['待总结的原文或材料', 'Source text or material'],
        question: ['请补充或粘贴需要总结的原文内容或关键材料。', 'Provide or paste the source text to summarize.'],
      },
    ],
  },

  // 11. 方案规划与拆解
  {
    id: 'planning',
    key: 'planning',
    matches:
      /拆解|实施方案|规划|路线图|排期|计划|架构设计|设计方案|\b(?:plan|roadmap|break\s*down|design\s+(?:a|an|the)?\s*(?:plan|solution|architecture)|milestones?|schedule)\b/i,
    label: ['方案规划与任务拆解', 'Planning & Breakdown'],
    directPrompt: [
      '请将当前目标拆解为清晰的实施方案，包含目标边界、分阶段任务与先后依赖、关键交付物、潜在风险及应对措施，以及验收标准。要求步骤具体可执行、改动可控，不擅自扩大需求范围；如前提不足，请标注待确认项。',
      'Break down the goal into an actionable implementation plan covering scope boundaries, phased tasks with dependencies, deliverables, key risks with mitigations, and acceptance criteria. Keep steps concrete without scope creep, and flag missing prerequisites as TBD.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」制定清晰的实施方案，包含范围边界、分阶段任务与依赖关系、关键风险及应对措施，以及验证/验收标准。要求步骤具体可落地，保持改动可控，不擅自扩大范围；如前提信息不足，请标注待确认。`
        : `Create an actionable implementation plan for "${stripEndPunct(cleaned)}" covering scope boundaries, phased tasks and dependencies, key risks with mitigations, and acceptance criteria. Keep steps concrete and scoped, flagging missing prerequisites as TBD.`,
    elements: [
      ['范围界定：本次纳入范围与暂不处理边界', 'Scope definition: in-scope deliverables vs. out-of-scope items'],
      ['分阶段执行步骤、先后依赖与对应产出', 'Phased tasks, dependencies, and deliverables'],
      ['主要风险、应对预案与验收标准', 'Key risks, mitigations, and acceptance criteria'],
    ],
    steps: [
      ['明确目标边界与现有技术/业务约束。', 'Define scope boundaries and existing constraints.'],
      ['按执行顺序拆分阶段任务，标明前置依赖与交付物。', 'Break work into ordered phases with dependencies and deliverables.'],
      ['补充主要风险应对措施与可验证的验收标准。', 'Add risk mitigations and verifiable acceptance checks.'],
    ],
    constraints: [
      {
        text: ['步骤具体可执行，避免空泛口号，不擅自扩大原需求范围。', 'Keep steps concrete and actionable; avoid vague advice or scope creep.'],
        priority: 'core',
      },
      {
        text: ['存在多方案时优先推荐低风险、易维护的路线，缺失前提请标注待确认。', 'Prefer low-risk, maintainable options and mark missing assumptions as TBD.'],
        priority: 'standard',
      },
    ],
    outputFormat: [
      '按「范围边界 / 分阶段任务 / 风险与应对 / 验收标准」分节输出。',
      'Output as: Scope / Phased Plan / Risks & Mitigations / Acceptance Criteria.',
    ],
    acceptance: [
      '确认每阶段均有明确交付物与验收标准，高风险项已配应对措施。',
      'Verify each phase has deliverables, acceptance checks, and risk mitigations.',
    ],
    slots: [],
  },

  // 12. 分析对比与评估
  {
    id: 'analysis',
    key: 'analysis',
    matches:
      /分析|对比|比较|评估|调研|评审|诊断|优缺点|选型|\b(?:analy[sz]e|analysis|compare|comparison|evaluate|assess|benchmark|trade-?offs?|review)\b/i,
    label: ['分析对比与决策评估', 'Analysis & Comparison'],
    directPrompt: [
      '请围绕核心评估维度进行客观对比与分析，先给出明确结论与推荐意见，再分维度说明优缺点、适用场景及关键前提风险。要求区分事实与推断，严禁编造数据或引用；如缺少决策约束条件，请标注待补充。',
      'Conduct an objective analysis across key evaluation criteria: lead with a clear recommendation, then compare pros, cons, suitable scenarios, and key assumptions/risks. Separate facts from inferences without fabricating data, and flag missing decision constraints as TBD.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」按核心维度进行客观对比分析，先给出明确结论与建议，再说明各方案优缺点、适用场景及主要风险。要求区分事实与假设，不编造数据或引用，信息不足处请标注待补充。`
        : `Analyze "${stripEndPunct(cleaned)}" across key criteria: lead with a clear recommendation, then cover trade-offs, fit, and key risks. Separate facts from assumptions without fabricating data, and mark gaps as TBD.`,
    elements: [
      ['结论先行：明确推荐意见及核心理由', 'Upfront recommendation with primary rationale'],
      ['维度对比：成本、效果、维护性、风险等客观评估', 'Criteria-based comparison (cost, quality, maintainability, risk)'],
      ['前提假设与落地注意事项', 'Key assumptions and adoption caveats'],
    ],
    steps: [
      ['确定核心评估维度与决策目标。', 'Define key evaluation criteria and decision goals.'],
      ['逐项客观对比优缺点，区分已验证事实与推断前提。', 'Compare options objectively, separating verified facts from assumptions.'],
      ['结合使用场景给出明确建议与风险提示。', 'Deliver a concrete recommendation and key caveats.'],
    ],
    constraints: [
      {
        text: ['严禁编造数据、指标或外部引用，缺乏依据的前提需明确标注。', 'Never fabricate metrics or citations; clearly label assumptions.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '按「核心结论 / 维度对比表 / 风险与前提 / 建议动作」呈现。',
      'Present as: Conclusion / Comparison Table / Risks & Assumptions / Next Action.',
    ],
    acceptance: [
      '核对维度客观全面、无虚构数据、推荐结论与分析一致。',
      'Verify balanced criteria, zero fabricated data, and consistent recommendation.',
    ],
    slots: [],
  },

  // 13. 翻译与文本润色
  {
    id: 'translation',
    key: 'translation',
    matches:
      /翻译|译成|润色|改写成|中译英|英译中|本土化|\b(?:translate|translation|localize|polish|paraphrase|proofread)\b/i,
    label: ['翻译与文本润色', 'Translation & Polishing'],
    directPrompt: [
      '请在完整保留原意、数字、专有名词及排版结构的前提下完成翻译或润色，使表达自然流畅并符合目标语言习惯。不要删改原有约束或擅自扩写内容，直接输出最终文本。',
      'Translate or polish the text while faithfully preserving original meaning, numbers, proper nouns, and formatting for natural target-language flow. Do not alter constraints or add unstated ideas; output the final text directly.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请按要求完成「${stripEndPunct(cleaned)}」，忠实保留原意、数字、术语与格式结构，使表达自然准确。严禁删改原有约束或擅自扩写，直接输出最终结果。`
        : `Complete "${stripEndPunct(cleaned)}" while preserving original meaning, numbers, terminology, and formatting with natural fluency. Do not alter constraints or add commentary; output the final text directly.`,
    elements: [
      ['语义准确忠实，术语与语气前后一致', 'Faithful meaning with consistent terminology and tone'],
      ['保留原始数字、否定语义、代码标识符与排版格式', 'Preserve numbers, negations, code tokens, and formatting'],
    ],
    steps: [
      ['统一专业术语与语气基调，避免生硬直译。', 'Align terminology and register for natural phrasing.'],
      ['逐句校对数字、否定词与格式标记是否完整保留。', 'Proofread to confirm numbers, negations, and formatting stay intact.'],
    ],
    constraints: [
      {
        text: ['严禁删改原有事实、数字或否定语义，不擅自扩写无关内容。', 'Do not drop or alter facts, numbers, or negations, and avoid unrequested additions.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '直接输出最终译文或润色稿，无需额外寒暄。',
      'Output the final translated/polished text directly without preamble.',
    ],
    acceptance: [
      '核对语义准确、术语一致、表达地道自然。',
      'Verify accuracy, terminology consistency, and natural readability.',
    ],
    slots: [
      {
        present: /译成|翻译成|中文|英文|日文|德文|法文|英译中|中译英|润色|改写|\b(?:into\s+\w+|to\s+(?:english|chinese|japanese|french|german|spanish)|polish|proofread)\b/i,
        label: ['目标语言或期望风格', 'Target language or style'],
        question: ['目标语言是什么？偏正式专业还是自然口语风格？', 'What is the target language and preferred register?'],
      },
    ],
  },

  // 14. 通用文稿与文案写作
  {
    id: 'writing',
    key: 'writing-doc',
    matches:
      /(?:写|撰写|起草|生成|创作)[^。！？\n]{0,24}(?:周报|月报|日报|报告|文案|公告|通知|文章|博客|介绍|简历|标题|大纲|小红书|公众号)|\b(?:write|draft|create|compose)\b[^.!?\n]{0,40}\b(?:report|copy|post|article|blog|announcement|outline|resume|bio|headline)\b/i,
    label: ['内容与文稿写作', 'Content Writing'],
    directPrompt: [
      '请按要求撰写结构清晰、重点前置的文稿，贴合目标受众与使用场景。要求语言简洁自然、避免空洞套话，严格基于已提供信息展开，如信息不足请标注待补充，不要编造数据或经历。',
      'Write a clear, audience-focused piece with key takeaways upfront. Keep the language crisp and natural without clichés, rely strictly on supplied facts, and mark any missing details as TBD without fabricating metrics or claims.',
    ],
    directWithFocus: (cleaned, isZh) =>
      isZh
        ? `请围绕「${stripEndPunct(cleaned)}」撰写结构清晰、重点突出的文稿，贴合目标受众与阅读场景。要求语言简洁自然、避免空洞套话，仅依据已有信息展开，缺失信息请标注待补充，不要编造。`
        : `Write a clear, well-structured piece for "${stripEndPunct(cleaned)}" tailored to its audience and context. Keep language natural and concise, avoid clichés, rely only on supplied facts, and mark gaps as TBD.`,
    elements: [
      ['开篇直入核心观点与读者关切', 'Lead with core message and reader value'],
      ['分段清晰、每段聚焦单一重点', 'Clear sections with one focus per paragraph'],
      ['结尾给出明确总结或行动引导', 'Crisp closing summary or next step'],
    ],
    steps: [
      ['提炼核心主旨与受众最关心的信息点。', 'Identify the main message and top reader priorities.'],
      ['按清晰层次展开内容，去除空泛修辞与重复表述。', 'Draft in scannable layers free of filler or repetition.'],
    ],
    constraints: [
      {
        text: ['拒绝空洞套话，仅基于已提供事实展开，缺失信息标注待补充，不要编造。', 'Avoid filler clichés; stay strictly grounded in supplied facts and mark gaps as TBD.'],
        priority: 'core',
      },
    ],
    outputFormat: [
      '输出层次清晰的成品文稿，可直接发布或微调使用。',
      'Output clean, ready-to-use copy with clear structure.',
    ],
    acceptance: [
      '核对重点前置、受众匹配、无虚构事实或冗余表达。',
      'Verify key points lead, tone fits audience, and zero facts are fabricated.',
    ],
    slots: [
      {
        present: /受众|面向|读者|给.{1,12}看|小红书|公众号|管理层|领导|客户|团队|博客|\b(?:audience|readers?|blog|for\s+(?:executives|clients|developers|users|team))\b/i,
        label: ['目标受众与发布场景', 'Target audience & channel'],
        question: ['这篇内容面向哪些读者，主要发布或使用在什么场景？', 'Who is the target audience and where will it be shared?'],
      },
    ],
  },
]

const GENERAL_PROFILE: IntentProfile = {
  id: 'general',
  key: 'general',
  matches: /.*/,
  label: ['通用指令优化', 'General Task'],
  directPrompt: [
    '请严格按要求完成任务，确保目标明确、结构清晰且结果可直接使用。遵循已给出的所有事实与限制条件，不擅自扩大范围；如存在影响结果的关键信息缺失，请先标注待补充或提出简明问题，不要编造。',
    'Complete the task accurately with clear structure and directly usable output. Preserve all stated facts and constraints without scope creep; if critical information is missing, mark it as TBD or ask brief clarifying questions instead of guessing.',
  ],
  directWithFocus: (cleaned, isZh) =>
    isZh
      ? `请完成以下任务：${ensureEndPunct(cleaned, true)}要求结构清晰、语言简洁，交付可直接使用的结果；严格遵循已有事实与限制，不擅自扩大范围，如关键信息不足请标注待补充，不要编造。`
      : `Please complete the following task: ${ensureEndPunct(cleaned, false)} Keep the output structured, concise, and directly usable; respect all stated facts and constraints without scope creep, and mark any critical missing info as TBD instead of guessing.`,
  elements: [
    ['严格对齐原始目标与交付范围', 'Strict alignment with original goal and scope'],
    ['补齐常见边界情况与结构化输出要求', 'Clear edge-case handling and structured output'],
  ],
  steps: [
    ['梳理核心目标、已知条件与限制边界。', 'Clarify core goal, given inputs, and boundaries.'],
    ['按清晰逻辑产出可直接使用的结果，交付前核对无遗漏或冲突。', 'Deliver a usable result and verify zero omissions or conflicts.'],
  ],
  constraints: [
    {
      text: ['严格保留原需求中的事实、数字、格式与限制，不擅自扩大范围。', 'Preserve stated facts, numbers, formats, and constraints without scope creep.'],
      priority: 'core',
    },
    {
      text: ['如关键信息缺失且影响结果，请标注待补充或先提出简明问题，不要编造。', 'If critical details are missing, mark them as TBD or ask briefly rather than fabricating.'],
      priority: 'core',
    },
  ],
  outputFormat: [
    '采用最贴合任务的简洁清晰结构输出，确保可直接落地使用。',
    'Use a clear, concise format suited to the task for immediate use.',
  ],
  acceptance: [
    '核对输出无逻辑矛盾、无遗漏原稿约束且可直接采用。',
    'Confirm no contradictions, no dropped constraints, and direct usability.',
  ],
  slots: [],
}

function stripEndPunct(text: string): string {
  return text.trim().replace(/[。！？.!?]+$/, '')
}

function ensureEndPunct(text: string, isZh: boolean): string {
  const t = text.trim()
  if (!t) return ''
  if (/[。！？.!?：:；;）)」』\]`]$/.test(t)) return t
  return t + (isZh ? '。' : '.')
}

/**
 * 步骤 1：意图识别（同样作为 AI 模式缺省 intent 时的兜底分类器）
 */
export function classifyIntent(draft: string, isChinese: boolean): {
  profile: IntentProfile
  intent: PromptIntent
} {
  const input = draft.trim()
  let bestProfile: IntentProfile | undefined
  let bestScore = 0

  for (const profile of PROFILES) {
    if (!profile.matches.test(input)) continue
    let score = 2
    if (profile.scoreBoost) {
      if (!profile.scoreBoost.test(input)) continue
      score += 2
    }
    if (profile.canonicalOnly && profile.canonicalOnly.test(input)) {
      score += 2
    }
    if (score > bestScore) {
      bestScore = score
      bestProfile = profile
    }
  }

  const chosen = bestProfile ?? GENERAL_PROFILE
  return {
    profile: chosen,
    intent: {
      id: chosen.id,
      label: isChinese ? chosen.label[0] : chosen.label[1],
      confidence: bestProfile ? 'high' : 'medium',
    },
  }
}

/**
 * 步骤 2：表达精简（清理口语起手、客套寒暄与重复空白，严守事实/代码/否定约束不变）
 */
export function streamlineExpression(draft: string): {
  cleaned: string
  trimmed: boolean
} {
  const original = draft.trim()
  if (!original) return { cleaned: '', trimmed: false }

  if (/```/.test(original)) {
    const normalized = original.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    return { cleaned: normalized, trimmed: normalized !== original }
  }

  let text = original.replace(/\r\n/g, '\n')

  const leadingPatterns = [
    /^(?:你好|您好|嗨|哈喽|请问一下|请问)[，,！!\s]*/u,
    /^(?:我要|我想要|我想|麻烦你?|请)?(?:帮我|帮忙)?(?:一下)?(?=[读取查看审查排查撰写汇报新增增加添加写起草拟回复润色改写生成发修调试解决定位实现开发重构封装优化编写总结概括摘要提炼归纳梳理拆解规划设计分析对比比较评估调研评审翻译整理])/u,
    /^(?:能不能|可不可以|我想让你|希望你能)\s*(?:帮我)?\s*/u,
    /^(?:hi|hello|hey(?:\s+there)?)[,!\s]+/i,
    /^(?:i\s+want\s+to\s+|i\s+would\s+like\s+(?:you\s+)?to\s+|could\s+you\s+(?:please\s+)?|would\s+you\s+(?:please\s+)?|can\s+you\s+(?:please\s+)?|please\s+)(?:help\s+me\s+)?/i,
  ]

  for (let pass = 0; pass < 2; pass++) {
    for (const re of leadingPatterns) {
      const next = text.replace(re, '')
      if (next.trim().length >= 4) text = next.trimStart()
    }
  }

  const trailingPatterns = [
    /[，,。\s]*(?:非常感谢|多谢|谢谢你?|感谢|辛苦了|拜托了|急用)[！!。.\s]*$/u,
    /[,\s.]*(?:thanks?(?:\s+a\s+lot|\s+in\s+advance|\s+so\s+much)?|thank\s+you(?:\s+very\s+much)?|appreciate\s+it)[!.\s]*$/i,
  ]
  for (const re of trailingPatterns) {
    const next = text.replace(re, '')
    if (next.trim().length >= 4) text = next.trimEnd()
  }

  text = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([，。！？,.!?])\1+/g, '$1')

  const lines = text.split('\n')
  const deduped: string[] = []
  for (const line of lines) {
    const prev = deduped[deduped.length - 1]
    if (prev !== undefined && prev.trim() === line.trim() && line.trim().length > 0) continue
    deduped.push(line)
  }
  text = deduped.join('\n').trim()

  if (/^[a-z]/.test(text)) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  const trimmed = stripEndPunct(text) !== stripEndPunct(original)
  return { cleaned: text, trimmed }
}

export interface LocalEnhanceOptions {
  preferChinese: boolean
  context?: string
  style?: EnhanceStyle
}

/**
 * 对齐 WorkBuddy 实测风格的本地 6 步提示词增强流水线：
 * - concise（标准直发）：WorkBuddy 原生高密度自然段指令，零套话，直接粘贴可用
 * - balanced（均衡分点）：指令主句 + 关键要素与约束要点，兼顾清晰与紧凑
 * - detailed（详细规范）：完整结构化 Markdown 区块（目标/要素/步骤/约束/输出验收）
 */
export function enhancePrompt(
  draft: string,
  optionsOrChinese: boolean | LocalEnhanceOptions,
): EnhancementResult {
  const options: LocalEnhanceOptions =
    typeof optionsOrChinese === 'boolean'
      ? { preferChinese: optionsOrChinese }
      : optionsOrChinese

  const rawDraft = draft.trim()
  const rawContext = (options.context ?? '').trim()
  const style: EnhanceStyle = options.style ?? 'concise'
  const isChinese = detectChineseLanguage(rawDraft, options.preferChinese)
  const localize = ([zh, en]: Copy) => (isChinese ? zh : en)

  if (!rawDraft) {
    return {
      prompt: '',
      intent: { id: 'general', label: localize(GENERAL_PROFILE.label), confidence: 'medium' },
      changes: [],
      questions: [],
      checks: [],
      stats: { originalChars: 0, enhancedChars: 0, sectionCount: 0, missingCount: 0, trimmedFiller: false },
    }
  }

  // 1. 意图识别
  const { profile, intent } = classifyIntent(rawDraft, isChinese)

  // 2. 表达精简
  const { cleaned, trimmed: trimmedFiller } = streamlineExpression(rawDraft)
  const isCanonical = Boolean(profile.canonicalOnly && profile.canonicalOnly.test(rawDraft))

  // 3. 信息补全（合并原稿与补充背景检查缺项）
  const combinedSource = rawContext ? `${rawDraft}\n${rawContext}` : rawDraft
  const missingSlots = profile.slots.filter((slot) => !slot.present.test(combinedSource))
  const questions = missingSlots.map((slot) => localize(slot.question))

  // 4. 约束补充（过滤用户已经写明的约束，避免重复啰嗦）
  const activeConstraints = profile.constraints
    .filter((rule) => {
      if (style === 'concise' && rule.priority !== 'core') return false
      if (rule.alreadyStated && rule.alreadyStated.test(combinedSource)) return false
      return true
    })
    .map((rule) => localize(rule.text))

  // 5. 结构重组
  let prompt = ''

  if (style === 'concise') {
    // WorkBuddy 标准直发风格：高密度自然语言指令，不堆砌多余标题
    const coreDirective =
      isCanonical || !profile.directWithFocus
        ? localize(profile.directPrompt)
        : profile.directWithFocus(cleaned, isChinese)

    const blocks = [coreDirective]
    if (rawContext) {
      blocks.push(
        isChinese ? `补充背景：\n${rawContext}` : `Additional context:\n${rawContext}`,
      )
    }
    prompt = blocks.join('\n\n')
  } else if (style === 'balanced') {
    const leadLine =
      isCanonical || !profile.directWithFocus
        ? localize(profile.directPrompt)
        : profile.directWithFocus(cleaned, isChinese)

    const sections: string[] = [leadLine]

    if (rawContext) {
      sections.push('', localize(['## 背景信息', '## Context']), rawContext)
    }

    if (profile.elements.length) {
      sections.push(
        '',
        localize(['## 覆盖要点', '## Key Elements']),
        ...profile.elements.map((item) => `- ${localize(item)}`),
      )
    }

    if (activeConstraints.length) {
      sections.push(
        '',
        localize(['## 约束与边界', '## Constraints & Guardrails']),
        ...activeConstraints.map((item) => `- ${item}`),
      )
    }

    sections.push('', localize(['## 交付要求', '## Expected Output']), localize(profile.outputFormat))

    if (missingSlots.length) {
      sections.push(
        '',
        localize(['## 待补充信息', '## Details to Clarify']),
        ...missingSlots.map((slot) => `- [${localize(slot.label)}]`),
      )
    }

    prompt = sections.join('\n')
  } else {
    // detailed：完整结构化规范，仍保持克制与零角色套话
    const leadLine =
      isCanonical || !profile.directWithFocus
        ? localize(profile.directPrompt)
        : profile.directWithFocus(cleaned, isChinese)

    const sections: string[] = [
      localize(['## 目标与范围', '## Objective & Scope']),
      leadLine,
    ]

    if (rawContext) {
      sections.push('', localize(['## 背景与输入材料', '## Context & Source']), rawContext)
    }

    if (profile.elements.length) {
      sections.push(
        '',
        localize(['## 核心覆盖要素', '## Core Elements']),
        ...profile.elements.map((item) => `- ${localize(item)}`),
      )
    }

    if (profile.steps.length) {
      sections.push(
        '',
        localize(['## 执行步骤', '## Execution Steps']),
        ...profile.steps.map((step, idx) => `${idx + 1}. ${localize(step)}`),
      )
    }

    if (activeConstraints.length) {
      sections.push(
        '',
        localize(['## 约束与边界条件', '## Constraints & Edge Cases']),
        ...activeConstraints.map((item) => `- ${item}`),
      )
    }

    sections.push(
      '',
      localize(['## 交付与验收检查', '## Output & Verification']),
      `- ${localize(['输出形式：', 'Output: '])}${localize(profile.outputFormat)}`,
      `- ${localize(['验收检查：', 'Verification: '])}${localize(profile.acceptance)}`,
    )

    if (missingSlots.length) {
      sections.push(
        '',
        localize(['## 待确认信息', '## Open Details']),
        ...missingSlots.map((slot) => `- [${localize(slot.label)}]`),
      )
    }

    prompt = sections.join('\n')
  }

  // 生成简洁改动说明
  const changes: string[] = [
    isChinese
      ? `意图识别：判定为「${intent.label}」场景，补全对应核心要素与交付范围。`
      : `Intent recognized: "${intent.label}" with tailored scope and elements.`,
  ]
  if (trimmedFiller) {
    changes.push(
      isChinese
        ? '表达精简：去除口语起手或客套冗余，转为直接可执行指令。'
        : 'Streamlined: removed conversational filler into direct imperative wording.',
    )
  }
  if (rawContext) {
    changes.push(
      isChinese
        ? '信息补全：已将补充背景材料并入指令上下文。'
        : 'Context merged: integrated your background notes into the prompt.',
    )
  }
  if (activeConstraints.length) {
    changes.push(
      isChinese
        ? '约束补充：补齐最小改动、防编造、边界处理或只读保护等关键约束。'
        : 'Guardrails added: appended domain constraints, edge cases, and grounding rules.',
    )
  }
  changes.push(
    isChinese
      ? style === 'concise'
        ? '结构重组：按 WorkBuddy 标准直发风格压缩为高密度自然指令，无多余模板套话。'
        : style === 'balanced'
          ? '结构重组：整理为主指令 + 覆盖要点 + 约束边界的清晰层次。'
          : '结构重组：展开为目标、要素、步骤、约束与验收检查的完整规范。'
      : style === 'concise'
        ? 'Restructured into a WorkBuddy-style direct, high-density prompt with zero boilerplate.'
        : `Restructured into clear Markdown sections (${style} depth).`,
  )
  if (missingSlots.length) {
    changes.push(
      isChinese
        ? `缺项提醒：检测到 ${missingSlots.length} 项建议补充信息，已列入待确认清单。`
        : `Gap detection: flagged ${missingSlots.length} recommended detail(s) to clarify.`,
    )
  }

  // 6. 质量检查
  const checks = evaluatePromptQuality({
    originalDraft: rawDraft,
    enhancedPrompt: prompt,
    context: rawContext,
    intent,
    style,
    questions,
    trimmedFiller,
    isChinese,
  })

  const stats = computeEnhancementStats(rawDraft, prompt, questions.length, trimmedFiller)

  return {
    prompt,
    intent,
    changes,
    questions,
    checks,
    stats,
  }
}
