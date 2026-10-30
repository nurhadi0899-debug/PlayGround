export class SkateAudio {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.rollGain = null
    this.grindGain = null
    this.grindSource = null
  }

  init() {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.6
    this.master.connect(this.ctx.destination)
    this.noise = this.makeNoise(2.4)
    this.startRoll()
    this.startGrind()
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume()
  }

  setMuted(muted) {
    this.muted = muted
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.03)
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds)
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.82 + white * 0.18
      data[i] = last
    }
    return buffer
  }

  startRoll() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.7
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
    this.rollFilter = filter
    this.rollGain = gain
  }

  startGrind() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2200
    filter.Q.value = 3
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    src.connect(filter).connect(gain).connect(this.master)
    src.start()
    this.grindFilter = filter
    this.grindGain = gain
  }

  update({ speed = 0, grounded = true, grinding = false }) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    if (this.rollGain) {
      const target = grounded && !grinding ? Math.min(0.16, speed / 95) : 0
      this.rollGain.gain.setTargetAtTime(target, t, 0.08)
      this.rollFilter.frequency.setTargetAtTime(260 + speed * 32, t, 0.1)
    }
    if (this.grindGain) {
      this.grindGain.gain.setTargetAtTime(grinding ? 0.12 : 0, t, 0.05)
      if (this.grindFilter) this.grindFilter.frequency.setTargetAtTime(1700 + Math.random() * 900, t, 0.08)
    }
  }

  blip(freq, dur = 0.08, type = 'square', vol = 0.12) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur)
  }

  pop() {
    if (!this.ctx) return
    this.blip(240, 0.09, 'triangle', 0.2)
    this.blip(90, 0.12, 'sine', 0.22)
  }

  land(power = 1) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900, t)
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.18)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.35 * power, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t, Math.random())
    src.stop(t + 0.25)
  }

  trick() {
    if (!this.ctx) return
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.12, 'triangle', 0.07), i * 38))
  }

  special() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.6)
    g.gain.setValueAtTime(0.08, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 0.72)
  }

  bail() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(320, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.5)
    g.gain.setValueAtTime(0.16, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 0.6)
  }

  countdown(final = false) {
    if (!this.ctx) return
    this.blip(final ? 880 : 440, final ? 0.3 : 0.1, 'square', 0.09)
  }

  tick() {
    if (!this.ctx) return
    this.blip(1100, 0.04, 'square', 0.04)
  }
}
