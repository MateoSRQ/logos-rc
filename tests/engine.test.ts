import { describe, it, expect } from 'vitest'
import { NullEngine, Scene } from '@babylonjs/core'
import { VehiclePhysics } from '../src/engine/VehiclePhysics'
import { MovableObjectsManager } from '../src/engine/MovableObjects'
import { GyroCalibrator } from '../src/engine/GyroCalibration'
import { isControlPacket, isTelemetryPacket, ControlPacket, TelemetryPacket } from '../src/net/protocol'

describe('FEAT-001: VehiclePhysics & Engine Unit Tests', () => {
  it('UNIT-001: Accelerates smoothly from standstill', () => {
    const car = new VehiclePhysics()
    expect(car.speed).toBe(0)
    expect(car.gear).toBe('P')

    // Apply forward throttle
    car.update(0.016, 1.0, 0, false, false)

    expect(car.speed).toBeGreaterThan(0)
    expect(car.gear).toBe('D')
    expect(car.rpm).toBeGreaterThan(800)
  })

  it('UNIT-002: Brakes and slows down under resistance and active brake', () => {
    const car = new VehiclePhysics()
    car.speed = 10.0 // moving forward
    car.gear = 'D'

    car.update(0.016, 0, 0, true, false) // active brake
    expect(car.speed).toBeLessThan(10.0)

    // Verify rolling friction without throttle
    const speedBefore = car.speed
    car.update(0.05, 0, 0, false, false)
    expect(car.speed).toBeLessThan(speedBefore)
  })

  it('UNIT-003: Steering affects vehicle heading when moving', () => {
    const car = new VehiclePhysics()
    car.speed = 8.0
    const initialHeading = car.heading

    // Steer right (+1)
    car.update(0.02, 1.0, 1.0, false, false)

    expect(car.heading).toBeGreaterThan(initialHeading)
    expect(car.steerAngle).toBeGreaterThan(0)
  })

  it('UNIT-004: Enters reverse when stopped and applying negative throttle', () => {
    const car = new VehiclePhysics()
    car.speed = 0
    car.gear = 'P'

    // Negative throttle from standstill
    car.update(0.02, -0.8, 0, false, false)

    expect(car.speed).toBeLessThan(0)
    expect(car.gear).toBe('R')
  })

  it('UNIT-005: GyroCalibrator normalizes roll and pitch within deadzone and bounds', () => {
    const calibrator = new GyroCalibrator({ deadzone: 0.05, maxRollAngle: 30, maxPitchAngle: 30 })

    // Zero angles
    const neutral = calibrator.process(0, 0, 0, false)
    expect(neutral.calibratedRoll).toBe(0)
    expect(neutral.calibratedPitch).toBe(0)

    // Tilting right by 15 deg (within bounds)
    // Run several iterations to allow EMA smoothing to converge
    let result = neutral
    for (let i = 0; i < 20; i++) {
      result = calibrator.process(0, 0, 15, false)
    }
    expect(result.calibratedRoll).toBeGreaterThan(0.2)
    expect(result.calibratedRoll).toBeLessThanOrEqual(1.0)

    // Test calibration zero offset
    calibrator.calibrate(10, 10)
    let reOffset = neutral
    for (let i = 0; i < 20; i++) {
      reOffset = calibrator.process(0, 10, 10, false)
    }
    expect(Math.abs(reOffset.calibratedRoll)).toBeLessThan(0.02)
    expect(Math.abs(reOffset.calibratedPitch)).toBeLessThan(0.02)
  })

  it('UNIT-006: Protocol packet type guards correctly validate payload format', () => {
    const sampleControl: ControlPacket = {
      type: 'control',
      room: 'RC-1234',
      timestamp: Date.now(),
      steer: 0.25,
      throttle: 0.8,
      brake: false,
      boost: true,
      gyro: {
        alpha: 0,
        beta: 10,
        gamma: 5,
        calibratedRoll: 0.2,
        calibratedPitch: 0.3,
      },
    }

    const sampleTelemetry: TelemetryPacket = {
      type: 'telemetry',
      room: 'RC-1234',
      timestamp: Date.now(),
      speedKmh: 45.5,
      rpm: 3800,
      gear: 'D',
      nitro: 85,
      collision: false,
      lightsOn: true,
      cameraMode: 'chase',
    }

    expect(isControlPacket(sampleControl)).toBe(true)
    expect(isControlPacket(sampleTelemetry)).toBe(false)
    expect(isTelemetryPacket(sampleTelemetry)).toBe(true)
    expect(isTelemetryPacket(sampleControl)).toBe(false)
    expect(isControlPacket({ type: 'other' })).toBe(false)
  })

  it('UNIT-007: Multi-point collision resolves solid obstacle impact and deflects vehicle', () => {
    const car = new VehiclePhysics()
    car.setObstacles([
      {
        minX: -2,
        maxX: 2,
        minZ: 4,
        maxZ: 6,
        height: 1.5,
        isRamp: false,
      },
    ])

    // Place car moving forward (+Z) directly towards obstacle at z = 4
    car.reset(0, 3.0, 0)
    car.speed = 10.0

    // Advance physics
    car.update(0.05, 1.0, 0, false, false)

    expect(car.collisionOccurred).toBe(true)
    expect(car.collisionForce).toBeGreaterThan(0)
    // Vehicle front should be stopped or pushed back, not penetrating past obstacle center
    expect(car.z).toBeLessThan(4.5)
  })

  it('UNIT-008: Directional jump ramps launch the car into the air on ramps facing -Z or +X', () => {
    const car = new VehiclePhysics()
    car.setObstacles([
      {
        minX: -3,
        maxX: 3,
        minZ: -20,
        maxZ: -10,
        height: 3.0,
        isRamp: true,
        direction: '-Z',
      },
    ])

    // Place car driving towards -Z (speed = -12 or heading towards -Z)
    car.reset(0, -11, Math.PI)
    car.speed = 12.0

    // Advance over the ramp
    car.update(0.04, 1.0, 0, false, false)

    // Should detect ramp elevation and launch into airborne state
    expect(car.y).toBeGreaterThan(0)
  })

  it('UNIT-009: MovableObjectsManager spawns dynamic bodies and propels them when hit by the car', () => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const manager = new MovableObjectsManager(scene)

    manager.spawn([
      { id: 'test_crate', type: 'crate', x: 0, z: 5, scale: 1.0 },
      { id: 'test_cone', type: 'cone', x: 0, z: 8, scale: 1.0 },
    ])

    const items = manager.getItems()
    expect(items.length).toBe(2)
    expect(items[0].x).toBe(0)
    expect(items[0].z).toBe(5)

    const car = new VehiclePhysics()
    car.reset(0, 4.0, 0)
    car.speed = 15.0

    // Update manager with car moving into crate
    const hitForce = manager.update(0.03, car)

    expect(hitForce).toBeGreaterThan(0)
    // Crate should be propelled along forward Z and tumble
    expect(items[0].vz).toBeGreaterThan(0)
    expect(items[0].z).toBeGreaterThan(5.0)

    // Test clean reset
    manager.resetAll()
    expect(items[0].z).toBe(5)
    expect(items[0].vz).toBe(0)

    engine.dispose()
  })

  it('UNIT-010: Continuous track wall segments deflect vehicle and prevent escaping track boundaries', () => {
    const car = new VehiclePhysics()
    // Define a straight track corridor bounded by left wall at x = -7 and right wall at x = +7
    car.setWalls([
      { x1: -7, z1: -50, x2: -7, z2: 50, height: 2.5 },
      { x1: 7, z1: -50, x2: 7, z2: 50, height: 2.5 },
    ])

    // Place car moving sharply towards the right wall (+X)
    car.reset(6.0, 0, Math.PI / 4) // angle heading right
    car.speed = 12.0

    // Advance physics
    car.update(0.04, 1.0, 0, false, false)

    // The car must be stopped/deflected by the right wall (x < 7.0)
    expect(car.x).toBeLessThan(7.0)
    expect(car.collisionOccurred).toBe(true)
  })
})
