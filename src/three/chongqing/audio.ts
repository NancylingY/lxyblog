import type { DioramaWeather } from './types'

/**
 * Warm organic procedural WebAudio soundscape for Chongqing 8D Rain Box:
 * - Filtered rain-on-tiles ambient bed (warm pink noise + gentle raindrop plinks)
 * - Soft Chinese pentatonic guqin / felt-piano hybrid melody
 * - Distant monorail glide hum
 * - Warm bronze cableway bell & gentle subway arrival chime
 * Calibrated for pleasant low-fatigue listening (RMS ~0.12-0.15, Peak <= 0.85).
 */
export class ChongqingAudio {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private rainGain: GainNode | null = null
  private humGain: GainNode | null = null
  private enabled = false
  private weather: DioramaWeather = 'rain'
  private timers: number[] = []
  private noteIndex = 0

  // D major pentatonic across 2 warm octaves (Hz): D3, E3, F#3, A3, B3, D4, E4, F#4, A4
  private readonly pentatonic = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0]
  private readonly melodyPattern = [5, 7, 6, 5, 3, 4, 5, 8, 7, 5, 6, 3, 2, 3, 5, 4]

  public isEnabled(): boolean {
    return this.enabled
  }

  public setWeather(weather: DioramaWeather): void {
    this.weather = weather
    if (!this.ctx || !this.rainGain) return
    const now = this.ctx.currentTime
    const targetRain = weather === 'rain' ? 0.16 : weather === 'snow' ? 0.055 : 0.025
    this.rainGain.gain.cancelScheduledValues(now)
    this.rainGain.gain.setTargetAtTime(targetRain, now, 0.45)
  }

  public toggle(): boolean {
    if (this.enabled) {
      this.stop()
      return false
    }
    this.start()
    return this.enabled
  }

  public start(): void {
    if (this.enabled) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!this.ctx) {
      this.ctx = new AudioCtx()
      this.setupGraph()
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }

    this.enabled = true
    const now = this.ctx.currentTime
    this.masterGain?.gain.cancelScheduledValues(now)
    this.masterGain?.gain.setTargetAtTime(0.42, now, 0.35)
    this.setWeather(this.weather)
    this.scheduleLoops()
  }

  public stop(): void {
    this.enabled = false
    for (const id of this.timers) window.clearInterval(id)
    this.timers = []
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.25)
    }
  }

  public triggerConvergenceChime(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return
    this.playCablewayBell()
    window.setTimeout(() => {
      if (this.enabled) this.playSubwayChime()
    }, 650)
  }

  private setupGraph(): void {
    if (!this.ctx) return
    const ctx = this.ctx

    // Soft limiter/compressor to ensure Peak <= 0.85
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 18
    comp.ratio.value = 4
    comp.attack.value = 0.02
    comp.release.value = 0.25

    const master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(comp)
    comp.connect(ctx.destination)
    this.masterGain = master

    // 1. Warm pink-noise rain-on-tiles bed (band-limited so zero harsh hiss)
    const bufferSize = ctx.sampleRate * 4
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045
      b6 = white * 0.115926
    }

    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    noiseSrc.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1350
    lp.Q.value = 0.6

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 210

    const rainGain = ctx.createGain()
    rainGain.gain.value = 0.15
    noiseSrc.connect(hp)
    hp.connect(lp)
    lp.connect(rainGain)
    rainGain.connect(master)
    noiseSrc.start()
    this.rainGain = rainGain

    // 2. Soft distant monorail glide hum (warm low-pass triangle + subtle fifth)
    const humOsc1 = ctx.createOscillator()
    humOsc1.type = 'sine'
    humOsc1.frequency.value = 73.42 // D2
    const humOsc2 = ctx.createOscillator()
    humOsc2.type = 'triangle'
    humOsc2.frequency.value = 110.0 // A2
    const humFilter = ctx.createBiquadFilter()
    humFilter.type = 'lowpass'
    humFilter.frequency.value = 190
    const humGain = ctx.createGain()
    humGain.gain.value = 0.055
    humOsc1.connect(humFilter)
    humOsc2.connect(humFilter)
    humFilter.connect(humGain)
    humGain.connect(master)
    humOsc1.start()
    humOsc2.start()
    this.humGain = humGain
  }

  private scheduleLoops(): void {
    for (const id of this.timers) window.clearInterval(id)
    this.timers = []

    // Pentatonic guqin / felt-piano note every 2.2s
    this.playPentatonicNote()
    this.timers.push(
      window.setInterval(() => {
        if (this.enabled) this.playPentatonicNote()
      }, 2200),
    )

    // Subtle monorail swell modulation every 5.5s
    this.timers.push(
      window.setInterval(() => {
        if (!this.enabled || !this.ctx || !this.humGain) return
        const now = this.ctx.currentTime
        this.humGain.gain.setTargetAtTime(0.085, now, 1.2)
        this.humGain.gain.setTargetAtTime(0.042, now + 2.4, 1.4)
      }, 5800),
    )

    // Warm bronze cableway bell every 13s
    this.timers.push(
      window.setInterval(() => {
        if (this.enabled) this.playCablewayBell()
      }, 13500),
    )

    // Gentle subway arrival chime every 19s
    this.timers.push(
      window.setInterval(() => {
        if (this.enabled) this.playSubwayChime()
      }, 19000),
    )
  }

  private playPentatonicNote(): void {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const idx = this.melodyPattern[this.noteIndex % this.melodyPattern.length]!
    this.noteIndex++
    const freq = this.pentatonic[idx]!

    const osc = ctx.createOscillator()
    const harmonic = ctx.createOscillator()
    osc.type = 'triangle'
    harmonic.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    harmonic.frequency.setValueAtTime(freq * 2, now)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(980, now)
    filter.frequency.exponentialRampToValueAtTime(340, now + 2.1)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, now)
    env.gain.linearRampToValueAtTime(0.11, now + 0.045)
    env.gain.exponentialRampToValueAtTime(0.0008, now + 2.6)

    const hGain = ctx.createGain()
    hGain.gain.value = 0.22

    osc.connect(filter)
    harmonic.connect(hGain)
    hGain.connect(filter)
    filter.connect(env)
    env.connect(this.masterGain)

    osc.start(now)
    harmonic.start(now)
    osc.stop(now + 2.7)
    harmonic.stop(now + 2.7)
  }

  private playCablewayBell(): void {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const now = ctx.currentTime
    for (const [mult, amp] of [
      [1, 0.06],
      [2.02, 0.024],
    ]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33 * mult!, now) // D5 warm bronze
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, now)
      g.gain.linearRampToValueAtTime(amp!, now + 0.025)
      g.gain.exponentialRampToValueAtTime(0.0004, now + 2.2)
      osc.connect(g)
      g.connect(this.masterGain)
      osc.start(now)
      osc.stop(now + 2.3)
    }
  }

  private playSubwayChime(): void {
    if (!this.ctx || !this.masterGain) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const notes = [440, 587.33, 659.25] // A4 -> D5 -> E5 gentle transit chime
    notes.forEach((f, i) => {
      const t = now + i * 0.22
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, t)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.045, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0004, t + 0.85)
      osc.connect(g)
      g.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.9)
    })
  }

  public dispose(): void {
    this.stop()
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
    }
  }
}
