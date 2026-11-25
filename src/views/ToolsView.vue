<script setup lang="ts">
import { useI18n } from '../i18n'

const { isZh } = useI18n()
</script>

<template>
  <section class="section">
    <div class="container">
      <h1 class="section-title">{{ isZh ? '工具' : 'Tools' }}</h1>
      <div class="tools">
        <RouterLink class="tool card" to="/prompt-enhancer">
          <div class="tool-top" aria-hidden="true">
            <span class="tool-icon">✦</span>
            <span class="tool-arrow">↗</span>
          </div>
          <h2>{{ isZh ? '提示词增强' : 'Prompt enhancer' }}</h2>
          <p>{{ isZh ? '用本地规则或自选模型改写提示词。' : 'Refine prompts with local rules or a model you configure.' }}</p>
        </RouterLink>
        <RouterLink class="tool card tool--stats" to="/stats">
          <div class="tool-top" aria-hidden="true">
            <span class="tool-icon"><i></i><i></i><i></i></span>
            <span class="tool-arrow">↗</span>
          </div>
          <h2>{{ isZh ? 'Token 统计' : 'Token statistics' }}</h2>
          <p>{{ isZh ? '查看模型的 Token 消耗。' : 'View model token usage.' }}</p>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 16px;
  margin-top: 24px;
}
.tool {
  --tool-color: var(--accent);
  display: block;
  padding: clamp(20px, 4vw, 32px);
  color: inherit;
  text-decoration: none;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: radial-gradient(ellipse at 0 0, color-mix(in srgb, var(--tool-color) 12%, transparent), transparent 65%), var(--bg-1);
  transition: border-color .2s ease, box-shadow .2s ease;
}
.tool--stats { --tool-color: var(--amber, var(--accent)); }
.tool:hover, .tool:focus-visible {
  border-color: var(--tool-color);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--tool-color) 13%, transparent);
}
.tool-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.tool-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: var(--tool-color);
  background: color-mix(in srgb, var(--tool-color) 13%, var(--bg-1));
  font-size: 1.55rem;
}
.tool-icon i { width: 4px; height: 14px; border-radius: 3px; background: currentColor; }
.tool-icon i:first-child { height: 8px; transform: translateY(3px); }
.tool-icon i:last-child { height: 20px; transform: translateY(-3px); }
.tool-arrow { color: var(--tool-color); font-size: 1.25rem; }
.tool h2 { margin: 0 0 8px; font-size: 1.25rem; }
.tool p { margin: 0; line-height: 1.65; }
@media (prefers-reduced-motion: reduce) {
  .tool { transition: none; }
}
</style>
