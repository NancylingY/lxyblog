<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import { scrollToHash } from '../utils/scroll'
import LanguageSwitcher from './LanguageSwitcher.vue'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const menuOpen = ref(false)
const { t, profile } = useResume()

const links = computed(() => [
  { to: '/', hash: '#about', label: t.value.navAbout },
  { to: '/', hash: '#skills', label: t.value.navSkills },
  { to: '/', hash: '#projects', label: t.value.navProjects },
  { to: '/', hash: '#contact', label: t.value.navContact },
])

function onScroll() {
  scrolled.value = window.scrollY > 24
}

async function goTo(link: { to: string; hash: string }) {
  menuOpen.value = false

  // 首页锚点：已在本页直接滚动，否则先回首页再滚动
  if (route.path === '/') {
    scrollToHash(link.hash)
    return
  }
  await router.push('/')
  await nextTick()
  setTimeout(() => scrollToHash(link.hash), 80)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="nav" :class="{ 'nav--scrolled': scrolled }">
    <div class="container nav__inner">
      <router-link class="nav__brand" to="/" aria-label="回到首页">
        <span class="nav__brand-sign">~</span>
        <span class="nav__brand-name">{{ profile.name }}</span>
        <span class="nav__brand-cursor">_</span>
      </router-link>

      <div class="nav__right">
        <nav class="nav__links" aria-label="主导航">
          <a
            v-for="(link, i) in links"
            :key="link.hash"
            href="javascript:void(0)"
            class="nav__link"
            @click="goTo(link)"
          >
            <span class="nav__link-index">0{{ i + 1 }}</span>
            {{ link.label }}
          </a>
        </nav>

        <LanguageSwitcher />

        <button
          class="nav__toggle"
          :aria-expanded="menuOpen"
          aria-label="切换菜单"
          @click="menuOpen = !menuOpen"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <div class="nav__mobile" :class="{ 'nav__mobile--open': menuOpen }">
      <a
        v-for="link in links"
        :key="link.hash"
        href="javascript:void(0)"
        class="nav__mobile-link"
        @click="goTo(link)"
      >
        {{ link.label }}
      </a>
      <div class="nav__mobile-lang">
        <LanguageSwitcher />
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--nav-h);
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    backdrop-filter 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav--scrolled {
  background: rgba(7, 9, 13, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--line);
}

.nav__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}

.nav__brand-sign {
  color: var(--accent);
}

.nav__brand-cursor {
  color: var(--accent);
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.nav__links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav__right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav__link {
  position: relative;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--ink-dim);
  border-radius: var(--radius-sm);
  transition: color 0.2s ease, background 0.2s ease;
}

.nav__link:hover,
.nav__link--active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav__link-index {
  font-size: 11px;
  color: var(--ink-faint);
  margin-right: 4px;
}

.nav__toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 9px 10px;
}

.nav__toggle span {
  width: 18px;
  height: 2px;
  background: var(--ink);
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.nav__mobile {
  display: none;
}

@media (max-width: 720px) {
  .nav__links {
    display: none;
  }

  .nav__toggle {
    display: flex;
  }

  .nav__mobile {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: var(--nav-h);
    left: 0;
    right: 0;
    background: rgba(7, 9, 13, 0.96);
    border-bottom: 1px solid var(--line);
    padding: 10px 24px 18px;
    transform: translateY(-12px);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  .nav__mobile--open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .nav__mobile-link {
    padding: 12px 4px;
    font-family: var(--font-mono);
    font-size: 15px;
    color: var(--ink-dim);
    border-bottom: 1px dashed var(--line);
  }

  .nav__mobile-link:hover {
    color: var(--accent);
  }

  .nav__mobile-lang {
    margin-top: 12px;
  }
}
</style>
