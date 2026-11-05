import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core'
import type { ObstacleBox, WallSegment } from './VehiclePhysics'
import { MovableObjectsManager } from './MovableObjects'

export interface TrackElements {
  ground: Mesh
  ramps: Mesh[]
  obstacles: ObstacleBox[]
  wallSegments: WallSegment[]
  movableManager: MovableObjectsManager
}

export function buildTrack(scene: Scene): TrackElements {
  const obstacles: ObstacleBox[] = []
  const wallSegments: WallSegment[] = []
  const ramps: Mesh[] = []
  const movableManager = new MovableObjectsManager(scene)

  const ARENA_HALF = 180

  // ==========================================
  // 1. BASE GROUND & INFIELD MEADOW
  // ==========================================
  const terrainGround = MeshBuilder.CreateGround('terrainGround', { width: 420, height: 420, subdivisions: 4 }, scene)
  terrainGround.position.y = -0.05
  const terrainMat = new StandardMaterial('terrainMat', scene)
  terrainMat.diffuseColor = new Color3(0.14, 0.22, 0.12) // manicured speedway turf
  terrainMat.specularColor = new Color3(0.02, 0.02, 0.02)
  terrainGround.material = terrainMat
  terrainGround.receiveShadows = true

  const ground = MeshBuilder.CreateGround('asphalt', { width: 380, height: 380, subdivisions: 2 }, scene)
  const asphaltMat = new StandardMaterial('asphaltMat', scene)
  asphaltMat.diffuseColor = new Color3(0.1, 0.11, 0.13)
  ground.material = asphaltMat
  ground.receiveShadows = true

  // ==========================================
  // 2. SPEEDWAY MATERIALS (INDIANAPOLIS RACING STYLE)
  // ==========================================
  const roadMat = new StandardMaterial('roadTarmacMat', scene)
  roadMat.diffuseColor = new Color3(0.08, 0.09, 0.11) // slick IMS asphalt
  roadMat.specularColor = new Color3(0.12, 0.12, 0.12)

  const whiteLineMat = new StandardMaterial('whiteLineMat', scene)
  whiteLineMat.diffuseColor = new Color3(0.96, 0.96, 0.98)
  whiteLineMat.emissiveColor = new Color3(0.3, 0.3, 0.3)

  const yellowLineMat = new StandardMaterial('yellowLineMat', scene)
  yellowLineMat.diffuseColor = new Color3(1.0, 0.85, 0.05)
  yellowLineMat.emissiveColor = new Color3(0.35, 0.25, 0.0)

  // Indianapolis SAFER Barrier Walls (White with yellow/red upper impact rim)
  const saferBarrierMat = new StandardMaterial('saferBarrierMat', scene)
  saferBarrierMat.diffuseColor = new Color3(0.95, 0.95, 0.95)
  saferBarrierMat.specularColor = new Color3(0.4, 0.4, 0.4)

  const rimImpactMat = new StandardMaterial('rimImpactMat', scene)
  rimImpactMat.diffuseColor = new Color3(0.9, 0.12, 0.12) // safety red rim
  rimImpactMat.emissiveColor = new Color3(0.3, 0.02, 0.02)

  const brickMat = new StandardMaterial('brickMat', scene)
  brickMat.diffuseColor = new Color3(0.65, 0.22, 0.15) // historic red/terracotta vitrified brick
  brickMat.specularColor = new Color3(0.2, 0.2, 0.2)

  const goldMat = new StandardMaterial('goldMat', scene)
  goldMat.diffuseColor = new Color3(0.95, 0.8, 0.15)
  goldMat.emissiveColor = new Color3(0.4, 0.3, 0.05)

  const glassTowerMat = new StandardMaterial('glassTowerMat', scene)
  glassTowerMat.diffuseColor = new Color3(0.1, 0.35, 0.5)
  glassTowerMat.alpha = 0.75

  const towerSteelMat = new StandardMaterial('towerSteelMat', scene)
  towerSteelMat.diffuseColor = new Color3(0.2, 0.22, 0.25)

  const loopGlowMat = new StandardMaterial('loopGlowMat', scene)
  loopGlowMat.diffuseColor = new Color3(0.0, 0.8, 1.0)
  loopGlowMat.emissiveColor = new Color3(0.0, 0.6, 0.9)

  // ==========================================
  // 3. INDIANAPOLIS OVAL TRACK WAYPOINTS
  // ==========================================
  // Rectangular Oval geometry with 4 distinct banked corners:
  // Frontstretch (180m) -> Turn 1 -> North Short Chute -> Turn 2 -> Backstretch (180m) -> Turn 3 -> South Short Chute -> Turn 4
  const OVAL_WIDTH = 18
  const WALL_HEIGHT = 2.6
  const halfW = OVAL_WIDTH / 2

  const ovalWaypoints: [number, number][] = [
    [0, -90],    // WP 0: Frontstretch entry (from Turn 4)
    [0, 90],     // WP 1: Frontstretch end (180m straight!)
    [32, 125],   // WP 2: Turn 1 (90 deg banked curve)
    [88, 125],   // WP 3: North Short Chute
    [120, 90],   // WP 4: Turn 2 (90 deg banked curve)
    [120, -90],  // WP 5: Backstretch (180m straight with Mega Jump!)
    [88, -125],  // WP 6: Turn 3 (90 deg banked curve)
    [32, -125],  // WP 7: South Short Chute
    [0, -90],    // WP 8: Turn 4 exit (Reconnects seamlessly to WP 0!)
  ]

  // Helper to build walled road segments
  function buildWalledSegment(
    name: string,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width: number = OVAL_WIDTH,
    isBanking: boolean = false
  ) {
    const dx = x2 - x1
    const dz = z2 - z1
    const segLen = Math.hypot(dx, dz)
    const angle = Math.atan2(dx, dz)
    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const segHalfW = width / 2

    const perpX = dz / segLen
    const perpZ = -dx / segLen

    // 2D endpoints of left and right walls in world space
    const leftX1 = x1 - perpX * segHalfW
    const leftZ1 = z1 - perpZ * segHalfW
    const leftX2 = x2 - perpX * segHalfW
    const leftZ2 = z2 - perpZ * segHalfW

    const rightX1 = x1 + perpX * segHalfW
    const rightZ1 = z1 + perpZ * segHalfW
    const rightX2 = x2 + perpX * segHalfW
    const rightZ2 = z2 + perpZ * segHalfW

    // Register wall line segments into physics engine (guarantees car CANNOT escape track)
    wallSegments.push({ x1: leftX1, z1: leftZ1, x2: leftX2, z2: leftZ2, height: WALL_HEIGHT })
    wallSegments.push({ x1: rightX1, z1: rightZ1, x2: rightX2, z2: rightZ2, height: WALL_HEIGHT })

    // 1. Asphalt Roadway Mesh
    const road = MeshBuilder.CreateGround(name, { width, height: segLen }, scene)
    road.position.set(midX, 0.01, midZ)
    road.rotation.y = angle
    road.material = roadMat
    road.receiveShadows = true

    // 2. White Border Lines (delimitación visual clara)
    const lineL = MeshBuilder.CreateGround(`${name}_wL`, { width: 0.45, height: segLen }, scene)
    lineL.position.set(-segHalfW + 0.35, 0.02, 0)
    lineL.parent = road
    lineL.material = whiteLineMat

    const lineR = MeshBuilder.CreateGround(`${name}_wR`, { width: 0.45, height: segLen }, scene)
    lineR.position.set(segHalfW - 0.35, 0.02, 0)
    lineR.parent = road
    lineR.material = whiteLineMat

    // 3. Center Yellow Dashes
    const dashes = Math.floor(segLen / 9)
    for (let d = 0; d < dashes; d++) {
      const dashZ = -segLen / 2 + 4.5 + d * 9
      const dash = MeshBuilder.CreateGround(`${name}_dash_${d}`, { width: 0.45, height: 4.5 }, scene)
      dash.position.set(0, 0.02, dashZ)
      dash.parent = road
      dash.material = yellowLineMat
    }

    // 4. Physical SAFER Barrier Walls (Left & Right)
    const wallL = MeshBuilder.CreateBox(`${name}_wallL`, { width: 0.6, height: WALL_HEIGHT, depth: segLen }, scene)
    wallL.position.set(-segHalfW - 0.3, WALL_HEIGHT / 2, 0)
    wallL.parent = road
    wallL.material = saferBarrierMat

    const rimL = MeshBuilder.CreateBox(`${name}_rimL`, { width: 0.62, height: 0.3, depth: segLen }, scene)
    rimL.position.set(-segHalfW - 0.3, WALL_HEIGHT - 0.15, 0)
    rimL.parent = road
    rimL.material = rimImpactMat

    const wallR = MeshBuilder.CreateBox(`${name}_wallR`, { width: 0.6, height: WALL_HEIGHT, depth: segLen }, scene)
    wallR.position.set(segHalfW + 0.3, WALL_HEIGHT / 2, 0)
    wallR.parent = road
    wallR.material = saferBarrierMat

    const rimR = MeshBuilder.CreateBox(`${name}_rimR`, { width: 0.62, height: 0.3, depth: segLen }, scene)
    rimR.position.set(segHalfW + 0.3, WALL_HEIGHT - 0.15, 0)
    rimR.parent = road
    rimR.material = rimImpactMat
  }

  // Build the complete Indianapolis Oval Circuit
  for (let i = 0; i < ovalWaypoints.length - 1; i++) {
    const [x1, z1] = ovalWaypoints[i]
    const [x2, z2] = ovalWaypoints[i + 1]
    buildWalledSegment(`imsOval_${i}`, x1, z1, x2, z2, OVAL_WIDTH)
  }

  // ==========================================
  // 4. THE FAMOUS "YARD OF BRICKS" (START/FINISH LINE)
  // ==========================================
  // Authentic historic 1-yard wide strip of vitrified bricks crossing the frontstretch
  const yardOfBricks = MeshBuilder.CreateGround('yardOfBricks', { width: OVAL_WIDTH, height: 1.0 }, scene)
  yardOfBricks.position = new Vector3(0, 0.03, -20)
  yardOfBricks.material = brickMat

  // Gold Indianapolis Monument Plaque in center
  const goldPlaque = MeshBuilder.CreateGround('goldPlaque', { width: 2.2, height: 0.6 }, scene)
  goldPlaque.position = new Vector3(0, 0.035, -20)
  goldPlaque.material = goldMat

  // White start/finish reference lines framing the bricks
  const frameL = MeshBuilder.CreateGround('brickFrameL', { width: OVAL_WIDTH, height: 0.2 }, scene)
  frameL.position = new Vector3(0, 0.032, -20.6)
  frameL.material = whiteLineMat

  const frameR = MeshBuilder.CreateGround('brickFrameR', { width: OVAL_WIDTH, height: 0.2 }, scene)
  frameR.position = new Vector3(0, 0.032, -19.4)
  frameR.material = whiteLineMat

  // ==========================================
  // 5. THE ICONIC IMS PAGODA TOWER & SCORING PYLON
  // ==========================================
  // Multi-tier modernist Pagoda control tower beside the frontstretch (at X = -14, Z = -20)
  const pagodaBase = MeshBuilder.CreateBox('pagodaBase', { width: 8, height: 3.5, depth: 10 }, scene)
  pagodaBase.position.set(-14, 1.75, -20)
  pagodaBase.material = towerSteelMat

  const pagodaTier1 = MeshBuilder.CreateBox('pagodaTier1', { width: 9.5, height: 3, depth: 11.5 }, scene)
  pagodaTier1.position.set(-14, 5.0, -20)
  pagodaTier1.material = glassTowerMat

  const pagodaTier2 = MeshBuilder.CreateBox('pagodaTier2', { width: 8, height: 2.8, depth: 10 }, scene)
  pagodaTier2.position.set(-14, 7.9, -20)
  pagodaTier2.material = glassTowerMat

  const pagodaTier3 = MeshBuilder.CreateBox('pagodaTier3', { width: 6.5, height: 2.5, depth: 8.5 }, scene)
  pagodaTier3.position.set(-14, 10.55, -20)
  pagodaTier3.material = glassTowerMat

  const pagodaRoof = MeshBuilder.CreateBox('pagodaRoof', { width: 10, height: 0.6, depth: 12 }, scene)
  pagodaRoof.position.set(-14, 12.1, -20)
  pagodaRoof.material = towerSteelMat

  // IMS Scoring Pylon Tower (at X = -14, Z = -5)
  const pylon = MeshBuilder.CreateBox('scoringPylon', { width: 1.8, height: 16, depth: 1.8 }, scene)
  pylon.position.set(-14, 8, -5)
  pylon.material = towerSteelMat

  // Pylon Digital Display Face
  const pylonDisplay = MeshBuilder.CreateBox('pylonDisplay', { width: 0.1, height: 14, depth: 1.6 }, scene)
  pylonDisplay.position.set(-13, 8, -5)
  pylonDisplay.material = goldMat

  // Start / Finish Overhead Gantry Arch
  const archPillarL = MeshBuilder.CreateBox('archPillarL', { width: 0.8, height: 8, depth: 0.8 }, scene)
  archPillarL.position.set(-halfW - 0.8, 4, -20)
  archPillarL.material = towerSteelMat

  const archPillarR = MeshBuilder.CreateBox('archPillarR', { width: 0.8, height: 8, depth: 0.8 }, scene)
  archPillarR.position.set(halfW + 0.8, 4, -20)
  archPillarR.material = towerSteelMat

  const archBeam = MeshBuilder.CreateBox('archBeam', { width: OVAL_WIDTH + 3, height: 0.8, depth: 0.8 }, scene)
  archBeam.position.set(0, 7.6, -20)
  archBeam.material = towerSteelMat

  const archBanner = MeshBuilder.CreateBox('archBanner', { width: OVAL_WIDTH, height: 1.6, depth: 0.2 }, scene)
  archBanner.position.set(0, 6.4, -20)
  archBanner.material = rimImpactMat

  // ==========================================
  // 6. INFIELD STUNT COURSE: TWISTS & 360 STUNT LOOP
  // ==========================================
  // Infield connecting chicane "Twist" section
  const twistWaypoints: [number, number][] = [
    [0, 15],     // Infield entry from Frontstretch
    [25, 40],    // Twist 1 (Right flick)
    [55, 30],    // Twist 2 (Left flick)
    [75, 55],    // Twist 3 (Right S-curve)
    [65, 80],    // Twist 4 (Apex)
  ]

  for (let t = 0; t < twistWaypoints.length - 1; t++) {
    const [tx1, tz1] = twistWaypoints[t]
    const [tx2, tz2] = twistWaypoints[t + 1]
    buildWalledSegment(`twistSeg_${t}`, tx1, tz1, tx2, tz2, 14)
  }

  // 360-Degree Elevated Stunt Loop in the Infield
  const loopCenter = new Vector3(60, 0, -35)
  const loopRadius = 24
  const loopHeight = 4.5
  const loopSteps = 16

  // Incline Climb Ramp to Loop (from y=0 to y=4.5m)
  const loopRampMesh = MeshBuilder.CreateBox('loopInclineRamp', { width: 14, height: 0.5, depth: 30 }, scene)
  loopRampMesh.position.set( loopCenter.x + loopRadius, loopHeight * 0.5, loopCenter.z + 15 )
  loopRampMesh.rotation.x = -Math.atan2(loopHeight, 30)
  loopRampMesh.material = roadMat

  obstacles.push({
    minX: loopCenter.x + loopRadius - 7,
    maxX: loopCenter.x + loopRadius + 7,
    minZ: loopCenter.z,
    maxZ: loopCenter.z + 30,
    height: loopHeight,
    isRamp: true,
    direction: '-Z',
  })

  // Elevated 360 Loop Ring Deck
  for (let s = 0; s < loopSteps; s++) {
    const a1 = (s / loopSteps) * Math.PI * 2
    const a2 = ((s + 1) / loopSteps) * Math.PI * 2

    const lx1 = loopCenter.x + Math.cos(a1) * loopRadius
    const lz1 = loopCenter.z + Math.sin(a1) * loopRadius
    const lx2 = loopCenter.x + Math.cos(a2) * loopRadius
    const lz2 = loopCenter.z + Math.sin(a2) * loopRadius

    const segDx = lx2 - lx1
    const segDz = lz2 - lz1
    const segLen = Math.hypot(segDx, segDz)
    const segAngle = Math.atan2(segDx, segDz)

    const loopSeg = MeshBuilder.CreateBox(`imsLoopSeg_${s}`, { width: 14, height: 0.45, depth: segLen + 0.5 }, scene)
    loopSeg.position.set((lx1 + lx2) / 2, loopHeight, (lz1 + lz2) / 2)
    loopSeg.rotation.y = segAngle
    loopSeg.material = roadMat

    const wallL = MeshBuilder.CreateBox(`imsLoopWL_${s}`, { width: 0.5, height: 2.2, depth: segLen + 0.5 }, scene)
    wallL.position.set(-7.25, 1.1, 0)
    wallL.parent = loopSeg
    wallL.material = loopGlowMat

    const wallR = MeshBuilder.CreateBox(`imsLoopWR_${s}`, { width: 0.5, height: 2.2, depth: segLen + 0.5 }, scene)
    wallR.position.set(7.25, 1.1, 0)
    wallR.parent = loopSeg
    wallR.material = rimImpactMat

    obstacles.push({
      minX: Math.min(lx1, lx2) - 7,
      maxX: Math.max(lx1, lx2) + 7,
      minZ: Math.min(lz1, lz2) - 7,
      maxZ: Math.max(lz1, lz2) + 7,
      height: loopHeight,
      isBridge: true,
    })

    if (s % 3 === 0) {
      const pillar = MeshBuilder.CreateCylinder(`imsPillar_${s}`, { diameter: 1.4, height: loopHeight }, scene)
      pillar.position.set((lx1 + lx2) / 2, loopHeight / 2, (lz1 + lz2) / 2)
      pillar.material = towerSteelMat
    }
  }

  // Central Loop Monolith & Portal Rings
  const spire = MeshBuilder.CreateCylinder('imsSpire', { diameterTop: 0.6, diameterBottom: 5.5, height: 22, tessellation: 8 }, scene)
  spire.position.set(loopCenter.x, 11, loopCenter.z)
  spire.material = loopGlowMat

  // ==========================================
  // 7. THRILLING JUMP RAMPS (SALTOS)
  // ==========================================
  const rampMat = new StandardMaterial('rampMat', scene)
  rampMat.diffuseColor = new Color3(1.0, 0.45, 0.05)
  rampMat.specularColor = new Color3(0.4, 0.4, 0.4)

  const rampMatSteel = new StandardMaterial('rampMatSteel', scene)
  rampMatSteel.diffuseColor = new Color3(0.15, 0.6, 1.0)

  function addJumpRamp(
    id: string,
    x: number,
    z: number,
    width: number,
    length: number,
    height: number,
    direction: '+Z' | '-Z' | '+X' | '-X',
    mat: StandardMaterial = rampMat
  ) {
    const rampMesh = MeshBuilder.CreateBox(`ramp_${id}`, { width, height: 0.45, depth: length }, scene)
    let rotX = 0
    let rotZ = 0

    if (direction === '+Z') rotX = -Math.atan2(height, length)
    else if (direction === '-Z') rotX = Math.atan2(height, length)
    else if (direction === '+X') rotZ = Math.atan2(height, length)
    else if (direction === '-X') rotZ = -Math.atan2(height, length)

    rampMesh.rotation.x = rotX
    rampMesh.rotation.z = rotZ
    rampMesh.position = new Vector3(x, height * 0.45, z)
    rampMesh.material = mat
    ramps.push(rampMesh)

    obstacles.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - length / 2 - 0.5,
      maxZ: z + length / 2 + 0.5,
      height,
      isRamp: true,
      direction,
    })
  }

  // Jump 1: Frontstretch Speed Launch Ramp (+Z direction)
  addJumpRamp('frontstretchJump', 0, 15, 9, 12, 2.5, '+Z', rampMat)

  // Jump 2: Backstretch Mega Launch Ramp (-Z direction)
  addJumpRamp('backstretchMegaJump', 120, 10, 10, 15, 3.6, '-Z', rampMatSteel)

  // Jump 3: Infield Twist Exit Kicker (+Y / +Z)
  addJumpRamp('infieldTwistKicker', 65, 80, 8, 10, 2.4, '+X', rampMat)

  // Jump 4: Loop Sky Drop Exit (Launches off 4.5m loop bridge to ground)
  addJumpRamp('loopSkyDrop', loopCenter.x - loopRadius, loopCenter.z, 8, 12, loopHeight, '+Z', rampMatSteel)

  // ==========================================
  // 8. WORLD PERIMETER SAFETY WALLS (CANNOT ESCAPE)
  // ==========================================
  const WORLD_WALL_H = 5.5
  const worldWalls = [
    { name: 'worldWallNorth', pos: new Vector3(0, WORLD_WALL_H / 2, ARENA_HALF), w: ARENA_HALF * 2, h: WORLD_WALL_H, d: 2.5 },
    { name: 'worldWallSouth', pos: new Vector3(0, WORLD_WALL_H / 2, -ARENA_HALF), w: ARENA_HALF * 2, h: WORLD_WALL_H, d: 2.5 },
    { name: 'worldWallEast', pos: new Vector3(ARENA_HALF, WORLD_WALL_H / 2, 0), w: 2.5, h: WORLD_WALL_H, d: ARENA_HALF * 2 },
    { name: 'worldWallWest', pos: new Vector3(-ARENA_HALF, WORLD_WALL_H / 2, 0), w: 2.5, h: WORLD_WALL_H, d: ARENA_HALF * 2 },
  ]

  for (const cfg of worldWalls) {
    const wallMesh = MeshBuilder.CreateBox(cfg.name, { width: cfg.w, height: cfg.h, depth: cfg.d }, scene)
    wallMesh.position = cfg.pos
    wallMesh.material = rimImpactMat

    obstacles.push({
      minX: cfg.pos.x - cfg.w / 2 - 0.5,
      maxX: cfg.pos.x + cfg.w / 2 + 0.5,
      minZ: cfg.pos.z - cfg.d / 2 - 0.5,
      maxZ: cfg.pos.z + cfg.d / 2 + 0.5,
      height: cfg.h,
      isRamp: false,
    })
  }

  // ==========================================
  // 9. SURROUNDING MOUNTAINS (MONTAÑAS)
  // ==========================================
  const mountainRockMat = new StandardMaterial('mountainRockMat', scene)
  mountainRockMat.diffuseColor = new Color3(0.24, 0.26, 0.3)
  mountainRockMat.specularColor = new Color3(0.08, 0.08, 0.08)

  const mountainSnowMat = new StandardMaterial('mountainSnowMat', scene)
  mountainSnowMat.diffuseColor = new Color3(0.92, 0.95, 0.98)
  mountainSnowMat.specularColor = new Color3(0.5, 0.5, 0.5)

  function createMountainRidge(name: string, posX: number, posZ: number, rotY: number, length: number) {
    const width = length
    const depth = 55
    const subdivisions = 20
    const ridge = MeshBuilder.CreateGround(name, { width, height: depth, subdivisions }, scene)
    ridge.position.set(posX, 0, posZ)
    ridge.rotation.y = rotY

    const positions = ridge.getVerticesData(VertexBuffer.PositionKind)
    if (positions) {
      for (let i = 0; i < positions.length / 3; i++) {
        const vx = positions[i * 3]
        const vz = positions[i * 3 + 2]
        const outerFactor = Math.max(0, (vz + depth / 2) / depth)
        const crag =
          Math.sin(vx * 0.06) * 8.5 +
          Math.cos(vx * 0.14 + 1.2) * 5.5 +
          Math.sin(vx * 0.3) * 2.8
        const height = Math.max(0, outerFactor * (40 + crag))
        positions[i * 3 + 1] = height
      }
      ridge.setVerticesData(VertexBuffer.PositionKind, positions)
      const normals: number[] = []
      VertexData.ComputeNormals(positions, ridge.getIndices()!, normals)
      ridge.setVerticesData(VertexBuffer.NormalKind, normals)
    }
    ridge.material = mountainRockMat
    ridge.receiveShadows = true
  }

  createMountainRidge('mountainNorth', 0, ARENA_HALF + 28, 0, 420)
  createMountainRidge('mountainSouth', 0, -ARENA_HALF - 28, Math.PI, 420)
  createMountainRidge('mountainEast', ARENA_HALF + 28, 0, Math.PI / 2, 420)
  createMountainRidge('mountainWest', -ARENA_HALF - 28, 0, -Math.PI / 2, 420)

  // Alpine Peaks along horizon
  const peaks = [
    { x: -140, z: 140, h: 58, rad: 40 },
    { x: 0, z: ARENA_HALF + 30, h: 54, rad: 38 },
    { x: 140, z: 140, h: 62, rad: 44 },
    { x: ARENA_HALF + 30, z: 0, h: 55, rad: 38 },
    { x: 140, z: -140, h: 64, rad: 46 },
    { x: 0, z: -ARENA_HALF - 30, h: 50, rad: 36 },
    { x: -140, z: -140, h: 60, rad: 42 },
    { x: -ARENA_HALF - 30, z: 0, h: 56, rad: 38 },
  ]

  peaks.forEach((peak, idx) => {
    const rockPeak = MeshBuilder.CreateCylinder(`peak_${idx}`, {
      diameterTop: 2.0,
      diameterBottom: peak.rad * 2,
      height: peak.h,
      tessellation: 8,
    }, scene)
    rockPeak.position.set(peak.x, peak.h / 2, peak.z)
    rockPeak.rotation.y = idx * 0.7
    rockPeak.material = mountainRockMat
    rockPeak.receiveShadows = true

    if (peak.h > 40) {
      const snowHeight = peak.h * 0.28
      const snowCap = MeshBuilder.CreateCylinder(`snow_${idx}`, {
        diameterTop: 0.8,
        diameterBottom: peak.rad * 0.6,
        height: snowHeight,
        tessellation: 8,
      }, scene)
      snowCap.position.set(peak.x, peak.h - snowHeight / 2, peak.z)
      snowCap.rotation.y = idx * 0.7
      snowCap.material = mountainSnowMat
    }
  })

  // ==========================================
  // 10. MOVABLE OBJECTS (CUERPOS DESPLAZABLES)
  // ==========================================
  movableManager.spawn([
    // Wooden Crates Pyramids (Infield Stunt Area)
    { id: 'crate_ims1', type: 'crate', x: 2, z: -40, scale: 1.15 },
    { id: 'crate_ims2', type: 'crate', x: -2, z: -40, scale: 1.15 },
    { id: 'crate_ims3', type: 'crate', x: 0, y: 1.35, z: -40, scale: 1.05 },

    { id: 'crate_b1', type: 'crate', x: 120, z: -25, scale: 1.15 },
    { id: 'crate_b2', type: 'crate', x: 122, z: -25, scale: 1.15 },
    { id: 'crate_b3', type: 'crate', x: 121, y: 1.35, z: -25, scale: 1.05 },

    // Barrels along South Short Chute and North Short Chute
    { id: 'barr_n1', type: 'barrel', x: 60, z: 125, scale: 1.05 },
    { id: 'barr_n2', type: 'barrel', x: 63, z: 125, scale: 1.05 },
    { id: 'barr_s1', type: 'barrel', x: 60, z: -125, scale: 1.05 },
    { id: 'barr_s2', type: 'barrel', x: 63, z: -125, scale: 1.05 },

    // Cones Slaloms on Frontstretch approach
    { id: 'cone_1', type: 'cone', x: -2, z: -70, scale: 1.0 },
    { id: 'cone_2', type: 'cone', x: 2, z: -60, scale: 1.0 },
    { id: 'cone_3', type: 'cone', x: -2, z: -50, scale: 1.0 },
    { id: 'cone_4', type: 'cone', x: 2, z: -40, scale: 1.0 },

    // Giant Bouncy Stunt Spheres in Infield
    { id: 'sphere_1', type: 'stuntSphere', x: 60, z: -10, scale: 1.6 },
    { id: 'sphere_2', type: 'stuntSphere', x: 45, z: 10, scale: 1.6 },
  ])

  return { ground, ramps, obstacles, wallSegments, movableManager }
}
