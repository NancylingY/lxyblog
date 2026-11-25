<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import { useScrollProgress } from '../composables/useScrollProgress'
import { scrollToHash } from '../utils/scroll'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const { progress, scrollY } = useScrollProgress()
const scrolled = computed(() => scrollY.value > 24)
const menuOpen = ref(false)
const toggleRef = ref<HTMLButtonElement | null>(null)
/** 当前滚动到的首页章节 */
const activeHash = ref('')
const { t, profile } = useResume()
const logoUrl = `${import.meta.env.BASE_URL}Hlogo.png`

const OBSERVED_IDS = ['top', 'about', 'process', 'skills', 'projects', 'lab', 'contact']
const SECTION_TO_NAV: Record<string, string> = {
  top: '',
  about: '#about',
  process: '#about',
  skills: '#skills',
  projects: '#projects',
  lab: '#projects',
  contact: '#contact',
}
let sectionObserver: IntersectionObserver | null = null

interface NavItem {
  /** 首页锚点 */
  hash?: string
  /** 独立页面路由 */
  to?: string
  label: string
}

const links = computed<NavItem[]>(() => {
  return [
    { hash: '#about', label: t.value.navAbout },
    { hash: '#skills', label: t.value.navSkills },
    { hash: '#projects', label: t.value.navProjects },
    { hash: '#contact', label: t.value.navContact },
    { to: '/other', label: t.value.navOther },
    { to: '/tools', label: t.value.navTools },
  ]
})

const TOOL_PATHS = ['/tools', '/boards', '/prompt-enhancer', '/stats']

function isActive(link: NavItem) {
  if (link.to === '/tools') return TOOL_PATHS.includes(route.path)
  if (link.to) return route.path === link.to
  return route.path === '/' && activeHash.value === link.hash
}

async function observeSections() {
  sectionObserver?.disconnect()
  sectionObserver = null
  activeHash.value = ''
  if (route.path !== '/') return
  await nextTick()

  const sections = OBSERVED_IDS.map((id) => document.getElementById(id)).filter(
    (el): el is HTMLElement => !!el,
  )
  if (!sections.length) return

  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeHash.value = SECTION_TO_NAV[entry.target.id] ?? ''
        }
      })
    },
    { rootMargin: '-42% 0px -52% 0px', threshold: 0 },
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
  window.addEventListener('keydown', onKeydown)
  // NavBar 的 onMounted 早于首页区块挂载，等一帧后再建立观察
  requestAnimationFrame(observeSections)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  sectionObserver?.disconnect()
})
</script>

<template>
  <header class="nav" :class="{ 'nav--scrolled': scrolled }">
    <div class="container nav__inner">
      <router-link class="nav__brand" to="/" :aria-label="t.navHome" @click="closeMenu(false)">
        <img class="nav__brand-logo" :src="logoUrl" alt="" width="28" height="28" />
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
            :aria-current="isActive(link) ? 'page' : undefined"
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

    <!-- 底部阅读进度条 -->
    <div class="nav__progress-track" aria-hidden="true">
      <span
        class="nav__progress-bar"
        :style="{ transform: `scaleX(${progress})`, opacity: progress > 0.005 ? 1 : 0 }"
      />
    </div>

    <!-- 移动端菜单遮罩 -->
    <div
      class="nav__backdrop"
      :class="{ 'nav__backdrop--open': menuOpen }"
      aria-hidden="true"
      @click="closeMenu(false)"
    />

    <div
      id="nav-mobile"
      class="nav__mobile"
      :class="{ 'nav__mobile--open': menuOpen }"
      :aria-hidden="!menuOpen"
    >
      <a
        v-for="(link, i) in links"
        :key="link.hash || link.to"
        :href="link.to ? `#${link.to}` : `#/${link.hash}`"
        class="nav__mobile-link"
        :class="{ 'nav__mobile-link--active': isActive(link) }"
        :style="{ transitionDelay: menuOpen ? `${i * 35}ms` : '0ms' }"
        @click.prevent="goTo(link)"
      >
        <span class="nav__mobile-index">0{{ i + 1 }}</span>
        <span>{{ link.label }}</span>
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
    box-shadow 0.3s ease,
    backdrop-filter 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav--scrolled {
  background: var(--nav-bg);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-bottom-color: var(--line);
  box-shadow: var(--nav-shadow);
}

.nav__progress-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  pointer-events: none;
  overflow: hidden;
}

.nav__progress-bar {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--accent), var(--amber));
  transition: opacity 0.25s ease;
  will-change: transform;
}

[data-theme='dark'] .nav__progress-bar {
  background: linear-gradient(90deg, var(--accent), var(--cyan));
  box-shadow: 0 0 10px var(--accent);
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
  gap: 8px;
  font-family: var(--font-mono);
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--ink);
  transition: color 0.2s ease;
}

.nav__brand:hover {
  color: var(--accent);
}

.nav__brand-logo {
  flex: none;
  display: block;
  border-radius: 7px;
  transition: transform 0.35s var(--ease-out);
}

.nav__brand:hover .nav__brand-logo {
  transform: rotate(-8deg) scale(1.06);
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
  gap: 4px;
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

.nav__link::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 3px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.28s var(--ease-out);
}

.nav__link:active {
  transform: scale(0.95);
}

.nav__link:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav__link--active {
  color: var(--accent);
  background: var(--accent-soft);
}

.nav__link--active::after {
  transform: scaleX(1);
}

.nav__link-index {
  font-size: var(--fs-xs);
  color: var(--ink-faint);
  margin-right: 4px;
  transition: color 0.2s ease;
}

.nav__link:hover .nav__link-index,
.nav__link--active .nav__link-index {
  color: var(--accent);
}

.nav__toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 9px 10px;
  transition: border-color 0.2s ease;
}

.nav__toggle:hover {
  border-color: var(--accent);
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

.nav__mobile,
.nav__backdrop {
  display: none;
}

@media (max-width: 860px) {
  .nav__links {
    display: none;
  }

  .nav__toggle {
    display: flex;
  }

  .nav__backdrop {
    display: block;
    position: fixed;
    inset: var(--nav-h) 0 0 0;
    background: rgba(7, 13, 20, 0.32);
    backdrop-filter: blur(2px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.25s ease, visibility 0s linear 0.25s;
  }

  .nav__backdrop--open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 0.25s ease, visibility 0s;
  }

  .nav__mobile {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: var(--nav-h);
    left: 0;
    right: 0;
    z-index: 1;
    background: var(--nav-menu-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--line);
    box-shadow: var(--shadow-card);
    padding: 10px 24px 20px;
    transform: translateY(-10px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: transform 0.25s var(--ease-out), opacity 0.25s ease, visibility 0s linear 0.25s;
  }

  .nav__mobile--open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: transform 0.25s var(--ease-out), opacity 0.25s ease, visibility 0s;
  }

  .nav__mobile-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 4px;
    font-family: var(--font-mono);
    font-size: var(--fs-lg);
    color: var(--ink-dim);
    border-bottom: 1px dashed var(--line);
    opacity: 0;
    transform: translateX(-8px);
    transition: color 0.2s ease, opacity 0.25s ease, transform 0.25s var(--ease-out);
  }

  .nav__mobile--open .nav__mobile-link {
    opacity: 1;
    transform: translateX(0);
  }

  .nav__mobile-link:last-child {
    border-bottom: none;
  }

  .nav__mobile-index {
    font-size: var(--fs-xs);
    color: var(--ink-faint);
  }

  .nav__mobile-link:hover,
  .nav__mobile-link--active {
    color: var(--accent);
  }

  .nav__mobile-link--active .nav__mobile-index {
    color: var(--accent);
  }
}
</style>
