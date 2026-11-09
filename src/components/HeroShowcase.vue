<script setup lang="ts">
/**
 * 日光模式首屏右侧组件：设计 token + 代码片段 + 交付状态。
 * 纯 HTML/CSS，不再使用绿色粒子网络；黑夜模式仍保留 ParticleField。
 */
</script>

<template>
  <div class="showcase" aria-hidden="true">
    <span class="showcase__sun" />
    <span class="showcase__grid" />

    <div class="showcase__card showcase__card--main">
      <div class="showcase__bar">
        <span class="showcase__dot showcase__dot--amber" />
        <span class="showcase__dot showcase__dot--teal" />
        <span class="showcase__dot showcase__dot--muted" />
        <span class="showcase__file">practice.ts</span>
      </div>

      <div class="showcase__code">
        <div class="showcase__line">
          <span class="showcase__ln">1</span>
          <span><span class="showcase__kw">const</span> <span class="showcase__var">practice</span> = {</span>
        </div>
        <div class="showcase__line">
          <span class="showcase__ln">2</span>
          <span class="showcase__indent">direction: <span class="showcase__str">'full-stack product'</span>,</span>
        </div>
        <div class="showcase__line">
          <span class="showcase__ln">3</span>
          <span class="showcase__indent">method: <span class="showcase__str">'design → ship'</span>,</span>
        </div>
        <div class="showcase__line">
          <span class="showcase__ln">4</span>
          <span class="showcase__indent">shipped: <span class="showcase__num">6</span>,</span>
        </div>
        <div class="showcase__line">
          <span class="showcase__ln">5</span>
          <span>}</span>
        </div>
      </div>

      <div class="showcase__status"><i /> OPEN TO SELECTED WORK</div>
    </div>

    <div class="showcase__card showcase__card--palette">
      <span class="showcase__label">DESIGN TOKENS</span>
      <div class="showcase__swatches">
        <i class="showcase__swatch showcase__swatch--ink" />
        <i class="showcase__swatch showcase__swatch--teal" />
        <i class="showcase__swatch showcase__swatch--amber" />
      </div>
    </div>

    <div class="showcase__card showcase__card--metric">
      <span class="showcase__label">SHIPPED</span>
      <strong class="showcase__metric">06</strong>
      <div class="showcase__bars">
        <i style="height: 38%" />
        <i style="height: 66%" />
        <i style="height: 48%" />
        <i style="height: 82%" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.showcase {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin-inline: auto;
  aspect-ratio: 1;
  container-type: inline-size;
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(13, 116, 144, 0.14);
  background:
    radial-gradient(circle at 78% 16%, rgba(255, 228, 188, 0.92), transparent 37%),
    linear-gradient(152deg, #fffdf8 0%, #f7f9f8 48%, #edf3f4 100%);
  box-shadow:
    0 24px 60px rgba(13, 54, 68, 0.11),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  font-size: clamp(11px, 1vw, 12px);
  color: #17303f;
}

.showcase__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(13, 116, 144, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 116, 144, 0.055) 1px, transparent 1px);
  background-size: 5.6% 5.6%;
  mask-image: radial-gradient(ellipse at 50% 40%, #000 30%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 40%, #000 30%, transparent 78%);
}

.showcase__sun {
  position: absolute;
  top: 5%;
  right: 7%;
  width: 31%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 226, 178, 0.85) 0%,
    rgba(255, 210, 150, 0.4) 38%,
    transparent 70%
  );
  filter: blur(0.5px);
}

.showcase__card {
  position: absolute;
  border: 1px solid rgba(13, 116, 144, 0.13);
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 12px 30px rgba(20, 58, 72, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 主代码卡 */
.showcase__card--main {
  z-index: var(--z-float);
  left: 6%;
  right: 6%;
  top: 20%;
  padding: 1.3em 1.5em 1.2em;
  border-radius: 1.35em;
}

.showcase__bar {
  display: flex;
  align-items: center;
  gap: 0.38em;
  margin-bottom: 1em;
}

.showcase__dot {
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
}

.showcase__dot--amber { background: #c47a22; }
.showcase__dot--teal { background: #0d7490; }
.showcase__dot--muted { background: rgba(77, 105, 118, 0.35); }

.showcase__file {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6em;
  letter-spacing: 0.04em;
  color: rgba(52, 84, 98, 0.6);
}

.showcase__code {
  font-family: var(--font-mono);
  font-size: 0.86em;
  line-height: 1.85;
  color: #335463;
  overflow: hidden;
}

.showcase__line {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  white-space: nowrap;
}

.showcase__ln {
  width: 1.05em;
  flex-shrink: 0;
  text-align: right;
  color: rgba(86, 116, 130, 0.38);
  font-size: 0.86em;
}

.showcase__indent {
  padding-left: 0.9em;
}

.showcase__kw { color: #b56b17; }
.showcase__var { color: #174254; }
.showcase__str { color: #0d7490; }
.showcase__num { color: #a75c12; }

.showcase__status {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin-top: 1.1em;
  font-family: var(--font-mono);
  font-size: 0.56em;
  letter-spacing: 0.14em;
  color: #5a7d8b;
}

.showcase__status i {
  width: 0.45em;
  height: 0.45em;
  border-radius: 50%;
  background: #c47a22;
  box-shadow: 0 0 0.6em rgba(196, 122, 34, 0.45);
}

/* 设计 token 卡 */
.showcase__card--palette {
  z-index: var(--z-overlay);
  top: 6%;
  right: 5%;
  width: 32%;
  padding: 0.95em 1.1em;
  border-radius: 1em;
  transform: rotate(3deg);
  animation: showcase-float 8s ease-in-out infinite;
}

/* 交付数量卡 */
.showcase__card--metric {
  z-index: var(--z-overlay);
  bottom: 7%;
  left: 5%;
  width: 32%;
  padding: 0.95em 1.1em;
  border-radius: 1em;
  transform: rotate(-3deg);
  animation: showcase-float-reverse 10s ease-in-out infinite;
  animation-delay: -3s;
}

.showcase__label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.52em;
  letter-spacing: 0.16em;
  color: rgba(52, 84, 98, 0.55);
  white-space: nowrap;
}

.showcase__swatches {
  display: flex;
  gap: 0.5em;
  margin-top: 0.7em;
}

.showcase__swatch {
  width: 1.45em;
  height: 1.45em;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.showcase__swatch--ink { background: #17303f; }
.showcase__swatch--teal { background: #0d7490; }
.showcase__swatch--amber { background: #c47a22; }

.showcase__metric {
  display: block;
  font-family: var(--font-mono);
  font-size: 2em;
  line-height: 1.2;
  color: #17303f;
  margin-top: 0.2em;
}

.showcase__bars {
  display: flex;
  align-items: flex-end;
  gap: 0.24em;
  height: 1.7em;
  margin-top: 0.35em;
}

.showcase__bars i {
  flex: 1;
  border-radius: 0.18em 0.18em 0 0;
  background: linear-gradient(180deg, #0d7490, rgba(13, 116, 144, 0.35));
}

.showcase__bars i:nth-child(2),
.showcase__bars i:nth-child(4) {
  background: linear-gradient(180deg, #c47a22, rgba(196, 122, 34, 0.3));
}

@keyframes showcase-float {
  0%, 100% { transform: rotate(3deg) translateY(0); }
  50% { transform: rotate(4.2deg) translateY(-0.5em); }
}

@keyframes showcase-float-reverse {
  0%, 100% { transform: rotate(-3deg) translateY(0); }
  50% { transform: rotate(-2deg) translateY(-0.6em); }
}

@media (max-width: 960px) {
  .showcase {
    max-width: 340px;
  }

  /* 移动端去掉卡片 blur，减少叠加的合成开销 */
  .showcase__card {
    background: #fffdf8;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (max-width: 520px) {
  .showcase {
    max-width: 230px;
    border-radius: 22px;
  }

  .showcase__card--palette,
  .showcase__card--metric {
    display: none;
  }

  .showcase__card--main {
    top: 18%;
    bottom: 18%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1.1em 1.2em;
  }

  /* 窄屏去掉行号，避免代码行被裁切 */
  .showcase__ln {
    display: none;
  }

  .showcase__code {
    font-size: 0.8em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .showcase__card--palette,
  .showcase__card--metric {
    animation: none;
  }
}
</style>
