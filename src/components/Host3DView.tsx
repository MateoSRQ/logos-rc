import React, { useEffect, useRef, useState } from 'react'
import {
  Engine,
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  FollowCamera,
  UniversalCamera,
  ArcRotateCamera,
} from '@babylonjs/core'
import QRCode from 'qrcode'
import {
  Wifi,
  WifiOff,
  Gauge,
  Zap,
  Volume2,
  VolumeX,
  Camera as CameraIcon,
  RotateCcw,
  QrCode as QrIcon,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Sliders,
} from 'lucide-react'
import { VehiclePhysics } from '../engine/VehiclePhysics'
import { BabylonCar } from '../engine/BabylonCar'
import { buildTrack } from '../engine/TrackBuilder'
import { MovableObjectsManager } from '../engine/MovableObjects'
import { SoundEffects } from '../engine/SoundEffects'
import type { CameraViewMode, ControlPacket, TelemetryPacket } from '../net/protocol'

interface Host3DViewProps {
  initialRoom?: string
}

export const Host3DView: React.FC<Host3DViewProps> = ({ initialRoom }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // State for HUD
  const [roomCode] = useState(() => {
    if (initialRoom) return initialRoom
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || `RC-${Math.floor(1000 + Math.random() * 9000)}`
  })

  const [controllerConnected, setControllerConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<string>('')
  const [latency, setLatency] = useState<number>(0)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [showQrModal, setShowQrModal] = useState<boolean>(true)
  const [copied, setCopied] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [currentCameraMode, setCurrentCameraMode] = useState<CameraViewMode>('topdown')
  const [speedKmh, setSpeedKmh] = useState<number>(0)
  const [rpm, setRpm] = useState<number>(800)
  const [gear, setGear] = useState<'P' | 'D' | 'R'>('P')
  const [nitro, setNitro] = useState<number>(100)
  const [steerDisplay, setSteerDisplay] = useState<number>(0)
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(true)

  // Engine refs
  const physicsRef = useRef<VehiclePhysics>(new VehiclePhysics())
  const soundRef = useRef<SoundEffects>(new SoundEffects())
  const movableManagerRef = useRef<MovableObjectsManager | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const lastControlPacketRef = useRef<ControlPacket | null>(null)

  // Controller URL for QR Code
  const controllerUrl = `${window.location.protocol}//${window.location.hostname}${
    window.location.port ? `:${window.location.port}` : ''
  }/controller?room=${roomCode}`

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(controllerUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err))
  }, [controllerUrl])

  // WebSocket Connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`

    let isMounted = true
    let pingInterval: any = null

    function connectWs() {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[Host] Connected to WebSocket Relay')
          ws.send(
            JSON.stringify({
              type: 'register',
              role: 'host',
              room: roomCode,
            })
          )

          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
            }
          }, 2000)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'peer_status') {
              if (data.role === 'controller') {
                setControllerConnected(Boolean(data.connected))
                if (data.deviceInfo) setDeviceInfo(data.deviceInfo)
                if (data.connected) {
                  // Auto minimize QR modal when connected
                  setShowQrModal(false)
                }
              }
            } else if (data.type === 'control') {
              lastControlPacketRef.current = data as ControlPacket
              if (typeof data.headlights === 'boolean') {
                setHeadlightsOn(data.headlights)
              }
              if (data.resetCar) {
                physicsRef.current.reset(0, 0, 0)
                movableManagerRef.current?.resetAll()
              }
            } else if (data.type === 'pong') {
              setLatency(Math.max(1, Date.now() - (data.timestamp || Date.now())))
            }
          } catch (err) {
            console.error('Failed to parse WS message:', err)
          }
        }

        ws.onclose = () => {
          console.log('[Host] WebSocket connection closed, reconnecting...')
          if (isMounted) {
            setTimeout(connectWs, 2000)
          }
        }

        ws.onerror = (err) => {
          console.warn('[Host] WebSocket error:', err)
        }
      } catch (err) {
        console.error('[Host] WebSocket connection failed:', err)
      }
    }

    connectWs()

    return () => {
      isMounted = false
      clearInterval(pingInterval)
      if (wsRef.current) wsRef.current.close()
    }
  }, [roomCode])

  // 3D Babylon.js Scene Setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0.04, 0.06, 0.1, 1.0)
    scene.ambientColor = new Color3(0.2, 0.2, 0.25)

    // Lighting
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene)
    hemiLight.intensity = 0.65
    hemiLight.groundColor = new Color3(0.1, 0.12, 0.15)

    const dirLight = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), scene)
    dirLight.position = new Vector3(25, 45, 25)
    dirLight.intensity = 1.2

    // Shadow Generator
    const shadowGen = new ShadowGenerator(1024, dirLight)
    shadowGen.useBlurExponentialShadowMap = true
    shadowGen.blurKernel = 16

    // Track Builder & Movable Bodies
    const track = buildTrack(scene)
    physicsRef.current.setObstacles(track.obstacles)
    physicsRef.current.setWalls(track.wallSegments)
    movableManagerRef.current = track.movableManager

    // Babylon RC Car
    const car = new BabylonCar(scene)
    shadowGen.addShadowCaster(car.bodyMesh)

    // Cameras
    // 1. Follow / Chase Camera
    const chaseCam = new FollowCamera('chaseCam', new Vector3(0, 5, -10), scene)
    chaseCam.radius = 8.0
    chaseCam.heightOffset = 3.4
    chaseCam.rotationOffset = 180
    chaseCam.cameraAcceleration = 0.08
    chaseCam.maxCameraSpeed = 28
    chaseCam.lockedTarget = car.bodyMesh

    // 2. Cockpit / Hood Camera (Driver perspective showing cockpit, steering wheel and front hood)
    const cockpitCam = new UniversalCamera('cockpitCam', new Vector3(0, 0.98, 0.18), scene)
    cockpitCam.parent = car.root
    cockpitCam.rotation.x = 0.06 // slight tilt down to view dash, wheel and front hood
    cockpitCam.minZ = 0.05
    cockpitCam.fov = 1.15

    // 3. Top Down Aerial Camera (Arcade bird's-eye view)
    const topDownCam = new UniversalCamera('topDownCam', new Vector3(0, 50, -10), scene)
    topDownCam.setTarget(new Vector3(0, 0, 0))

    // 4. Orbit Camera
    const orbitCam = new ArcRotateCamera('orbitCam', -Math.PI / 2, Math.PI / 3, 12, car.bodyMesh.position, scene)
    orbitCam.lowerRadiusLimit = 4
    orbitCam.upperRadiusLimit = 25

    scene.activeCamera = topDownCam

    // Sound engine init on user interaction
    const handleFirstGesture = () => {
      soundRef.current.init()
      window.removeEventListener('keydown', handleFirstGesture)
      window.removeEventListener('click', handleFirstGesture)
    }
    window.addEventListener('keydown', handleFirstGesture)
    window.addEventListener('click', handleFirstGesture)

    // Local Keyboard inputs fallback
    const keysPressed: Record<string, boolean> = {}

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = true

      if (e.key.toLowerCase() === 'h') soundRef.current.playHorn(true)
      if (e.key.toLowerCase() === 'l') setHeadlightsOn((prev) => !prev)
      if (e.key.toLowerCase() === 'r') {
        physicsRef.current.reset(0, 0, 0)
        movableManagerRef.current?.resetAll()
      }
      if (e.key.toLowerCase() === 'c') {
        setCurrentCameraMode((prev) => {
          const modes: CameraViewMode[] = ['chase', 'cockpit', 'topdown', 'orbit']
          const nextIdx = (modes.indexOf(prev) + 1) % modes.length
          return modes[nextIdx]
        })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false
      if (e.key.toLowerCase() === 'h') soundRef.current.playHorn(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Main Simulation Loop
    let lastTime = performance.now()
    let telemetryTimer = 0

    engine.runRenderLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      // Determine control inputs: Mobile packet takes priority, otherwise local keyboard
      let throttle = 0
      let steer = 0
      let brake = false
      let boost = false

      const ctrlPacket = lastControlPacketRef.current

      // Check keyboard first
      if (keysPressed['w'] || keysPressed['arrowup']) throttle += 1.0
      if (keysPressed['s'] || keysPressed['arrowdown']) throttle -= 1.0
      if (keysPressed['a'] || keysPressed['arrowleft']) steer -= 1.0
      if (keysPressed['d'] || keysPressed['arrowright']) steer += 1.0
      if (keysPressed[' ']) brake = true
      if (keysPressed['shift']) boost = true

      // If mobile controller is connected and sending packets
      if (ctrlPacket) {
        // Gyro steer or tactile steer
        steer = ctrlPacket.steer
        throttle = ctrlPacket.throttle
        if (ctrlPacket.brake) brake = true
        if (ctrlPacket.boost) boost = true

        if (ctrlPacket.horn) {
          soundRef.current.playHorn(true)
        } else if (!keysPressed['h']) {
          soundRef.current.playHorn(false)
        }
      }

      // Physics integration step
      const physics = physicsRef.current
      physics.update(dt, throttle, steer, brake, boost)

      // Movable dynamic bodies simulation (crates, barrels, cones, stunt balls)
      if (movableManagerRef.current) {
        const movableHitForce = movableManagerRef.current.update(dt, physics)
        if (movableHitForce > 0.6) {
          soundRef.current.playCollision(movableHitForce)
        }
      }

      // Play collision sound if any
      if (physics.collisionOccurred) {
        soundRef.current.playCollision(physics.collisionForce)
      }

      // Update 3D car visual state with boost exhaust glow
      car.update(physics, dt, headlightsOn, boost)

      // Update sound engine
      const currentSpeedKmh = Math.abs(Math.round(physics.speed * 3.6))
      soundRef.current.updateEngine(physics.rpm, currentSpeedKmh, boost)

      // Update Top-down cam target to follow car smoothly (arcade bird's-eye)
      if (currentCameraMode === 'topdown') {
        topDownCam.position.x = physics.x
        topDownCam.position.y = 50
        topDownCam.position.z = physics.z - 10
        topDownCam.setTarget(new Vector3(physics.x, 0, physics.z))
      }

      // Switch active camera if changed
      if (currentCameraMode === 'chase' && scene.activeCamera !== chaseCam) {
        scene.activeCamera = chaseCam
      } else if (currentCameraMode === 'cockpit' && scene.activeCamera !== cockpitCam) {
        scene.activeCamera = cockpitCam
      } else if (currentCameraMode === 'topdown' && scene.activeCamera !== topDownCam) {
        scene.activeCamera = topDownCam
      } else if (currentCameraMode === 'orbit' && scene.activeCamera !== orbitCam) {
        scene.activeCamera = orbitCam
        orbitCam.target = car.bodyMesh.position
      }

      // Update React HUD state and transmit 3D telemetry (30 FPS for mobile 3D viewport)
      telemetryTimer += dt
      if (telemetryTimer >= 0.033) {
        telemetryTimer = 0
        setSpeedKmh(currentSpeedKmh)
        setRpm(Math.round(physics.rpm))
        setGear(physics.gear)
        setNitro(Math.round(physics.nitro))
        setSteerDisplay(Number(steer.toFixed(2)))

        // Broadcast telemetry to mobile controller
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && controllerConnected) {
          const telemetryPacket: TelemetryPacket = {
            type: 'telemetry',
            room: roomCode,
            timestamp: Date.now(),
            speedKmh: currentSpeedKmh,
            rpm: Math.round(physics.rpm),
            gear: physics.gear,
            nitro: Math.round(physics.nitro),
            collision: physics.collisionOccurred,
            collisionForce: physics.collisionForce,
            lightsOn: headlightsOn,
            cameraMode: currentCameraMode,
            x: Number(physics.x.toFixed(3)),
            y: Number(physics.y.toFixed(3)),
            z: Number(physics.z.toFixed(3)),
            heading: Number(physics.heading.toFixed(3)),
            pitch: Number(physics.pitch.toFixed(3)),
            roll: Number(physics.roll.toFixed(3)),
            steerAngle: Number(physics.steerAngle.toFixed(3)),
            speed: Number(physics.speed.toFixed(2)),
          }
          wsRef.current.send(JSON.stringify(telemetryPacket))
        }
      }

      scene.render()
    })

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('keydown', handleFirstGesture)
      window.removeEventListener('click', handleFirstGesture)
      engine.dispose()
      soundRef.current.destroy()
    }
  }, [roomCode, currentCameraMode, headlightsOn, controllerConnected])

  const copyControllerLink = () => {
    navigator.clipboard.writeText(controllerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSound = () => {
    const muted = soundRef.current.toggleMute()
    setIsMuted(muted)
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block outline-none cursor-grab active:cursor-grabbing" />

      {/* Subtle CRT / Arcade Scanlines */}
      <div className="absolute inset-0 scanlines pointer-events-none" />

      {/* TOP BAR / HEADER */}
      <header className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        {/* Left: Brand & Room Info */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-lg neon-glow-cyan">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 text-lg tracking-wider">
              LOGOS RC 3D
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="flex items-center gap-1.5 font-mono text-sm bg-slate-950/80 px-2.5 py-1 rounded-md border border-cyan-500/20 text-cyan-300">
              <span className="text-xs text-slate-400">SALA:</span>
              <strong className="tracking-widest">{roomCode}</strong>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div
            className={`px-3 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2 text-xs font-semibold shadow-lg transition-all ${
              controllerConnected
                ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-300 neon-glow-emerald'
                : 'bg-rose-950/85 border-rose-500/40 text-rose-300 animate-pulse'
            }`}
          >
            {controllerConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Móvil Conectado ({latency}ms)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-400" />
                <span>Esperando Móvil...</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Controls & Modals */}
        <div className="flex items-center gap-2">
          {/* QR Code Toggle Button */}
          <button
            onClick={() => setShowQrModal((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2 text-xs font-semibold transition-all shadow-md ${
              showQrModal
                ? 'bg-cyan-600 border-cyan-400 text-white'
                : 'bg-slate-900/85 border-slate-700/60 text-slate-200 hover:border-cyan-400'
            }`}
            title="Conectar Teléfono Móvil"
          >
            <QrIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Conectar Móvil</span>
          </button>

          {/* Camera View Selector */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 flex items-center gap-1 shadow-md">
            {(['chase', 'cockpit', 'topdown', 'orbit'] as CameraViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCurrentCameraMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  currentCameraMode === mode
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'chase' ? 'Seguir' : mode === 'cockpit' ? 'Capó' : mode === 'topdown' ? 'Aérea' : 'Órbita'}
              </button>
            ))}
          </div>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-2.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl text-slate-200 hover:text-white hover:border-cyan-400 transition-all shadow-md"
            title={isMuted ? 'Activar Sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Reset Car & Track Objects Position */}
          <button
            onClick={() => {
              physicsRef.current.reset(0, 0, 0)
              movableManagerRef.current?.resetAll()
            }}
            className="p-2.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl text-slate-200 hover:text-white hover:border-amber-400 transition-all shadow-md"
            title="Reiniciar Posición del Auto y Objetos (R)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* QR CODE CONNECTION MODAL */}
      {showQrModal && (
        <div className="absolute top-20 right-4 w-80 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-5 shadow-2xl z-30 transition-all animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-sm">Control por Giroscopio</h2>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-slate-300 leading-relaxed">
              Escanea este código con la cámara de tu smartphone para manejar el auto usando el giroscopio:
            </p>

            {qrDataUrl && (
              <div className="my-3 p-2 bg-white rounded-xl inline-block shadow-inner">
                <img src={qrDataUrl} alt="Escanea para conectar" className="w-52 h-52 block" />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-1">
              <button
                onClick={copyControllerLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar Enlace'}
              </button>

              <a
                href={controllerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Pestaña
              </a>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              Ambos dispositivos deben estar en la misma red Wi-Fi o acceder al mismo host.
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM TELEMETRY HUD */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-6 pointer-events-none">
        {/* Speedometer Cluster */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 neon-glow-cyan pointer-events-auto">
          {/* Main Speed Digital Display */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-5xl font-black tracking-tight text-white drop-shadow-md">
                {speedKmh}
              </span>
              <span className="text-xs font-bold uppercase text-cyan-400 tracking-wider">KM/H</span>
            </div>

            {/* Gear Selector Badge */}
            <div className="flex items-center gap-2 mt-1">
              {(['P', 'D', 'R'] as const).map((g) => (
                <span
                  key={g}
                  className={`text-xs px-2 py-0.5 rounded font-black font-mono transition-all ${
                    gear === g
                      ? g === 'R'
                        ? 'bg-rose-500 text-white shadow'
                        : g === 'D'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-12 bg-slate-800" />

          {/* RPM & Nitro Bars */}
          <div className="flex flex-col gap-2 w-44">
            {/* RPM Gauge */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                <span>TACOMETRO</span>
                <span className="text-cyan-300 font-bold">{rpm} RPM</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-rose-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(5, (rpm / 7500) * 100))}%` }}
                />
              </div>
            </div>

            {/* Nitro Boost Bar */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                <span className="flex items-center gap-1 text-orange-400">
                  <Zap className="w-3 h-3 fill-orange-400" /> NITRO
                </span>
                <span className="text-orange-300 font-bold">{nitro}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-75"
                  style={{ width: `${nitro}%` }}
                />
              </div>
            </div>
          </div>

          {/* Steering Wheel Indicator */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 mb-1">DIRECCIÓN</span>
            <div
              className="w-10 h-10 rounded-full border-2 border-dashed border-cyan-400/80 flex items-center justify-center transition-transform duration-75"
              style={{ transform: `rotate(${steerDisplay * 45}deg)` }}
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-[10px] font-mono text-cyan-300 mt-0.5">
              {steerDisplay > 0 ? `+${steerDisplay}` : steerDisplay}
            </span>
          </div>
        </div>
      </footer>

      {/* KEYBOARD SHORTCUTS HINT (Bottom Left) */}
      <aside className="absolute bottom-6 left-6 hidden lg:flex flex-col gap-1 text-[11px] font-mono text-slate-400/90 bg-slate-950/70 backdrop-blur-md p-3 rounded-xl border border-slate-800/80 pointer-events-none">
        <span className="text-cyan-400 font-bold mb-0.5">CONTROLES DE TECLADO:</span>
        <div><strong className="text-white">W / S</strong> o Flechas: Acelerar / Reversa</div>
        <div><strong className="text-white">A / D</strong>: Girar Dirección</div>
        <div><strong className="text-white">ESPACIO</strong>: Freno de mano</div>
        <div><strong className="text-white">SHIFT</strong>: Nitro Boost</div>
        <div><strong className="text-white">C</strong>: Cambiar Cámara | <strong className="text-white">H</strong>: Bocina | <strong className="text-white">R</strong>: Reset</div>
      </aside>
    </div>
  )
}
