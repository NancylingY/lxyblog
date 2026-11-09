<script setup lang="ts">
// 网站底部备案信息栏：ICP 备案号 + 公安联网备案号（占位可替换）
import ThemeClock from './ThemeClock.vue'
import { useResume } from '../data/resume'

const { t } = useResume()
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <!-- ICP 备案号：使用主体备案号，不带 -1/-2 网站顺序号 -->
      <a
        class="site-footer__link"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
      >粤ICP备2026164473号</a>

      <span class="site-footer__divider" aria-hidden="true">|</span>

      <!-- 公安联网备案号：图标来自 public/备案图标.png -->
      <a
        class="site-footer__link site-footer__link--police"
        href="https://beian.mps.gov.cn/#/query/webSearch?code=44011102485437"
        rel="noreferrer"
        target="_blank"
      ><img class="site-footer__badge" src="/备案图标.png" alt="公安备案图标" />粤公网安备44011102485437号</a>
    </div>
    <div class="site-footer__status">
      <ThemeClock />
    </div>
    <p class="site-footer__copyright">© 2026 my-blog. All rights reserved.</p>

    <div class="site-footer__legal">
      <details class="site-footer__legal-item">
        <summary>{{ t.legalPrivacy }}</summary>
        <p>{{ t.legalPrivacyText }}</p>
      </details>
      <details class="site-footer__legal-item">
        <summary>{{ t.legalTerms }}</summary>
        <p>{{ t.legalTermsText }}</p>
      </details>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  width: 100%;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  background: var(--footer-bg);
  color: var(--footer-ink);
  font-size: var(--fs-base);
  line-height: 1.6;
  text-align: center;
  border-top: 1px solid var(--footer-line);
  transition: background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease;
}

.site-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
}

.site-footer__link {
  color: var(--footer-ink);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  word-break: break-all;
}

.site-footer__link:hover,
.site-footer__link:focus-visible {
  color: var(--footer-ink-strong);
  text-decoration: underline;
}

.site-footer__badge {
  width: 16px;
  height: 16px;
  vertical-align: middle;
}

.site-footer__divider {
  color: var(--footer-ink);
  opacity: 0.45;
}

.site-footer__status {
  margin-top: 10px;
}

.site-footer__copyright {
  margin: 8px 0 0;
  font-size: var(--fs-sm);
  color: var(--footer-ink);
  opacity: 0.72;
}

/* 隐私 / 条款：用 details 就地展开，避免为两段说明新建页面 */
.site-footer__legal {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 18px;
}

.site-footer__legal-item summary {
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--footer-ink);
  opacity: 0.78;
  list-style: none;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.site-footer__legal-item summary::-webkit-details-marker {
  display: none;
}

.site-footer__legal-item summary:hover,
.site-footer__legal-item summary:focus-visible {
  color: var(--footer-ink-strong);
}

.site-footer__legal-item p {
  max-width: 560px;
  margin: 8px auto 2px;
  font-size: var(--fs-sm);
  line-height: 1.7;
  text-align: left;
  color: var(--footer-ink);
  opacity: 0.72;
}

/* 移动端：缩小字号、允许换行，保证两个备案号完整可见 */
@media (max-width: 480px) {
  .site-footer {
    font-size: var(--fs-sm);
    padding: 16px 12px calc(16px + env(safe-area-inset-bottom));
  }

  .site-footer__divider {
    display: none;
  }

  .site-footer__inner {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
