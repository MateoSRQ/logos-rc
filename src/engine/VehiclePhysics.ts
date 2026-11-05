export interface PhysicsConfig {
  maxSpeed: number            // Normal top speed m/s (~18 m/s = 65 km/h)
  boostMaxSpeed: number       // Boost top speed m/s (~26 m/s = 94 km/h)
  reverseMaxSpeed: number     // Max reverse speed (~8 m/s = 29 km/h)
  acceleration: number        // Normal engine force m/s^2
  boostAcceleration: number   // Boost engine force m/s^2
  brakeDeceleration: number   // Braking force m/s^2
  rollingFriction: number     // Coasting friction drag
  airResistance: number       // Aerodynamic drag
  turnSpeedBase: number       // Steering angular velocity rad/s
  maxSteerAngleRad: number    // Visual wheel lock angle (~0.55 rad = ~32 deg)
  driftThreshold: number      // Lateral force limit before sliding
  driftGripRecovery: number   // Grip restoration rate
  gravity: number             // m/s^2 (e.g. 25 for snappier RC jumps)
  jumpForce: number           // Impulsive vertical velocity on ramps
  suspensionDamping: number   // Spring damping
  nitroDepletionRate: number  // % per sec
  nitroRegenRate: number      // % per sec
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  maxSpeed: 21.0,
  boostMaxSpeed: 29.5,
  reverseMaxSpeed: 9.5,
  acceleration: 17.0,
  boostAcceleration: 34.0,
  brakeDeceleration: 28.0,
  rollingFriction: 3.5,
  airResistance: 0.02,
  turnSpeedBase: 3.4,       // High sensitivity: quick, responsive turning
  maxSteerAngleRad: 0.65,   // Expanded wheel lock angle (~37 deg)
  driftThreshold: 11.0,
  driftGripRecovery: 4.5,
  gravity: 24.0,
  jumpForce: 8.5,
  suspensionDamping: 6.0,
  nitroDepletionRate: 25.0,
  nitroRegenRate: 8.0,
}

export interface WallSegment {
  x1: number
  z1: number
  x2: number
  z2: number
  height?: number
}

export interface ObstacleBox {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
  isRamp?: boolean
  isBridge?: boolean
  rampAngle?: number
  direction?: '+Z' | '-Z' | '+X' | '-X'
}

export class VehiclePhysics {
  public config: PhysicsConfig

  // Spatial coordinates
  public x: number = 0
  public y: number = 0
  public z: number = 0

  // Velocities
  public vx: number = 0
  public vy: number = 0
  public vz: number = 0
  public speed: number = 0 // Longitudinal scalar speed (+ forward, - reverse)

  // Orientations (radians)
  public heading: number = 0 // Yaw rotation around Y axis
  public pitch: number = 0   // Pitch (squat/dive and slope)
  public roll: number = 0    // Cornering roll lean
  public steerAngle: number = 0 // Visual front wheel turn angle

  // Vehicle states
  public gear: 'P' | 'D' | 'R' = 'P'
  public rpm: number = 800
  public nitro: number = 100
  public isDrifting: boolean = false
  public isGrounded: boolean = true
  public collisionOccurred: boolean = false
  public collisionForce: number = 0

  // Track arena bounds (updated for large closed circuit: 350x350m)
  public arenaHalfWidth: number = 175
  public arenaHalfLength: number = 175

  // Obstacles and continuous track walls
  private obstacles: ObstacleBox[] = []
  private wallSegments: WallSegment[] = []

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config }
  }

  public setArenaBounds(halfWidth: number, halfLength: number) {
    this.arenaHalfWidth = halfWidth
    this.arenaHalfLength = halfLength
  }

  public setObstacles(obstacles: ObstacleBox[]) {
    this.obstacles = obstacles
  }

  public setWalls(walls: WallSegment[]) {
    this.wallSegments = walls
  }

  public reset(x: number = 0, z: number = 0, heading: number = 0) {
    this.x = x
    this.y = 0
    this.z = z
    this.vx = 0
    this.vy = 0
    this.vz = 0
    this.speed = 0
    this.heading = heading
    this.pitch = 0
    this.roll = 0
    this.steerAngle = 0
    this.gear = 'P'
    this.rpm = 800
    this.nitro = 100
    this.isDrifting = false
    this.isGrounded = true
    this.collisionOccurred = false
    this.collisionForce = 0
  }

  /**
   * Main physics integration tick.
   * @param dt Delta time in seconds (clamped to e.g. 0.05 max to avoid tunneling)
   * @param throttle Normalized throttle input: -1 (reverse/brake) to +1 (forward)
   * @param steer Normalized steer input: -1 (left) to +1 (right)
   * @param brake Handbrake flag
   * @param boost Nitro boost flag
   */
  public update(
    dt: number,
    throttle: number = 0,
    steer: number = 0,
    brake: boolean = false,
    boost: boolean = false
  ) {
    // Clamp dt to avoid physics blowups on frame drops
    const clampedDt = Math.min(0.05, Math.max(0.001, dt))
    this.collisionOccurred = false
    this.collisionForce = 0

    // Manage Nitro state
    const isBoosting = boost && this.nitro > 5 && throttle > 0.1 && this.isGrounded
    if (isBoosting) {
      this.nitro = Math.max(0, this.nitro - this.config.nitroDepletionRate * clampedDt)
    } else {
      this.nitro = Math.min(100, this.nitro + this.config.nitroRegenRate * clampedDt)
    }

    // Determine current top speeds and accelerations
    const currentMaxForward = isBoosting ? this.config.boostMaxSpeed : this.config.maxSpeed
    const currentAccel = isBoosting ? this.config.boostAcceleration : this.config.acceleration

    // Longitudinal forces & speed update
    if (this.isGrounded) {
      if (brake) {
        // Handbrake: strong deceleration and induce drift
        if (Math.abs(this.speed) > 0.1) {
          const decel = this.config.brakeDeceleration * 1.5 * clampedDt
          if (this.speed > 0) this.speed = Math.max(0, this.speed - decel)
          else this.speed = Math.min(0, this.speed + decel)
        }
        if (Math.abs(this.speed) > 5 && Math.abs(steer) > 0.2) {
          this.isDrifting = true
        }
      } else if (throttle > 0.02) {
        // Accelerating forward
        if (this.speed < -0.2) {
          // Braking from reverse
          this.speed += this.config.brakeDeceleration * clampedDt
        } else {
          // Accelerating forward towards top speed
          const speedRatio = Math.max(0, this.speed / currentMaxForward)
          // Torque drops slightly as top speed is approached
          const effectiveAccel = currentAccel * (1 - speedRatio * 0.4)
          this.speed = Math.min(currentMaxForward, this.speed + effectiveAccel * throttle * clampedDt)
        }
      } else if (throttle < -0.02) {
        // Reversing or braking from forward
        if (this.speed > 0.2) {
          // Braking from forward
          this.speed = Math.max(0, this.speed - this.config.brakeDeceleration * Math.abs(throttle) * clampedDt)
        } else {
          // Reverse gear
          this.speed = Math.max(
            -this.config.reverseMaxSpeed,
            this.speed - this.config.acceleration * 0.6 * Math.abs(throttle) * clampedDt
          )
        }
      } else {
        // Coasting: natural rolling resistance and aerodynamic drag
        const drag = (this.config.rollingFriction + this.config.airResistance * this.speed * this.speed) * clampedDt
        if (Math.abs(this.speed) <= drag) {
          this.speed = 0
        } else if (this.speed > 0) {
          this.speed -= drag
        } else {
          this.speed += drag
        }
      }
    }

    // Determine current gear
    if (Math.abs(this.speed) < 0.2 && Math.abs(throttle) < 0.05) {
      this.gear = 'P'
    } else if (this.speed < -0.1) {
      this.gear = 'R'
    } else {
      this.gear = 'D'
    }

    // RPM calculation for audio and HUD tachometer
    const absSpeed = Math.abs(this.speed)
    const baseIdle = 900
    const maxRpm = 7500
    const gearSpeedBand = currentMaxForward / 4
    const gearIndex = Math.min(3, Math.floor(absSpeed / gearSpeedBand))
    const speedInGear = (absSpeed - gearIndex * gearSpeedBand) / gearSpeedBand
    const targetRpm = baseIdle + speedInGear * (maxRpm - baseIdle) + (throttle > 0 ? 500 : 0)
    this.rpm = this.rpm + (targetRpm - this.rpm) * Math.min(1, 10 * clampedDt)

    // Visual Steering Lock & Ackermann turning geometry
    this.steerAngle = steer * this.config.maxSteerAngleRad

    // Angular turning calculation: speed-sensitive steering
    if (Math.abs(this.speed) > 0.05 && this.isGrounded) {
      // Speed sensitivity factor (sharp, responsive steering throughout speed range)
      const speedNormalized = Math.min(1, absSpeed / this.config.maxSpeed)
      const steerFactor = 1.0 - speedNormalized * 0.22
      const turnDirection = this.speed >= 0 ? 1 : -1
      const turnRate = steer * this.config.turnSpeedBase * steerFactor * turnDirection

      // Drift physics: if turning sharply at high speed or using handbrake
      const lateralG = Math.abs(steer) * absSpeed
      if (lateralG > this.config.driftThreshold || brake) {
        this.isDrifting = true
        // Extra yaw rotation slip while drifting
        this.heading += turnRate * 1.35 * clampedDt
      } else {
        this.isDrifting = false
        this.heading += turnRate * clampedDt
      }
    } else {
      this.isDrifting = false
    }

    // Compute velocity vectors in world coordinates
    const forwardX = Math.sin(this.heading)
    const forwardZ = Math.cos(this.heading)

    // Update horizontal positions
    this.vx = forwardX * this.speed
    this.vz = forwardZ * this.speed
    this.x += this.vx * clampedDt
    this.z += this.vz * clampedDt

    // Vertical physics (gravity & ramps)
    let groundHeight = 0
    let onRamp = false

    // 1. Check ramp obstacles for elevation
    for (const obs of this.obstacles) {
      if (obs.isRamp) {
        if (
          this.x >= obs.minX - 0.4 &&
          this.x <= obs.maxX + 0.4 &&
          this.z >= obs.minZ - 0.4 &&
          this.z <= obs.maxZ + 0.4
        ) {
          onRamp = true
          const dir = obs.direction || '+Z'
          let t = 0
          if (dir === '+Z') {
            t = (this.z - obs.minZ) / Math.max(0.001, obs.maxZ - obs.minZ)
          } else if (dir === '-Z') {
            t = (obs.maxZ - this.z) / Math.max(0.001, obs.maxZ - obs.minZ)
          } else if (dir === '+X') {
            t = (this.x - obs.minX) / Math.max(0.001, obs.maxX - obs.minX)
          } else if (dir === '-X') {
            t = (obs.maxX - this.x) / Math.max(0.001, obs.maxX - obs.minX)
          }
          t = Math.max(0, Math.min(1, t))
          const rampHeight = t * obs.height
          groundHeight = Math.max(groundHeight, rampHeight)

          // If exiting the high end of the ramp with forward speed, launch into jump!
          if (t > 0.82 && Math.abs(this.speed) > 4.5 && this.isGrounded) {
            this.vy = (Math.abs(this.speed) / this.config.maxSpeed) * this.config.jumpForce * 1.25
            this.isGrounded = false
          }
        }
      } else if (obs.isBridge) {
        if (
          this.x >= obs.minX - 0.4 &&
          this.x <= obs.maxX + 0.4 &&
          this.z >= obs.minZ - 0.4 &&
          this.z <= obs.maxZ + 0.4
        ) {
          if (this.y >= obs.height - 1.2) {
            groundHeight = Math.max(groundHeight, obs.height)
          }
        }
      }
    }

    if (!this.isGrounded) {
      // Airborne: apply gravity
      this.vy -= this.config.gravity * clampedDt
      this.y += this.vy * clampedDt

      // Pitch up slightly on jump
      this.pitch = this.pitch + (-0.2 - this.pitch) * 4 * clampedDt

      // Touchdown check
      if (this.y <= groundHeight) {
        this.y = groundHeight
        this.vy = 0
        this.isGrounded = true
      }
    } else {
      if (this.y > groundHeight + 0.05) {
        // Vehicle just left edge of high ground
        this.isGrounded = false
      } else {
        this.y = groundHeight
        this.vy = 0
      }
    }

    // Cornering roll & acceleration pitch simulation for visuals
    const targetRoll = -steer * (absSpeed / this.config.maxSpeed) * 0.12
    const targetPitch = (throttle * 0.08) - (brake ? 0.15 : 0) + (onRamp ? -0.25 : 0)
    this.roll = this.roll + (targetRoll - this.roll) * this.config.suspensionDamping * clampedDt
    this.pitch = this.pitch + (targetPitch - this.pitch) * this.config.suspensionDamping * clampedDt

    // 2. Multi-point Physical Collisions with Obstacles and Perimeter Walls
    this.resolveCollisions(forwardX, forwardZ)

    // 3. Absolute unbreakable safety blockades: car CANNOT escape the world under any condition
    const maxBoundX = this.arenaHalfWidth - 1.2
    const maxBoundZ = this.arenaHalfLength - 1.2

    if (this.x > maxBoundX) {
      this.x = maxBoundX
      this.speed *= -0.25
      this.triggerCollision(4)
    } else if (this.x < -maxBoundX) {
      this.x = -maxBoundX
      this.speed *= -0.25
      this.triggerCollision(4)
    }

    if (this.z > maxBoundZ) {
      this.z = maxBoundZ
      this.speed *= -0.25
      this.triggerCollision(4)
    } else if (this.z < -maxBoundZ) {
      this.z = -maxBoundZ
      this.speed *= -0.25
      this.triggerCollision(4)
    }

    if (this.y < 0) {
      this.y = 0
      this.vy = 0
      this.isGrounded = true
    }
  }

  /**
   * Advanced multi-point collision solver with normal impulse restitution,
   * angular deflection, and zero-penetration separation.
   */
  private resolveCollisions(forwardX: number, forwardZ: number) {
    const discRadius = 0.82
    const halfArm = 1.05

    // Multi-pass resolution for rock-solid stability
    for (let pass = 0; pass < 2; pass++) {
      // 3 Contact discs covering vehicle front, center, and rear
      const discs = [
        {
          x: this.x + forwardX * halfArm,
          z: this.z + forwardZ * halfArm,
          r: discRadius,
          isFront: true,
          isRear: false,
        },
        {
          x: this.x,
          z: this.z,
          r: discRadius,
          isFront: false,
          isRear: false,
        },
        {
          x: this.x - forwardX * halfArm,
          z: this.z - forwardZ * halfArm,
          r: discRadius,
          isFront: false,
          isRear: true,
        },
      ]

      // Check solid obstacles
      for (const obs of this.obstacles) {
        if (obs.isRamp) continue // ramps handled via slope elevation

        for (const disc of discs) {
          const px = Math.max(obs.minX, Math.min(obs.maxX, disc.x))
          const pz = Math.max(obs.minZ, Math.min(obs.maxZ, disc.z))

          const dx = disc.x - px
          const dz = disc.z - pz
          const distSq = dx * dx + dz * dz

          if (distSq < disc.r * disc.r) {
            let nx = 0
            let nz = 0
            let penetration = 0

            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq)
              penetration = disc.r - dist
              nx = dx / dist
              nz = dz / dist
            } else {
              // Deep overlap: resolve along minimum obstacle edge distance
              const dLeft = disc.x - obs.minX
              const dRight = obs.maxX - disc.x
              const dBottom = disc.z - obs.minZ
              const dTop = obs.maxZ - disc.z
              const minDist = Math.min(dLeft, dRight, dBottom, dTop)

              if (minDist === dLeft) { nx = -1; nz = 0; penetration = disc.r + dLeft }
              else if (minDist === dRight) { nx = 1; nz = 0; penetration = disc.r + dRight }
              else if (minDist === dBottom) { nx = 0; nz = -1; penetration = disc.r + dBottom }
              else { nx = 0; nz = 1; penetration = disc.r + dTop }
            }

            // Immediately separate vehicle to prevent penetrating or sticking
            this.x += nx * penetration
            this.z += nz * penetration

            // Velocity reflection and impact impulse
            const curVx = forwardX * this.speed
            const curVz = forwardZ * this.speed
            const vDotN = curVx * nx + curVz * nz

            if (vDotN < 0) {
              const restitution = 0.35
              const impulse = -(1 + restitution) * vDotN
              const newVx = curVx + nx * impulse
              const newVz = curVz + nz * impulse

              // Recompute scalar speed projected onto vehicle orientation
              this.speed = newVx * forwardX + newVz * forwardZ

              // Deflect vehicle heading if impact is off-center (front or rear bumper)
              const torque = forwardX * nz - forwardZ * nx
              if (disc.isFront) {
                this.heading += torque * 0.12
              } else if (disc.isRear) {
                this.heading -= torque * 0.12
              }

              this.triggerCollision(Math.min(10, Math.abs(vDotN) * 1.5))
            }
          }
        }
      }

      // Check continuous track guide walls (keep vehicle strictly inside the track)
      for (const wall of this.wallSegments) {
        const wallH = wall.height ?? 3.5
        if (this.y > wallH) continue

        const wx = wall.x2 - wall.x1
        const wz = wall.z2 - wall.z1
        const wLenSq = wx * wx + wz * wz
        if (wLenSq < 0.0001) continue

        for (const disc of discs) {
          const t = Math.max(0, Math.min(1, ((disc.x - wall.x1) * wx + (disc.z - wall.z1) * wz) / wLenSq))
          const px = wall.x1 + t * wx
          const pz = wall.z1 + t * wz
          const dx = disc.x - px
          const dz = disc.z - pz
          const distSq = dx * dx + dz * dz

          if (distSq < disc.r * disc.r) {
            const dist = Math.max(0.0001, Math.sqrt(distSq))
            const nx = dx / dist
            const nz = dz / dist
            const penetration = disc.r - dist

            // Separate vehicle immediately
            this.x += nx * penetration
            this.z += nz * penetration

            // Velocity reflection and sliding friction
            const curVx = forwardX * this.speed
            const curVz = forwardZ * this.speed
            const vDotN = curVx * nx + curVz * nz

            if (vDotN < 0) {
              const restitution = 0.25
              const impulse = -(1 + restitution) * vDotN
              const newVx = curVx + nx * impulse
              const newVz = curVz + nz * impulse

              this.speed = newVx * forwardX + newVz * forwardZ

              const torque = forwardX * nz - forwardZ * nx
              if (disc.isFront) {
                this.heading += torque * 0.15
              } else if (disc.isRear) {
                this.heading -= torque * 0.15
              }

              this.triggerCollision(Math.min(10, Math.abs(vDotN) * 1.5))
            }
          }
        }
      }

      // Check arena perimeter boundaries (Outer walls at +/- 42m)
      for (const disc of discs) {
        // East wall (+X)
        if (disc.x + disc.r > this.arenaHalfWidth) {
          const overlap = disc.x + disc.r - this.arenaHalfWidth
          this.x -= overlap
          const curVx = forwardX * this.speed
          if (curVx > 0) {
            this.speed *= -0.3
            this.triggerCollision(Math.abs(curVx) * 1.2)
            this.heading -= 0.05 * Math.sign(this.speed || 1)
          }
        }
        // West wall (-X)
        if (disc.x - disc.r < -this.arenaHalfWidth) {
          const overlap = -this.arenaHalfWidth - (disc.x - disc.r)
          this.x += overlap
          const curVx = forwardX * this.speed
          if (curVx < 0) {
            this.speed *= -0.3
            this.triggerCollision(Math.abs(curVx) * 1.2)
            this.heading += 0.05 * Math.sign(this.speed || 1)
          }
        }
        // North wall (+Z)
        if (disc.z + disc.r > this.arenaHalfLength) {
          const overlap = disc.z + disc.r - this.arenaHalfLength
          this.z -= overlap
          const curVz = forwardZ * this.speed
          if (curVz > 0) {
            this.speed *= -0.3
            this.triggerCollision(Math.abs(curVz) * 1.2)
            this.heading += 0.05 * Math.sign(this.speed || 1)
          }
        }
        // South wall (-Z)
        if (disc.z - disc.r < -this.arenaHalfLength) {
          const overlap = -this.arenaHalfLength - (disc.z - disc.r)
          this.z += overlap
          const curVz = forwardZ * this.speed
          if (curVz < 0) {
            this.speed *= -0.3
            this.triggerCollision(Math.abs(curVz) * 1.2)
            this.heading += 0.05 * Math.sign(this.speed || 1)
          }
        }
      }
    }
  }

  private triggerCollision(force: number) {
    this.collisionOccurred = true
    this.collisionForce = Math.min(10, force)
  }

  public getSpeedKmh(): number {
    return Number((this.speed * 3.6).toFixed(1))
  }
}
