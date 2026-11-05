/**
 * Synthesized Web Audio Sound Engine for Logos RC.
 * Zero external audio files required.
 */
export class SoundEffects {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private engineOsc1: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private engineGain: GainNode | null = null
  private nitroGain: GainNode | null = null
  private hornGain: GainNode | null = null
  private hornOsc1: OscillatorNode | null = null
  private hornOsc2: OscillatorNode | null = null

  constructor() {
    // Lazily initialized on first user gesture
  }

  public init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    this.ctx = new AudioCtx()

    // 1. Engine sound chain
    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime)

    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime)
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime)

    this.engineOsc1 = this.ctx.createOscillator()
    this.engineOsc1.type = 'sawtooth'
    this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime) // idle ~55Hz

    this.engineOsc2 = this.ctx.createOscillator()
    this.engineOsc2.type = 'triangle'
    this.engineOsc2.frequency.setValueAtTime(27.5, this.ctx.currentTime)

    this.engineOsc1.connect(this.engineFilter)
    this.engineOsc2.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.ctx.destination)

    this.engineOsc1.start()
    this.engineOsc2.start()

    // 2. Horn sound chain
    this.hornGain = this.ctx.createGain()
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime)

    this.hornOsc1 = this.ctx.createOscillator()
    this.hornOsc1.type = 'sawtooth'
    this.hornOsc1.frequency.setValueAtTime(430, this.ctx.currentTime)

    this.hornOsc2 = this.ctx.createOscillator()
    this.hornOsc2.type = 'sawtooth'
    this.hornOsc2.frequency.setValueAtTime(510, this.ctx.currentTime)

    const hornFilter = this.ctx.createBiquadFilter()
    hornFilter.type = 'bandpass'
    hornFilter.frequency.setValueAtTime(800, this.ctx.currentTime)
    hornFilter.Q.setValueAtTime(1.0, this.ctx.currentTime)

    this.hornOsc1.connect(hornFilter)
    this.hornOsc2.connect(hornFilter)
    hornFilter.connect(this.hornGain)
    this.hornGain.connect(this.ctx.destination)

    this.hornOsc1.start()
    this.hornOsc2.start()
  }

  public updateEngine(rpm: number, speedKmh: number, isBoosting: boolean) {
    if (!this.ctx || this.isMuted) return
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    const t = this.ctx.currentTime

    // Map RPM [800 - 7500] to engine base frequency [45Hz - 220Hz]
    const clampedRpm = Math.max(800, Math.min(8000, rpm))
    const baseFreq = 45 + (clampedRpm - 800) * 0.024
    const filterFreq = 260 + (clampedRpm - 800) * 0.28 + (isBoosting ? 600 : 0)

    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05)
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05)
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05)
    }

    if (this.engineGain) {
      const vol = isBoosting ? 0.22 : 0.12 + Math.min(0.08, Math.abs(speedKmh) / 250)
      this.engineGain.gain.setTargetAtTime(vol, t, 0.05)
    }
  }

  public playHorn(active: boolean) {
    if (!this.ctx || !this.hornGain || this.isMuted) return
    const t = this.ctx.currentTime
    this.hornGain.gain.cancelScheduledValues(t)
    if (active) {
      this.hornGain.gain.setTargetAtTime(0.18, t, 0.02)
    } else {
      this.hornGain.gain.setTargetAtTime(0.0001, t, 0.05)
    }
  }

  public playCollision(force: number) {
    if (!this.ctx || this.isMuted) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18)

    const vol = Math.min(0.35, Math.max(0.1, force / 40))
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(t)
    osc.stop(t + 0.22)
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.ctx && this.isMuted) {
      this.ctx.suspend()
    } else if (this.ctx && !this.isMuted) {
      this.ctx.resume()
    }
    return this.isMuted
  }

  public destroy() {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}
