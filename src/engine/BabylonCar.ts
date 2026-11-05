import {
  Scene,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  Mesh,
  SpotLight,
  PointLight,
  TransformNode,
} from '@babylonjs/core'
import type { VehiclePhysics } from './VehiclePhysics'

export class BabylonCar {
  public root: TransformNode
  public bodyMesh: Mesh
  public frontLeftPivot: TransformNode
  public frontRightPivot: TransformNode
  public wheelFL: Mesh
  public wheelFR: Mesh
  public wheelRL: Mesh
  public wheelRR: Mesh
  public cockpitWheel?: Mesh

  // Lights & Materials
  public headLightL: SpotLight
  public headLightR: SpotLight
  public underglowLight?: PointLight
  public tailLightMat: StandardMaterial
  public headLightMat: StandardMaterial
  public exhaustGlowMat: StandardMaterial
  public antennaTip?: Mesh

  private scene: Scene
  private wheelRotation: number = 0
  private antennaBaseNode?: TransformNode

  constructor(scene: Scene) {
    this.scene = scene
    this.root = new TransformNode('carRoot', scene)

    // ==========================================
    // 1. HIGH-GRADE MATERIALS
    // ==========================================
    // Car Body Metallic Blue
    const bodyMat = new StandardMaterial('carBodyMat', scene)
    bodyMat.diffuseColor = new Color3(0.06, 0.42, 0.95) // electric metallic blue
    bodyMat.specularColor = new Color3(0.9, 0.95, 1.0)
    bodyMat.specularPower = 48

    // Carbon Fiber / Matte Trim
    const carbonMat = new StandardMaterial('carbonMat', scene)
    carbonMat.diffuseColor = new Color3(0.08, 0.09, 0.1)
    carbonMat.specularColor = new Color3(0.2, 0.2, 0.2)
    carbonMat.specularPower = 16

    // Racing Stripes (Vibrant White Decal)
    const stripeMat = new StandardMaterial('stripeMat', scene)
    stripeMat.diffuseColor = new Color3(0.96, 0.96, 0.98)
    stripeMat.specularColor = new Color3(0.8, 0.8, 0.8)

    // Tinted Cockpit Glass
    const cabinMat = new StandardMaterial('carCabinMat', scene)
    cabinMat.diffuseColor = new Color3(0.05, 0.08, 0.12)
    cabinMat.specularColor = new Color3(1.0, 1.0, 1.0)
    cabinMat.specularPower = 64
    cabinMat.alpha = 0.42

    // Wheels: Deep Rubber & Alloy Rims
    const wheelRubberMat = new StandardMaterial('wheelMat', scene)
    wheelRubberMat.diffuseColor = new Color3(0.1, 0.1, 0.1)
    wheelRubberMat.specularColor = new Color3(0.05, 0.05, 0.05)

    const rimAlloyMat = new StandardMaterial('rimAlloyMat', scene)
    rimAlloyMat.diffuseColor = new Color3(0.85, 0.88, 0.92) // brushed alloy
    rimAlloyMat.specularColor = new Color3(0.9, 0.9, 0.95)
    rimAlloyMat.specularPower = 32

    // Brake Disc & Caliper
    const brakeDiscMat = new StandardMaterial('brakeDiscMat', scene)
    brakeDiscMat.diffuseColor = new Color3(0.5, 0.52, 0.55) // steel rotor
    brakeDiscMat.specularColor = new Color3(0.7, 0.7, 0.7)

    const caliperMat = new StandardMaterial('caliperMat', scene)
    caliperMat.diffuseColor = new Color3(0.95, 0.1, 0.05) // racing red Brembo
    caliperMat.emissiveColor = new Color3(0.2, 0.02, 0.01)

    // Headlights & Taillights
    this.headLightMat = new StandardMaterial('headLightMat', scene)
    this.headLightMat.diffuseColor = new Color3(1, 1, 0.95)
    this.headLightMat.emissiveColor = new Color3(1, 1, 0.9)

    this.tailLightMat = new StandardMaterial('tailLightMat', scene)
    this.tailLightMat.diffuseColor = new Color3(0.85, 0.1, 0.1)
    this.tailLightMat.emissiveColor = new Color3(0.6, 0.05, 0.05)

    // Exhaust Pipes & Nitro Glow
    const chromeMat = new StandardMaterial('chromeMat', scene)
    chromeMat.diffuseColor = new Color3(0.8, 0.82, 0.85)
    chromeMat.specularColor = new Color3(1, 1, 1)

    this.exhaustGlowMat = new StandardMaterial('exhaustGlowMat', scene)
    this.exhaustGlowMat.diffuseColor = new Color3(0.2, 0.6, 1.0)
    this.exhaustGlowMat.emissiveColor = new Color3(0.0, 0.0, 0.0)

    // ==========================================
    // 2. MAIN CHASSIS & SCULPTED BODYWORK
    // ==========================================
    this.bodyMesh = MeshBuilder.CreateBox('carBody', { width: 1.62, height: 0.52, depth: 3.4 }, scene)
    this.bodyMesh.position.y = 0.54
    this.bodyMesh.parent = this.root
    this.bodyMesh.material = bodyMat

    // Front Nose Wedge / Hood Slope
    const hoodScoop = MeshBuilder.CreateBox('hoodSlope', { width: 1.54, height: 0.18, depth: 1.4 }, scene)
    hoodScoop.position = new Vector3(0, 0.24, 0.95)
    hoodScoop.rotation.x = 0.08
    hoodScoop.parent = this.bodyMesh
    hoodScoop.material = bodyMat

    // Dual Hood Heat Extractor Vents
    const ventL = MeshBuilder.CreateBox('ventL', { width: 0.28, height: 0.04, depth: 0.55 }, scene)
    ventL.position = new Vector3(-0.4, 0.34, 0.95)
    ventL.parent = this.bodyMesh
    ventL.material = carbonMat

    const ventR = MeshBuilder.CreateBox('ventR', { width: 0.28, height: 0.04, depth: 0.55 }, scene)
    ventR.position = new Vector3(0.4, 0.34, 0.95)
    ventR.parent = this.bodyMesh
    ventR.material = carbonMat

    // Front Carbon Splitter / Lip
    const splitter = MeshBuilder.CreateBox('frontSplitter', { width: 1.76, height: 0.06, depth: 0.5 }, scene)
    splitter.position = new Vector3(0, -0.24, 1.75)
    splitter.parent = this.bodyMesh
    splitter.material = carbonMat

    // Splitter Endplate Winglets (Canards)
    const canardL = MeshBuilder.CreateBox('canardL', { width: 0.05, height: 0.16, depth: 0.3 }, scene)
    canardL.position = new Vector3(-0.86, -0.16, 1.72)
    canardL.parent = this.bodyMesh
    canardL.material = carbonMat

    const canardR = MeshBuilder.CreateBox('canardR', { width: 0.05, height: 0.16, depth: 0.3 }, scene)
    canardR.position = new Vector3(0.86, -0.16, 1.72)
    canardR.parent = this.bodyMesh
    canardR.material = carbonMat

    // Aerodynamic Side Skirts
    const sideSkirtL = MeshBuilder.CreateBox('sideSkirtL', { width: 0.12, height: 0.06, depth: 2.1 }, scene)
    sideSkirtL.position = new Vector3(-0.85, -0.22, 0)
    sideSkirtL.parent = this.bodyMesh
    sideSkirtL.material = carbonMat

    const sideSkirtR = MeshBuilder.CreateBox('sideSkirtR', { width: 0.12, height: 0.06, depth: 2.1 }, scene)
    sideSkirtR.position = new Vector3(0.85, -0.22, 0)
    sideSkirtR.parent = this.bodyMesh
    sideSkirtR.material = carbonMat

    // Front Grille & Intake
    const grille = MeshBuilder.CreateBox('carGrille', { width: 0.95, height: 0.2, depth: 0.08 }, scene)
    grille.position = new Vector3(0, -0.08, 1.71)
    grille.parent = this.bodyMesh
    grille.material = carbonMat

    // Twin Racing Stripes along the car
    const stripeHoodL = MeshBuilder.CreateBox('stripeHL', { width: 0.12, height: 0.02, depth: 1.5 }, scene)
    stripeHoodL.position = new Vector3(-0.16, 0.32, 0.95)
    stripeHoodL.rotation.x = 0.08
    stripeHoodL.parent = this.bodyMesh
    stripeHoodL.material = stripeMat

    const stripeHoodR = MeshBuilder.CreateBox('stripeHR', { width: 0.12, height: 0.02, depth: 1.5 }, scene)
    stripeHoodR.position = new Vector3(0.16, 0.32, 0.95)
    stripeHoodR.rotation.x = 0.08
    stripeHoodR.parent = this.bodyMesh
    stripeHoodR.material = stripeMat

    // ==========================================
    // 3. CABIN, ROLL CAGE & INTERIOR
    // ==========================================
    const cabin = MeshBuilder.CreateBox('carCabin', { width: 1.34, height: 0.46, depth: 1.65 }, scene)
    cabin.position = new Vector3(0, 0.45, -0.2)
    cabin.parent = this.bodyMesh
    cabin.material = cabinMat

    // Roof Racing Stripes
    const stripeRoofL = MeshBuilder.CreateBox('stripeRL', { width: 0.12, height: 0.02, depth: 1.6 }, scene)
    stripeRoofL.position = new Vector3(-0.16, 0.24, 0)
    stripeRoofL.parent = cabin
    stripeRoofL.material = stripeMat

    const stripeRoofR = MeshBuilder.CreateBox('stripeRR', { width: 0.12, height: 0.02, depth: 1.6 }, scene)
    stripeRoofR.position = new Vector3(0.16, 0.24, 0)
    stripeRoofR.parent = cabin
    stripeRoofR.material = stripeMat

    // Tubular Steel Roll Cage
    const cageMat = new StandardMaterial('cageMat', scene)
    cageMat.diffuseColor = new Color3(0.85, 0.85, 0.1) // competition yellow roll bar
    cageMat.specularColor = new Color3(0.6, 0.6, 0.6)

    const mainHoop = MeshBuilder.CreateBox('rollHoopMain', { width: 1.15, height: 0.05, depth: 0.05 }, scene)
    mainHoop.position = new Vector3(0, 0.4, -0.55)
    mainHoop.parent = this.bodyMesh
    mainHoop.material = cageMat

    const diagBrace = MeshBuilder.CreateBox('rollDiag', { width: 0.05, height: 0.48, depth: 0.05 }, scene)
    diagBrace.position = new Vector3(0, 0.2, -0.55)
    diagBrace.rotation.z = Math.PI / 4
    diagBrace.parent = this.bodyMesh
    diagBrace.material = cageMat

    // Racing Bucket Seats inside
    const seatMat = new StandardMaterial('seatMat', scene)
    seatMat.diffuseColor = new Color3(0.1, 0.1, 0.12)

    const seatL = MeshBuilder.CreateBox('seatL', { width: 0.42, height: 0.38, depth: 0.45 }, scene)
    seatL.position = new Vector3(-0.35, 0.15, -0.25)
    seatL.parent = this.bodyMesh
    seatL.material = seatMat

    const seatR = MeshBuilder.CreateBox('seatR', { width: 0.42, height: 0.38, depth: 0.45 }, scene)
    seatR.position = new Vector3(0.35, 0.15, -0.25)
    seatR.parent = this.bodyMesh
    seatR.material = seatMat

    // Side Mirrors (Aerodynamic pods)
    const mirrorMat = new StandardMaterial('mirrorMat', scene)
    mirrorMat.diffuseColor = new Color3(0.9, 0.95, 1.0)
    mirrorMat.specularColor = new Color3(1, 1, 1)

    const mirrorPodL = MeshBuilder.CreateBox('mirrorL', { width: 0.2, height: 0.1, depth: 0.15 }, scene)
    mirrorPodL.position = new Vector3(-0.78, 0.35, 0.35)
    mirrorPodL.parent = this.bodyMesh
    mirrorPodL.material = bodyMat

    const mirrorFaceL = MeshBuilder.CreateBox('mirrorFaceL', { width: 0.16, height: 0.08, depth: 0.02 }, scene)
    mirrorFaceL.position = new Vector3(-0.78, 0.35, 0.27)
    mirrorFaceL.parent = this.bodyMesh
    mirrorFaceL.material = mirrorMat

    const mirrorPodR = MeshBuilder.CreateBox('mirrorR', { width: 0.2, height: 0.1, depth: 0.15 }, scene)
    mirrorPodR.position = new Vector3(0.78, 0.35, 0.35)
    mirrorPodR.parent = this.bodyMesh
    mirrorPodR.material = bodyMat

    const mirrorFaceR = MeshBuilder.CreateBox('mirrorFaceR', { width: 0.16, height: 0.08, depth: 0.02 }, scene)
    mirrorFaceR.position = new Vector3(0.78, 0.35, 0.27)
    mirrorFaceR.parent = this.bodyMesh
    mirrorFaceR.material = mirrorMat

    // Cockpit Dashboard & Steering Wheel
    const dashMat = new StandardMaterial('carDashMat', scene)
    dashMat.diffuseColor = new Color3(0.06, 0.07, 0.09)
    const dashboard = MeshBuilder.CreateBox('cockpitDash', { width: 1.26, height: 0.22, depth: 0.38 }, scene)
    dashboard.position = new Vector3(0, 0.32, 0.52)
    dashboard.parent = this.bodyMesh
    dashboard.material = dashMat

    const steerRimMat = new StandardMaterial('steerRimMat', scene)
    steerRimMat.diffuseColor = new Color3(0.12, 0.12, 0.15)
    this.cockpitWheel = MeshBuilder.CreateTorus(
      'cockpitWheel',
      { diameter: 0.34, thickness: 0.045, tessellation: 28 },
      scene
    )
    this.cockpitWheel.position = new Vector3(0, 0.44, 0.36)
    this.cockpitWheel.rotation.x = Math.PI / 6
    this.cockpitWheel.parent = this.bodyMesh
    this.cockpitWheel.material = steerRimMat

    const steerMarker = MeshBuilder.CreateBox('steerMarker', { width: 0.04, height: 0.04, depth: 0.04 }, scene)
    steerMarker.position = new Vector3(0, 0.16, 0)
    steerMarker.parent = this.cockpitWheel
    const markerMat = new StandardMaterial('markerMat', scene)
    markerMat.diffuseColor = new Color3(0.0, 0.85, 1.0)
    markerMat.emissiveColor = new Color3(0.0, 0.6, 0.9)
    steerMarker.material = markerMat

    // ==========================================
    // 4. GT3 REAR SPOILER & MULTI-FIN DIFFUSER
    // ==========================================
    // Dual element high-downforce GT wing
    const spoilerWing = MeshBuilder.CreateBox('spoilerWing', { width: 1.72, height: 0.05, depth: 0.38 }, scene)
    spoilerWing.position = new Vector3(0, 0.62, -1.52)
    spoilerWing.parent = this.bodyMesh
    spoilerWing.material = carbonMat

    // Aerodynamic Wing Endplates
    const endplateL = MeshBuilder.CreateBox('endplateL', { width: 0.04, height: 0.22, depth: 0.44 }, scene)
    endplateL.position = new Vector3(-0.87, 0.62, -1.52)
    endplateL.parent = this.bodyMesh
    endplateL.material = bodyMat

    const endplateR = MeshBuilder.CreateBox('endplateR', { width: 0.04, height: 0.22, depth: 0.44 }, scene)
    endplateR.position = new Vector3(0.87, 0.62, -1.52)
    endplateR.parent = this.bodyMesh
    endplateR.material = bodyMat

    // Wing Upright Struts
    const spoilerStandL = MeshBuilder.CreateBox('standL', { width: 0.05, height: 0.36, depth: 0.18 }, scene)
    spoilerStandL.position = new Vector3(-0.55, 0.44, -1.52)
    spoilerStandL.parent = this.bodyMesh
    spoilerStandL.material = carbonMat

    const spoilerStandR = MeshBuilder.CreateBox('standR', { width: 0.05, height: 0.36, depth: 0.18 }, scene)
    spoilerStandR.position = new Vector3(0.55, 0.44, -1.52)
    spoilerStandR.parent = this.bodyMesh
    spoilerStandR.material = carbonMat

    // Rear Multi-Fin Diffuser
    const diffuserBase = MeshBuilder.CreateBox('diffuserBase', { width: 1.58, height: 0.12, depth: 0.4 }, scene)
    diffuserBase.position = new Vector3(0, -0.22, -1.65)
    diffuserBase.parent = this.bodyMesh
    diffuserBase.material = carbonMat

    // 4 Diffuser Airflow Fins
    ;[-0.5, -0.18, 0.18, 0.5].forEach((finX, idx) => {
      const fin = MeshBuilder.CreateBox(`diffuserFin_${idx}`, { width: 0.04, height: 0.18, depth: 0.38 }, scene)
      fin.position = new Vector3(finX, -0.22, -1.65)
      fin.parent = this.bodyMesh
      fin.material = carbonMat
    })

    // Dual Polished Chrome Exhaust Pipes
    const exhaustL = MeshBuilder.CreateCylinder('exhaustL', { diameter: 0.14, height: 0.28, tessellation: 16 }, scene)
    exhaustL.position = new Vector3(-0.35, -0.15, -1.72)
    exhaustL.rotation.x = Math.PI / 2
    exhaustL.parent = this.bodyMesh
    exhaustL.material = chromeMat

    const exhaustR = MeshBuilder.CreateCylinder('exhaustR', { diameter: 0.14, height: 0.28, tessellation: 16 }, scene)
    exhaustR.position = new Vector3(0.35, -0.15, -1.72)
    exhaustR.rotation.x = Math.PI / 2
    exhaustR.parent = this.bodyMesh
    exhaustR.material = chromeMat

    // Inner Exhaust Flame/Glow tips (illuminate on nitro boost)
    const exhaustFlameL = MeshBuilder.CreateCylinder('flameL', { diameter: 0.11, height: 0.06 }, scene)
    exhaustFlameL.position = new Vector3(-0.35, -0.15, -1.82)
    exhaustFlameL.rotation.x = Math.PI / 2
    exhaustFlameL.parent = this.bodyMesh
    exhaustFlameL.material = this.exhaustGlowMat

    const exhaustFlameR = MeshBuilder.CreateCylinder('flameR', { diameter: 0.11, height: 0.06 }, scene)
    exhaustFlameR.position = new Vector3(0.35, -0.15, -1.82)
    exhaustFlameR.rotation.x = Math.PI / 2
    exhaustFlameR.parent = this.bodyMesh
    exhaustFlameR.material = this.exhaustGlowMat

    // ==========================================
    // 5. RC ANTENNA WITH DYNAMIC TIP
    // ==========================================
    this.antennaBaseNode = new TransformNode('antennaBase', scene)
    this.antennaBaseNode.position = new Vector3(0.42, 0.72, -0.9)
    this.antennaBaseNode.parent = this.bodyMesh

    const antennaMast = MeshBuilder.CreateCylinder('antennaMast', { diameter: 0.02, height: 0.95 }, scene)
    antennaMast.position.y = 0.47
    antennaMast.parent = this.antennaBaseNode
    antennaMast.material = carbonMat

    const antennaTipMat = new StandardMaterial('antennaTipMat', scene)
    antennaTipMat.diffuseColor = new Color3(1.0, 0.45, 0.0) // high-vis orange RC pennant
    antennaTipMat.emissiveColor = new Color3(0.5, 0.2, 0.0)

    this.antennaTip = MeshBuilder.CreateSphere('antennaTip', { diameter: 0.12, segments: 10 }, scene)
    this.antennaTip.position.y = 0.95
    this.antennaTip.parent = this.antennaBaseNode
    this.antennaTip.material = antennaTipMat

    // ==========================================
    // 6. LIGHTING: HEADLIGHTS, TAILLIGHTS, NEON
    // ==========================================
    // Aggressive Angular LED Headlights
    const headL = MeshBuilder.CreateBox('headL', { width: 0.32, height: 0.12, depth: 0.08 }, scene)
    headL.position = new Vector3(-0.56, 0.06, 1.71)
    headL.parent = this.bodyMesh
    headL.material = this.headLightMat

    const headR = MeshBuilder.CreateBox('headR', { width: 0.32, height: 0.12, depth: 0.08 }, scene)
    headR.position = new Vector3(0.56, 0.06, 1.71)
    headR.parent = this.bodyMesh
    headR.material = this.headLightMat

    // Spotlights for headlights
    this.headLightL = new SpotLight('carSpotL', new Vector3(-0.55, 0.6, 1.7), new Vector3(0, -0.18, 1), Math.PI / 3, 24, scene)
    this.headLightL.diffuse = new Color3(1, 1, 0.95)
    this.headLightL.intensity = 2.0
    this.headLightL.parent = this.root

    this.headLightR = new SpotLight('carSpotR', new Vector3(0.55, 0.6, 1.7), new Vector3(0, -0.18, 1), Math.PI / 3, 24, scene)
    this.headLightR.diffuse = new Color3(1, 1, 0.95)
    this.headLightR.intensity = 2.0
    this.headLightR.parent = this.root

    // Taillights
    const tailL = MeshBuilder.CreateBox('tailL', { width: 0.42, height: 0.11, depth: 0.06 }, scene)
    tailL.position = new Vector3(-0.54, 0.06, -1.71)
    tailL.parent = this.bodyMesh
    tailL.material = this.tailLightMat

    const tailR = MeshBuilder.CreateBox('tailR', { width: 0.42, height: 0.11, depth: 0.06 }, scene)
    tailR.position = new Vector3(0.54, 0.06, -1.71)
    tailR.parent = this.bodyMesh
    tailR.material = this.tailLightMat

    // Subtle Neon Underglow Light
    this.underglowLight = new PointLight('carUnderglow', new Vector3(0, 0.18, 0), scene)
    this.underglowLight.diffuse = new Color3(0.1, 0.7, 1.0)
    this.underglowLight.intensity = 0.8
    this.underglowLight.range = 3.5
    this.underglowLight.parent = this.root

    // ==========================================
    // 7. HIGH-DETAIL WHEELS, RIMS & BRAKES
    // ==========================================
    const wheelRadius = 0.38
    const wheelWidth = 0.32

    function createDetailedWheel(name: string, pScene: Scene): Mesh {
      // Main Rubber Tire
      const tire = MeshBuilder.CreateCylinder(`${name}_tire`, {
        diameter: wheelRadius * 2,
        height: wheelWidth,
        tessellation: 24,
      }, pScene)
      tire.rotation.z = Math.PI / 2
      tire.material = wheelRubberMat

      // Alloy Rim Barrel
      const rimBarrel = MeshBuilder.CreateCylinder(`${name}_rim`, {
        diameter: wheelRadius * 1.55,
        height: wheelWidth + 0.01,
        tessellation: 20,
      }, pScene)
      rimBarrel.parent = tire
      rimBarrel.material = rimAlloyMat

      // 5-Spoke Star Mags
      for (let s = 0; s < 5; s++) {
        const spoke = MeshBuilder.CreateBox(`${name}_spoke_${s}`, {
          width: 0.06,
          height: wheelWidth + 0.02,
          depth: wheelRadius * 1.45,
        }, pScene)
        spoke.rotation.y = (s * Math.PI) / 5
        spoke.parent = tire
        spoke.material = rimAlloyMat
      }

      // Center Hub Cap
      const hub = MeshBuilder.CreateCylinder(`${name}_hub`, {
        diameter: 0.22,
        height: wheelWidth + 0.03,
        tessellation: 12,
      }, pScene)
      hub.parent = tire
      hub.material = rimAlloyMat

      return tire
    }

    // Helper to create brake rotor & red caliper
    function createBrakeAssembly(name: string, parentNode: TransformNode, isLeft: boolean, pScene: Scene) {
      const disc = MeshBuilder.CreateCylinder(`${name}_disc`, {
        diameter: wheelRadius * 1.35,
        height: 0.04,
        tessellation: 18,
      }, pScene)
      disc.rotation.z = Math.PI / 2
      disc.position.x = isLeft ? 0.08 : -0.08
      disc.parent = parentNode
      disc.material = brakeDiscMat

      const caliper = MeshBuilder.CreateBox(`${name}_caliper`, {
        width: 0.08,
        height: 0.16,
        depth: 0.24,
      }, pScene)
      caliper.position.set(isLeft ? 0.08 : -0.08, 0.15, 0.05)
      caliper.parent = parentNode
      caliper.material = caliperMat
    }

    const halfTrackW = 0.88
    const frontAxleZ = 1.05
    const rearAxleZ = -1.05
    const wheelY = 0.38

    // Front Left Pivot & Wheel
    this.frontLeftPivot = new TransformNode('flPivot', scene)
    this.frontLeftPivot.position = new Vector3(-halfTrackW, wheelY, frontAxleZ)
    this.frontLeftPivot.parent = this.root
    createBrakeAssembly('flBrake', this.frontLeftPivot, true, scene)
    this.wheelFL = createDetailedWheel('wheelFL', scene)
    this.wheelFL.parent = this.frontLeftPivot

    // Front Right Pivot & Wheel
    this.frontRightPivot = new TransformNode('frPivot', scene)
    this.frontRightPivot.position = new Vector3(halfTrackW, wheelY, frontAxleZ)
    this.frontRightPivot.parent = this.root
    createBrakeAssembly('frBrake', this.frontRightPivot, false, scene)
    this.wheelFR = createDetailedWheel('wheelFR', scene)
    this.wheelFR.parent = this.frontRightPivot

    // Rear Left Upright & Wheel
    const rearLeftPivot = new TransformNode('rlPivot', scene)
    rearLeftPivot.position = new Vector3(-halfTrackW, wheelY, rearAxleZ)
    rearLeftPivot.parent = this.root
    createBrakeAssembly('rlBrake', rearLeftPivot, true, scene)
    this.wheelRL = createDetailedWheel('wheelRL', scene)
    this.wheelRL.parent = rearLeftPivot

    // Rear Right Upright & Wheel
    const rearRightPivot = new TransformNode('rrPivot', scene)
    rearRightPivot.position = new Vector3(halfTrackW, wheelY, rearAxleZ)
    rearRightPivot.parent = this.root
    createBrakeAssembly('rrBrake', rearRightPivot, false, scene)
    this.wheelRR = createDetailedWheel('wheelRR', scene)
    this.wheelRR.parent = rearRightPivot
  }

  public update(physics: VehiclePhysics, dt: number, headlightsOn: boolean = true, isBoosting: boolean = false) {
    // Spatial positioning
    this.root.position.x = physics.x
    this.root.position.y = physics.y
    this.root.position.z = physics.z

    // Orientation (Heading, Pitch, Roll)
    this.root.rotation.y = physics.heading
    this.root.rotation.x = physics.pitch
    this.root.rotation.z = physics.roll

    // Front wheels steering pivot
    this.frontLeftPivot.rotation.y = physics.steerAngle
    this.frontRightPivot.rotation.y = physics.steerAngle

    // Cockpit steering wheel rotation
    if (this.cockpitWheel) {
      this.cockpitWheel.rotation.z = -physics.steerAngle * 2.2
    }

    // Dynamic RC Antenna Sway (flexes backwards on acceleration, sideways on cornering)
    if (this.antennaBaseNode) {
      const accelSway = Math.min(0.35, Math.max(-0.25, physics.speed * 0.015))
      const turnSway = -physics.steerAngle * 0.3
      this.antennaBaseNode.rotation.x = -accelSway
      this.antennaBaseNode.rotation.z = turnSway
    }

    // Spin wheels according to longitudinal speed
    const wheelCircumference = 2 * Math.PI * 0.38
    const angleDelta = (physics.speed * dt) / wheelCircumference * (2 * Math.PI)
    this.wheelRotation += angleDelta

    this.wheelFL.rotation.x = this.wheelRotation
    this.wheelFR.rotation.x = this.wheelRotation
    this.wheelRL.rotation.x = this.wheelRotation
    this.wheelRR.rotation.x = this.wheelRotation

    // Brake lights reaction (when slowing down in reverse or braking)
    const isBraking = physics.speed > 1 && physics.gear === 'R'
    if (isBraking) {
      this.tailLightMat.emissiveColor = new Color3(1.0, 0.12, 0.12)
    } else {
      this.tailLightMat.emissiveColor = new Color3(0.55, 0.05, 0.05)
    }

    // Nitro Boost Exhaust Flame Glow
    if (isBoosting) {
      this.exhaustGlowMat.emissiveColor = new Color3(0.1, 0.7, 1.0)
    } else {
      this.exhaustGlowMat.emissiveColor = new Color3(0.0, 0.0, 0.0)
    }

    // Headlights toggle
    this.headLightL.setEnabled(headlightsOn)
    this.headLightR.setEnabled(headlightsOn)
    this.headLightMat.emissiveColor = headlightsOn ? new Color3(1, 1, 0.95) : new Color3(0.2, 0.2, 0.2)
  }
}
