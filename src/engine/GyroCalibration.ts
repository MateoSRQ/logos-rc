import type { GyroData } from '../net/protocol'

export interface GyroConfig {
  deadzone: number      // e.g., 0.05
  sensitivity: number   // multiplier e.g., 1.5
  exponential: number   // 1.0 = linear, 1.8 = soft center, aggressive flanks
  invertSteer: boolean  // invert left/right
  invertPitch: boolean  // invert forward/back
  smoothing: number     // EMA alpha: 0.2 to 0.5 (higher = faster, lower = smoother)
  maxRollAngle: number  // degrees corresponding to full steering lock (e.g. 35 deg)
  maxPitchAngle: number // degrees corresponding to full throttle/brake (e.g. 30 deg)
}

export const DEFAULT_GYRO_CONFIG: GyroConfig = {
  deadzone: 0.025,
  sensitivity: 1.45,
  exponential: 1.3,
  invertSteer: false,
  invertPitch: false,
  smoothing: 0.16,
  maxRollAngle: 26,
  maxPitchAngle: 22,
}

export class GyroCalibrator {
  private config: GyroConfig
  private neutralBeta: number = 0
  private neutralGamma: number = 0
  private isCalibrated: boolean = false
  private filteredRoll: number = 0
  private filteredPitch: number = 0

  constructor(config: Partial<GyroConfig> = {}) {
    this.config = { ...DEFAULT_GYRO_CONFIG, ...config }
  }

  public updateConfig(newConfig: Partial<GyroConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  public getConfig(): GyroConfig {
    return { ...this.config }
  }

  /**
   * Captures current device tilt as the zero-offset neutral point.
   */
  public calibrate(beta: number, gamma: number) {
    this.neutralBeta = beta
    this.neutralGamma = gamma
    this.isCalibrated = true
    this.filteredRoll = 0
    this.filteredPitch = 0
  }

  public resetCalibration() {
    this.neutralBeta = 0
    this.neutralGamma = 0
    this.isCalibrated = false
    this.filteredRoll = 0
    this.filteredPitch = 0
  }

  /**
   * Transforms raw device orientation event into normalized GyroData
   * @param alpha Compass orientation (0-360)
   * @param beta Front-back tilt (-180 to 180)
   * @param gamma Left-right tilt (-90 to 90)
   * @param isLandscape Whether the phone is held horizontally like a steering wheel
   * @param invertLandscape Whether the phone is in landscape-secondary (-90 deg)
   */
  public process(
    alpha: number = 0,
    beta: number = 0,
    gamma: number = 0,
    isLandscape: boolean = false,
    invertLandscape: boolean = false
  ): GyroData {
    // Determine raw roll and pitch according to screen orientation
    let rawRollDeg: number
    let rawPitchDeg: number

    if (isLandscape) {
      // In landscape, tilting phone like a steering wheel rotates along beta
      let rollDelta = beta - this.neutralBeta
      if (invertLandscape) {
        rollDelta = -rollDelta
      }
      rawRollDeg = rollDelta
      rawPitchDeg = gamma - this.neutralGamma
    } else {
      // In portrait, tilting left/right is gamma, tilting forward/back is beta
      rawRollDeg = gamma - this.neutralGamma
      rawPitchDeg = beta - this.neutralBeta
    }

    // Clamp angle delta to [-maxAngle, +maxAngle]
    const clampedRoll = Math.max(-this.config.maxRollAngle, Math.min(this.config.maxRollAngle, rawRollDeg))
    const clampedPitch = Math.max(-this.config.maxPitchAngle, Math.min(this.config.maxPitchAngle, rawPitchDeg))

    // Normalize to [-1, 1]
    let normRoll = clampedRoll / this.config.maxRollAngle
    let normPitch = clampedPitch / this.config.maxPitchAngle

    // Apply inversion
    if (this.config.invertSteer) normRoll = -normRoll
    if (this.config.invertPitch) normPitch = -normPitch

    // Apply deadzone & exponential curve
    normRoll = this.applyCurve(normRoll)
    normPitch = this.applyCurve(normPitch)

    // Apply low-pass smoothing filter (EMA)
    const factor = this.config.smoothing
    this.filteredRoll = this.filteredRoll + factor * (normRoll - this.filteredRoll)
    this.filteredPitch = this.filteredPitch + factor * (normPitch - this.filteredPitch)

    return {
      alpha,
      beta,
      gamma,
      calibratedRoll: Number(this.filteredRoll.toFixed(3)),
      calibratedPitch: Number(this.filteredPitch.toFixed(3)),
    }
  }

  private applyCurve(value: number): number {
    const absVal = Math.abs(value)
    if (absVal < this.config.deadzone) {
      return 0
    }

    // Scale remainder above deadzone to [0, 1]
    const scaled = (absVal - this.config.deadzone) / (1 - this.config.deadzone)
    // Apply exponential curve for fine control near center
    const curved = Math.pow(scaled, this.config.exponential) * this.config.sensitivity
    const clamped = Math.min(1, Math.max(0, curved))

    return Math.sign(value) * clamped
  }
}
