import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  TransformNode,
} from '@babylonjs/core'
import type { VehiclePhysics } from './VehiclePhysics'

export type MovableType = 'crate' | 'barrel' | 'cone' | 'stuntSphere'

export interface MovableSpawn {
  id: string
  type: MovableType
  x: number
  y?: number
  z: number
  scale?: number
}

export interface MovableItem {
  id: string
  type: MovableType
  mesh: Mesh | TransformNode
  initialX: number
  initialY: number
  initialZ: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rotX: number
  rotY: number
  rotZ: number
  vRotX: number
  vRotY: number
  vRotZ: number
  radius: number
  baseY: number
  mass: number
  restitution: number
  friction: number
}

export class MovableObjectsManager {
  private scene: Scene
  private items: MovableItem[] = []
  private carMass = 120 // kg equivalent for RC scale

  constructor(scene: Scene) {
    this.scene = scene
  }

  public spawn(configs: MovableSpawn[]): MovableItem[] {
    const created: MovableItem[] = []

    // Shared Materials
    const crateMat = new StandardMaterial('crateMat', this.scene)
    crateMat.diffuseColor = new Color3(0.68, 0.45, 0.22) // warm wood
    crateMat.specularColor = new Color3(0.1, 0.1, 0.1)

    const crateBandMat = new StandardMaterial('crateBandMat', this.scene)
    crateBandMat.diffuseColor = new Color3(0.2, 0.22, 0.25) // dark steel braces

    const barrelMatRed = new StandardMaterial('barrelMatRed', this.scene)
    barrelMatRed.diffuseColor = new Color3(0.85, 0.18, 0.15)
    barrelMatRed.specularColor = new Color3(0.5, 0.5, 0.5)

    const barrelMatYellow = new StandardMaterial('barrelMatYellow', this.scene)
    barrelMatYellow.diffuseColor = new Color3(0.95, 0.75, 0.1)
    barrelMatYellow.specularColor = new Color3(0.5, 0.5, 0.5)

    const coneOrangeMat = new StandardMaterial('coneOrangeMat', this.scene)
    coneOrangeMat.diffuseColor = new Color3(1.0, 0.35, 0.02)
    coneOrangeMat.emissiveColor = new Color3(0.2, 0.05, 0.0)

    const coneWhiteMat = new StandardMaterial('coneWhiteMat', this.scene)
    coneWhiteMat.diffuseColor = new Color3(0.95, 0.95, 0.95)

    const sphereMat = new StandardMaterial('sphereMat', this.scene)
    sphereMat.diffuseColor = new Color3(0.1, 0.85, 0.9)
    sphereMat.specularColor = new Color3(0.9, 0.9, 0.9)

    for (const cfg of configs) {
      const scale = cfg.scale ?? 1.0
      let mesh: Mesh | TransformNode
      let radius = 0.8 * scale
      let mass = 25 * scale
      let restitution = 0.4
      let friction = 0.9
      let baseY = 0.5 * scale

      if (cfg.type === 'crate') {
        const root = new TransformNode(`crateNode_${cfg.id}`, this.scene)
        const box = MeshBuilder.CreateBox(`crateBox_${cfg.id}`, { size: 1.1 * scale }, this.scene)
        box.parent = root
        box.material = crateMat

        // Steel reinforcement bands
        const band1 = MeshBuilder.CreateBox(`crateBand1_${cfg.id}`, { width: 1.12 * scale, height: 0.12 * scale, depth: 1.12 * scale }, this.scene)
        band1.position.y = 0.35 * scale
        band1.parent = root
        band1.material = crateBandMat

        const band2 = MeshBuilder.CreateBox(`crateBand2_${cfg.id}`, { width: 1.12 * scale, height: 0.12 * scale, depth: 1.12 * scale }, this.scene)
        band2.position.y = -0.35 * scale
        band2.parent = root
        band2.material = crateBandMat

        mesh = root
        baseY = (1.1 * scale) / 2
        radius = 0.75 * scale
        mass = 28 * scale
        restitution = 0.3
        friction = 0.9
      } else if (cfg.type === 'barrel') {
        const root = new TransformNode(`barrelNode_${cfg.id}`, this.scene)
        const cylinder = MeshBuilder.CreateCylinder(`barrelCyl_${cfg.id}`, {
          diameter: 0.95 * scale,
          height: 1.35 * scale,
          tessellation: 16,
        }, this.scene)
        cylinder.parent = root
        cylinder.material = (cfg.x + cfg.z) % 2 === 0 ? barrelMatRed : barrelMatYellow

        // Ribs
        const rib = MeshBuilder.CreateTorus(`barrelRib_${cfg.id}`, {
          diameter: 0.96 * scale,
          thickness: 0.06 * scale,
          tessellation: 16,
        }, this.scene)
        rib.parent = root
        rib.material = crateBandMat

        mesh = root
        baseY = (1.35 * scale) / 2
        radius = 0.65 * scale
        mass = 20 * scale
        restitution = 0.45
        friction = 0.88
      } else if (cfg.type === 'cone') {
        const root = new TransformNode(`coneNode_${cfg.id}`, this.scene)
        const coneMesh = MeshBuilder.CreateCylinder(`coneCyl_${cfg.id}`, {
          diameterTop: 0.08 * scale,
          diameterBottom: 0.8 * scale,
          height: 1.1 * scale,
          tessellation: 14,
        }, this.scene)
        coneMesh.parent = root
        coneMesh.material = coneOrangeMat

        const coneStripe = MeshBuilder.CreateCylinder(`coneStripe_${cfg.id}`, {
          diameterTop: 0.35 * scale,
          diameterBottom: 0.52 * scale,
          height: 0.28 * scale,
          tessellation: 14,
        }, this.scene)
        coneStripe.position.y = 0.05 * scale
        coneStripe.parent = root
        coneStripe.material = coneWhiteMat

        const coneBase = MeshBuilder.CreateBox(`coneBase_${cfg.id}`, {
          width: 0.95 * scale,
          height: 0.08 * scale,
          depth: 0.95 * scale,
        }, this.scene)
        coneBase.position.y = -0.52 * scale
        coneBase.parent = root
        coneBase.material = coneOrangeMat

        mesh = root
        baseY = (1.1 * scale) / 2
        radius = 0.55 * scale
        mass = 7 * scale // Lightweight! Flies easily
        restitution = 0.55
        friction = 0.82
      } else {
        // Stunt bouncy sphere
        const sphere = MeshBuilder.CreateSphere(`sphere_${cfg.id}`, {
          diameter: 1.4 * scale,
          segments: 16,
        }, this.scene)
        sphere.material = sphereMat
        mesh = sphere
        baseY = 0.7 * scale
        radius = 0.7 * scale
        mass = 12 * scale
        restitution = 0.75 // very bouncy!
        friction = 0.85
      }

      const spawnY = cfg.y ?? baseY
      mesh.position.set(cfg.x, spawnY, cfg.z)

      const item: MovableItem = {
        id: cfg.id,
        type: cfg.type,
        mesh,
        initialX: cfg.x,
        initialY: spawnY,
        initialZ: cfg.z,
        x: cfg.x,
        y: spawnY,
        z: cfg.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0,
        vRotY: 0,
        vRotZ: 0,
        radius,
        baseY,
        mass,
        restitution,
        friction,
      }

      this.items.push(item)
      created.push(item)
    }

    return created
  }

  public update(dt: number, car: VehiclePhysics): number {
    const clampedDt = Math.min(0.05, Math.max(0.001, dt))
    const decay = Math.pow(0.92, clampedDt * 60)
    const angularDecay = Math.pow(0.9, clampedDt * 60)
    let maxCollisionForce = 0

    // Car contact discs
    const forwardX = Math.sin(car.heading)
    const forwardZ = Math.cos(car.heading)
    const carDiscs = [
      { x: car.x + forwardX * 1.1, z: car.z + forwardZ * 1.1, r: 0.8 },
      { x: car.x, z: car.z, r: 0.8 },
      { x: car.x - forwardX * 1.1, z: car.z - forwardZ * 1.1, r: 0.8 },
    ]
    const carVx = forwardX * car.speed
    const carVz = forwardZ * car.speed
    const carSpeedAbs = Math.abs(car.speed)

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]

      // 1. Vehicle Collision with this movable item
      for (const disc of carDiscs) {
        const dx = item.x - disc.x
        const dz = item.z - disc.z
        const minDist = item.radius + disc.r
        const distSq = dx * dx + dz * dz

        if (distSq < minDist * minDist) {
          const dist = Math.max(0.001, Math.sqrt(distSq))
          const penetration = minDist - dist

          // Direction of impact outward from car
          let pushX = item.x - car.x
          let pushZ = item.z - car.z
          const pushLen = Math.hypot(pushX, pushZ)
          if (pushLen > 0.001) {
            pushX /= pushLen
            pushZ /= pushLen
          } else {
            pushX = forwardX
            pushZ = forwardZ
          }

          // Blend with vehicle travel direction for realistic forward projection
          if (carSpeedAbs > 0.5) {
            pushX = pushX * 0.4 + (carVx / carSpeedAbs) * 0.6
            pushZ = pushZ * 0.4 + (carVz / carSpeedAbs) * 0.6
            const norm = Math.hypot(pushX, pushZ)
            if (norm > 0.001) {
              pushX /= norm
              pushZ /= norm
            }
          }

          // Separate immediately
          item.x += pushX * penetration
          item.z += pushZ * penetration

          // Relative velocity along impact direction
          const relVx = carVx - item.vx
          const relVz = carVz - item.vz
          const closingSpeed = relVx * pushX + relVz * pushZ

          if (closingSpeed > 0 || carSpeedAbs > 0.5) {
            const effectiveImpactSpeed = Math.max(closingSpeed, carSpeedAbs * 0.75)
            const impulse =
              (1 + item.restitution) *
              ((this.carMass * item.mass) / (this.carMass + item.mass)) *
              effectiveImpactSpeed *
              0.15

            // Propel object along impact direction
            item.vx += pushX * impulse * (22 / item.mass)
            item.vz += pushZ * impulse * (22 / item.mass)
            item.vy = Math.min(10, Math.max(item.vy, impulse * 0.55 + effectiveImpactSpeed * 0.35))

            // Tumble rotational impulse
            const torque = (Math.random() - 0.5) * impulse * 1.5
            item.vRotX += pushZ * impulse * 0.8 + torque
            item.vRotZ += -pushX * impulse * 0.8 + torque
            item.vRotY += torque * 2

            // Attenuate car speed proportionally to obstacle mass
            const speedPenalty = (item.mass / this.carMass) * Math.min(2.5, effectiveImpactSpeed * 0.12)
            if (car.speed > 0) {
              car.speed = Math.max(0, car.speed - speedPenalty)
            } else if (car.speed < 0) {
              car.speed = Math.min(0, car.speed + speedPenalty)
            }

            const hitForce = Math.min(10, effectiveImpactSpeed * 1.2)
            if (hitForce > maxCollisionForce) {
              maxCollisionForce = hitForce
            }
          }
        }
      }

      // 2. Pairwise Collision between movable items
      for (let j = i + 1; j < this.items.length; j++) {
        const other = this.items[j]
        const dx = other.x - item.x
        const dz = other.z - item.z
        const minDist = item.radius + other.radius
        const distSq = dx * dx + dz * dz

        if (distSq < minDist * minDist) {
          const dist = Math.max(0.001, Math.sqrt(distSq))
          const nx = dx / dist
          const nz = dz / dist
          const penetration = minDist - dist

          // Separate equally
          item.x -= nx * penetration * 0.5
          item.z -= nz * penetration * 0.5
          other.x += nx * penetration * 0.5
          other.z += nz * penetration * 0.5

          const relVx = item.vx - other.vx
          const relVz = item.vz - other.vz
          const vRelDotN = relVx * nx + relVz * nz

          if (vRelDotN > 0) {
            const e = (item.restitution + other.restitution) * 0.5
            const impulse = (1 + e) * vRelDotN * 0.5

            item.vx -= nx * impulse
            item.vz -= nz * impulse
            other.vx += nx * impulse
            other.vz += nz * impulse

            item.vRotY += (Math.random() - 0.5) * impulse
            other.vRotY += (Math.random() - 0.5) * impulse
          }
        }
      }

      // 3. Vertical Physics & Ground
      if (item.y > item.baseY) {
        item.vy -= 22 * clampedDt // Gravity
        item.y += item.vy * clampedDt

        if (item.y <= item.baseY) {
          item.y = item.baseY
          if (Math.abs(item.vy) > 1.2) {
            item.vy = -item.vy * item.restitution * 0.5
          } else {
            item.vy = 0
          }
        }
      } else {
        item.y = item.baseY
        item.vy = 0
      }

      // 4. Horizontal Integration & Friction
      item.x += item.vx * clampedDt
      item.z += item.vz * clampedDt
      item.vx *= decay
      item.vz *= decay

      // 5. Angular Integration & Decay
      item.rotX += item.vRotX * clampedDt
      item.rotY += item.vRotY * clampedDt
      item.rotZ += item.vRotZ * clampedDt
      item.vRotX *= angularDecay
      item.vRotY *= angularDecay
      item.vRotZ *= angularDecay

      // Cones and barrels gently upright themselves when almost stopped
      if (Math.abs(item.vx) < 0.1 && Math.abs(item.vz) < 0.1 && item.y <= item.baseY + 0.05) {
        if (item.type === 'cone' || item.type === 'barrel') {
          item.rotX *= 0.92
          item.rotZ *= 0.92
        }
      }

      // 6. Arena Boundaries (Stay inside circuit perimeter)
      const arenaLimit = car.arenaHalfWidth - item.radius - 1
      if (item.x > arenaLimit) {
        item.x = arenaLimit
        item.vx = -Math.abs(item.vx) * item.restitution
      } else if (item.x < -arenaLimit) {
        item.x = -arenaLimit
        item.vx = Math.abs(item.vx) * item.restitution
      }

      const arenaLimitZ = car.arenaHalfLength - item.radius - 1
      if (item.z > arenaLimitZ) {
        item.z = arenaLimitZ
        item.vz = -Math.abs(item.vz) * item.restitution
      } else if (item.z < -arenaLimitZ) {
        item.z = -arenaLimitZ
        item.vz = Math.abs(item.vz) * item.restitution
      }

      // 7. Sync Mesh
      item.mesh.position.set(item.x, item.y, item.z)
      item.mesh.rotation.x = item.rotX
      item.mesh.rotation.y = item.rotY
      item.mesh.rotation.z = item.rotZ
    }

    return maxCollisionForce
  }

  public resetAll() {
    for (const item of this.items) {
      item.x = item.initialX
      item.y = item.initialY
      item.z = item.initialZ
      item.vx = 0
      item.vy = 0
      item.vz = 0
      item.rotX = 0
      item.rotY = 0
      item.rotZ = 0
      item.vRotX = 0
      item.vRotY = 0
      item.vRotZ = 0

      item.mesh.position.set(item.x, item.y, item.z)
      item.mesh.rotation.set(0, 0, 0)
    }
  }

  public getItems(): MovableItem[] {
    return this.items
  }
}
