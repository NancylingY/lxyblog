<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import { dashboard } from '../data/dashboard'
import { scrollToHash } from '../utils/scroll'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const menuOpen = ref(false)
const toggleRef = ref<HTMLButtonElement | null>(null)
/** 当前滚动到的首页章节 */
const activeHash = ref('')
const { t, profile } = useResume()

const SECTION_IDS = ['about', 'skills', 'projects', 'contact']
let sectionObserver: IntersectionObserver | null = null

interface NavItem {
  /** 首页锚点 */
  hash?: string
  /** 独立页面路由 */
  to?: string
  label: string
}

const links = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { hash: '#about', label: t.value.navAbout },
    { hash: '#skills', label: t.value.navSkills },
    { hash: '#projects', label: t.value.navProjects },
    { hash: '#contact', label: t.value.navContact },
    { to: '/other', label: t.value.navOther },
  ]
  // 看板地址没配置时不显示入口，避免把访客引到空页面
  if (dashboard.url) items.push({ to: '/stats', label: t.value.navStats })
  return items
})

function isActive(link: NavItem) {
  if (link.to) return route.path === link.to
  return route.path === '/' && activeHash.value === link.hash
}

async function observeSections() {
  sectionObserver?.disconnect()
  sectionObserver = null
  activeHash.value = ''
  if (route.path !== '/') return
  await nextTick()

  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
    (el): el is HTMLElement => !!el,
  )
  if (!sections.length) return

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeHash.value = `#${entry.target.id}`
      })
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
  )
  sections.forEach((section) => sectionObserver?.observe(section))
}

// 首次 mount 时章节才挂载完成，交给 onMounted 建立观察；路由切换时再重建
watch(() => route.path, observeSections, { flush: 'post' })

function closeMenu(restoreFocus = false) {
  menuOpen.value = false
  if (restoreFocus) toggleRef.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) {
    event.preventDefault()
    closeMenu(true)
  }
}

watch(menuOpen, async (open) => {
  if (!open) return
  await nextTick()
  document.querySelector<HTMLElement>('.nav__mobile-link')?.focus()
})

let scrollFrame = 0

/** 滚动事件只用来标记「是否离开顶部」，用 rAF 合并到每帧一次 */
function onScroll() {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    scrolled.value = window.scrollY > 24
  })
}

async function goTo(link: NavItem) {
  menuOpen.value = false

  // 独立页面：直接跳转
  if (link.to && !link.hash) {
    if (route.path === link.to) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      await router.push(link.to)
      window.scrollTo({ top: 0 })
    }
    return
  }

  // 首页锚点：已在本页直接滚动，否则先回首页再滚动
  if (route.path === '/') {
    scrollToHash(link.hash!)
    return
  }
  await router.push('/')
  await nextTick()
  setTimeout(() => scrollToHash(link.hash!), 80)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  onScroll()
  // NavBar 的 onMounted 早于首页区块挂载，等一帧后再建立观察
  requestAnimationFrame(observeSections)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  sectionObserver?.disconnect()
})
</script>

<template>
  <header class="nav" :class="{ 'nav--scrolled': scrolled }">
    <div class="container nav__inner">
      <router-link class="nav__brand" to="/" :aria-label="t.navHome">
        <span class="nav__brand-sign">~</span>
        <span class="nav__brand-name">{{ profile.name }}</span>
        <span class="nav__brand-cursor">_</span>
      </router-link>

      <div class="nav__right">
        <nav class="nav__links" :aria-label="t.ariaMainNav">
          <a
            v-for="(link, i) in links"
            :key="link.hash || link.to"
            :href="link.to ? `#${link.to}` : `#/${link.hash}`"
            class="nav__link"
            :class="{ 'nav__link--active': isActive(link) }"
            @click.prevent="goTo(link)"
          >
            <span class="nav__link-index">0{{ i + 1 }}</span>
            {{ link.label }}
          </a>
        </nav>

        <LanguageSwitcher />
        <ThemeToggle />

        <button
          ref="toggleRef"
          class="nav__toggle"
          :class="{ 'nav__toggle--open': menuOpen }"
          :aria-expanded="menuOpen"
          :aria-label="t.ariaMenuToggle"
          aria-controls="nav-mobile"
          @click="menuOpen = !menuOpen"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <div
      id="nav-mobile"
      class="nav__mobile"
      :class="{ 'nav__mobile--open': menuOpen }"
      :aria-hidden="!menuOpen"
    >
      <a
        v-for="link in links"
        :key="link.hash || link.to"
        :href="link.to ? `#${link.to}` : `#/${link.hash}`"
        class="nav__mobile-link"
        :class="{ 'nav__mobile-link--active': isActive(link) }"
        @click.prevent="goTo(link)"
      >
        {{ link.label }}
      </a>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-nav);
  height: var(--nav-h);
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    backdrop-filter 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav--scrolled {
  background: var(--nav-bg);
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
  font-size: var(--fs-xl);
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
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  color: var(--ink-dim);
  border-radius: var(--radius-sm);
  transition: color 0.2s ease, background 0.2s ease, transform 0.18s ease;
}

.nav__link:active {
  transform: scale(0.94);
}

.nav__link:hover,
.nav__link--active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav__link-index {
  font-size: var(--fs-xs);
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

/* 汉堡 → X */
.nav__toggle--open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.nav__toggle--open span:nth-child(2) {
  opacity: 0;
}

.nav__toggle--open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.nav__mobile {
  display: none;
}

@media (max-width: 860px) {
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
    background: var(--nav-menu-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--line);
    padding: 10px 24px 18px;
    transform: translateY(-12px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: transform 0.25s ease, opacity 0.25s ease, visibility 0s linear 0.25s;
  }

  .nav__mobile--open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: transform 0.25s ease, opacity 0.25s ease, visibility 0s;
  }

  .nav__mobile-link {
    padding: 12px 4px;
    font-family: var(--font-mono);
    font-size: var(--fs-lg);
    color: var(--ink-dim);
    border-bottom: 1px dashed var(--line);
  }

  .nav__mobile-link:hover {
    color: var(--accent);
  }

  .nav__mobile-link--active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
}
</style>
