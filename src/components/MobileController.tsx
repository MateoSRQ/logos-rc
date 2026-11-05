import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Engine,
  Scene,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  DirectionalLight,
  UniversalCamera,
  FollowCamera,
} from '@babylonjs/core'
import {
  Wifi,
  WifiOff,
  Compass,
  Volume2,
  Lightbulb,
  RotateCcw,
  Camera as CameraIcon,
  ArrowUp,
  ArrowDown,
  Flame,
  Smartphone,
} from 'lucide-react'
import { buildTrack } from '../engine/TrackBuilder'
import { BabylonCar } from '../engine/BabylonCar'
import { GyroCalibrator } from '../engine/GyroCalibration'
import type { CameraViewMode, ControlPacket, TelemetryPacket } from '../net/protocol'

interface MobileControllerProps {
  initialRoom?: string
}

export const MobileController: React.FC<MobileControllerProps> = ({ initialRoom }) => {
  const [roomCode] = useState(() => {
    if (initialRoom) return initialRoom
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || 'RC-1000'
  })

  // Canvas ref for mobile 3D rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Connection & Latency
  const [wsConnected, setWsConnected] = useState(false)
  const [hostConnected, setHostConnected] = useState(false)
  const [latency, setLatency] = useState(0)

  // Orientation & Landscape
  const [isLandscape, setIsLandscape] = useState(true)
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false)

  // Gyroscope & Sensors
  const [gyroActive, setGyroActive] = useState(false)
  const [gyroNeedsPermission, setGyroNeedsPermission] = useState(false)
  const [controlMode, setControlMode] = useState<'gyro_hybrid' | 'gyro_full'>('gyro_hybrid')
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'med' | 'high'>('high')

  // Live Sensor Readouts
  const [currentRoll, setCurrentRoll] = useState(0)
  const [currentPitch, setCurrentPitch] = useState(0)
  const [steerAngle, setSteerAngle] = useState(0)
  const [throttleVal, setThrottleVal] = useState(0)

  // Telemetry from Host
  const [hostSpeedKmh, setHostSpeedKmh] = useState(0)
  const [hostGear, setHostGear] = useState<'P' | 'D' | 'R'>('P')
  const [hostNitro, setHostNitro] = useState(100)

  // Toggles & Momentary buttons
  const [headlights, setHeadlights] = useState(true)
  const [isHornActive, setIsHornActive] = useState(false)
  const [isBoostActive, setIsBoostActive] = useState(false)
  const [isBrakeActive, setIsBrakeActive] = useState(false)
  const [touchThrottle, setTouchThrottle] = useState(0)

  // Mobile camera mode (defaults to cockpit, can toggle to chase)
  const [cameraMode, setCameraMode] = useState<'cockpit' | 'chase'>('cockpit')

  // Target spatial transform from host telemetry
  const targetTransformRef = useRef<{
    x: number
    y: number
    z: number
    heading: number
    pitch: number
    roll: number
    steerAngle: number
    speed: number
    lightsOn: boolean
  }>({
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    steerAngle: 0,
    speed: 0,
    lightsOn: true,
  })

  // Calibrator Ref tuned for high responsiveness and fast steering
  const calibratorRef = useRef<GyroCalibrator>(
    new GyroCalibrator({
      deadzone: 0.02,
      sensitivity: 1.65, // Quick, agile steering
      smoothing: 0.14,
      exponential: 1.2,
      maxRollAngle: 22,  // Only 22 deg tilt for full lock
      maxPitchAngle: 20,
    })
  )

  const wsRef = useRef<WebSocket | null>(null)
  const rawOrientationRef = useRef<{ alpha: number; beta: number; gamma: number }>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  })

  // 3D Babylon.js Scene Setup on Mobile Viewport
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    engine.setHardwareScalingLevel(1.2) // High performance on mobile GPUs

    const scene = new Scene(engine)
    scene.clearColor = new Color4(0.04, 0.06, 0.1, 1.0)
    scene.ambientColor = new Color3(0.2, 0.25, 0.3)

    // Lighting
    const hemiLight = new HemisphericLight('mobileHemiLight', new Vector3(0, 1, 0), scene)
    hemiLight.intensity = 0.8
    hemiLight.groundColor = new Color3(0.12, 0.14, 0.18)

    const dirLight = new DirectionalLight('mobileDirLight', new Vector3(-1, -2, -1), scene)
    dirLight.position = new Vector3(20, 35, 20)
    dirLight.intensity = 0.9

    // Build arena & track
    buildTrack(scene)

    // Babylon RC Car
    const car = new BabylonCar(scene)

    // 1. Cockpit Camera: Driver view inside cabin looking over hood
    const cockpitCam = new UniversalCamera('mobileCockpitCam', new Vector3(0, 0.98, 0.18), scene)
    cockpitCam.parent = car.root
    cockpitCam.rotation.x = 0.06
    cockpitCam.minZ = 0.05
    cockpitCam.fov = 1.15

    // 2. Chase Camera: Third-person view following behind the car
    const chaseCam = new FollowCamera('mobileChaseCam', new Vector3(0, 4.2, -8.5), scene)
    chaseCam.radius = 7.0
    chaseCam.heightOffset = 2.8
    chaseCam.rotationOffset = 180
    chaseCam.cameraAcceleration = 0.12
    chaseCam.maxCameraSpeed = 30
    chaseCam.lockedTarget = car.bodyMesh

    scene.activeCamera = cameraMode === 'cockpit' ? cockpitCam : chaseCam

    // Render loop with smooth interpolation
    let wheelRotation = 0

    engine.runRenderLoop(() => {
      // Switch active camera if changed
      if (cameraMode === 'cockpit' && scene.activeCamera !== cockpitCam) {
        scene.activeCamera = cockpitCam
      } else if (cameraMode === 'chase' && scene.activeCamera !== chaseCam) {
        scene.activeCamera = chaseCam
      }

      const target = targetTransformRef.current
      if (target) {
        const factor = 0.38
        car.root.position.x += (target.x - car.root.position.x) * factor
        car.root.position.y += (target.y - car.root.position.y) * factor
        car.root.position.z += (target.z - car.root.position.z) * factor

        let dH = target.heading - car.root.rotation.y
        while (dH > Math.PI) dH -= 2 * Math.PI
        while (dH < -Math.PI) dH += 2 * Math.PI
        car.root.rotation.y += dH * factor

        car.root.rotation.x += (target.pitch - car.root.rotation.x) * factor
        car.root.rotation.z += (target.roll - car.root.rotation.z) * factor

        if (car.frontLeftPivot) car.frontLeftPivot.rotation.y = target.steerAngle
        if (car.frontRightPivot) car.frontRightPivot.rotation.y = target.steerAngle
        if (car.cockpitWheel) car.cockpitWheel.rotation.z = -target.steerAngle * 2.2

        // Spin wheels
        const wheelCircumference = 2 * Math.PI * 0.38
        const deltaRot = ((target.speed * 0.016) / wheelCircumference) * (2 * Math.PI)
        wheelRotation += deltaRot
        car.wheelFL.rotation.x = wheelRotation
        car.wheelFR.rotation.x = wheelRotation
        car.wheelRL.rotation.x = wheelRotation
        car.wheelRR.rotation.x = wheelRotation

        car.headLightL.setEnabled(target.lightsOn)
        car.headLightR.setEnabled(target.lightsOn)
      }

      scene.render()
    })

    const handleResize = () => engine.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      engine.dispose()
    }
  }, [cameraMode])

  // Check and observe screen orientation
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return
      const isLand =
        window.innerWidth > window.innerHeight ||
        window.orientation === 90 ||
        window.orientation === -90 ||
        window.screen?.orientation?.type?.includes('landscape')
      setIsLandscape(Boolean(isLand))
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  // Detect iOS permission requirement
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any)?.requestPermission === 'function'
    ) {
      setGyroNeedsPermission(true)
    }
  }, [])

  // Attempt to lock screen orientation to landscape
  const tryLockLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
      if ((screen.orientation as any)?.lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {})
      }
    } catch {}
  }

  // Update Sensitivity Preset
  const handleSensitivityChange = (preset: 'low' | 'med' | 'high') => {
    setSensitivityPreset(preset)
    if (preset === 'low') {
      calibratorRef.current.updateConfig({
        sensitivity: 1.1,
        maxRollAngle: 32,
        exponential: 1.5,
        deadzone: 0.035,
        smoothing: 0.18,
      })
    } else if (preset === 'med') {
      calibratorRef.current.updateConfig({
        sensitivity: 1.45,
        maxRollAngle: 25,
        exponential: 1.3,
        deadzone: 0.025,
        smoothing: 0.15,
      })
    } else {
      calibratorRef.current.updateConfig({
        sensitivity: 1.95,
        maxRollAngle: 18,
        exponential: 1.1,
        deadzone: 0.015,
        smoothing: 0.12,
      })
    }
    if ('vibrate' in navigator) try { navigator.vibrate(25) } catch {}
  }

  // WebSocket Connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`

    let isMounted = true
    let pingInterval: any = null

    function connect() {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setWsConnected(true)
          ws.send(
            JSON.stringify({
              type: 'register',
              role: 'controller',
              room: roomCode,
              deviceInfo: navigator.userAgent.includes('iPhone')
                ? 'Apple iPhone'
                : navigator.userAgent.includes('Android')
                ? 'Android Smartphone'
                : 'Mobile Device',
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
              if (data.role === 'host') {
                setHostConnected(Boolean(data.connected))
              }
            } else if (data.type === 'registered') {
              if (data.connectedPeer) {
                setHostConnected(true)
              }
            } else if (data.type === 'telemetry') {
              const tel = data as TelemetryPacket
              setHostSpeedKmh(Math.abs(Math.round(tel.speedKmh)))
              setHostGear(tel.gear as any)
              setHostNitro(tel.nitro)

              // Update target 3D transform for mobile Babylon scene
              if (typeof tel.x === 'number') {
                targetTransformRef.current = {
                  x: tel.x,
                  y: tel.y ?? 0,
                  z: tel.z ?? 0,
                  heading: tel.heading ?? 0,
                  pitch: tel.pitch ?? 0,
                  roll: tel.roll ?? 0,
                  steerAngle: tel.steerAngle ?? 0,
                  speed: tel.speed ?? 0,
                  lightsOn: tel.lightsOn ?? true,
                }
              }

              if (tel.collision && 'vibrate' in navigator) {
                try {
                  navigator.vibrate([80, 40, 80])
                } catch {}
              }
            } else if (data.type === 'pong') {
              setLatency(Math.max(1, Date.now() - (data.timestamp || Date.now())))
            }
          } catch (err) {
            console.error('Failed to parse WS packet:', err)
          }
        }

        ws.onclose = () => {
          setWsConnected(false)
          setHostConnected(false)
          if (isMounted) {
            setTimeout(connect, 2000)
          }
        }

        ws.onerror = (err) => {
          console.warn('WS error:', err)
        }
      } catch (err) {
        console.error('WS connection error:', err)
      }
    }

    connect()

    return () => {
      isMounted = false
      clearInterval(pingInterval)
      if (wsRef.current) wsRef.current.close()
    }
  }, [roomCode])

  // Gyroscope Event Listener
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    const alpha = e.alpha || 0
    const beta = e.beta || 0
    const gamma = e.gamma || 0

    rawOrientationRef.current = { alpha, beta, gamma }

    const isLand =
      typeof window !== 'undefined' &&
      (window.orientation === 90 ||
        window.orientation === -90 ||
        window.screen?.orientation?.type?.includes('landscape') ||
        window.innerWidth > window.innerHeight)

    const isLandscapeSecondary =
      typeof window !== 'undefined' &&
      (window.orientation === -90 ||
        window.screen?.orientation?.type === 'landscape-secondary')

    const processed = calibratorRef.current.process(
      alpha,
      beta,
      gamma,
      Boolean(isLand),
      Boolean(isLandscapeSecondary)
    )

    setCurrentRoll(processed.calibratedRoll)
    setCurrentPitch(processed.calibratedPitch)
  }, [])

  // Start Gyroscope
  const enableGyroscope = async () => {
    await tryLockLandscape()

    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission()
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
          setGyroActive(true)
          setGyroNeedsPermission(false)
          calibrateNeutral()
        } else {
          alert('Permiso de sensores denegado por el navegador.')
        }
      } catch (err) {
        console.error('Error solicitando permisos de orientación:', err)
      }
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true)
      setGyroActive(true)
      calibrateNeutral()
    }
  }

  // Calibrate current orientation as neutral center
  const calibrateNeutral = () => {
    const { beta, gamma } = rawOrientationRef.current
    calibratorRef.current.calibrate(beta, gamma)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(50)
      } catch {}
    }
  }

  // 60Hz Control Packet Transmission Loop
  useEffect(() => {
    const timer = setInterval(() => {
      const steer = currentRoll
      let throttle = 0

      if (controlMode === 'gyro_full') {
        throttle = currentPitch
      } else {
        throttle = touchThrottle
      }

      setSteerAngle(steer)
      setThrottleVal(throttle)

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const packet: ControlPacket = {
          type: 'control',
          room: roomCode,
          timestamp: Date.now(),
          steer: Number(steer.toFixed(2)),
          throttle: Number(throttle.toFixed(2)),
          brake: isBrakeActive,
          boost: isBoostActive,
          gyro: {
            alpha: rawOrientationRef.current.alpha,
            beta: rawOrientationRef.current.beta,
            gamma: rawOrientationRef.current.gamma,
            calibratedRoll: currentRoll,
            calibratedPitch: currentPitch,
          },
          headlights,
          horn: isHornActive,
        }

        wsRef.current.send(JSON.stringify(packet))
      }
    }, 1000 / 60)

    return () => clearInterval(timer)
  }, [
    roomCode,
    currentRoll,
    currentPitch,
    controlMode,
    touchThrottle,
    isBrakeActive,
    isBoostActive,
    headlights,
    isHornActive,
  ])

  // Toggle Camera Mode between Cockpit and Chase on Mobile
  const toggleMobileCamera = () => {
    setCameraMode((prev) => (prev === 'cockpit' ? 'chase' : 'cockpit'))
    if ('vibrate' in navigator) try { navigator.vibrate(30) } catch {}
  }

  // Trigger Car Reset
  const triggerResetCar = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'control',
          room: roomCode,
          timestamp: Date.now(),
          steer: 0,
          throttle: 0,
          brake: false,
          boost: false,
          gyro: { alpha: 0, beta: 0, gamma: 0, calibratedRoll: 0, calibratedPitch: 0 },
          resetCar: true,
        })
      )
    }
    if ('vibrate' in navigator) try { navigator.vibrate(60) } catch {}
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white flex flex-col justify-between p-2 select-none touch-none font-sans">
      {/* 3D WEBGL VIEWPORT BACKGROUND CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* 1. TOP HEADER & CONNECTION BAR */}
      <header className="relative z-10 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-1.5 shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-black text-xs tracking-wider text-cyan-400">LOGOS RC</span>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className="font-mono text-xs text-slate-300 font-bold">{roomCode}</span>
        </div>

        {/* Sensibility Selector directly in header */}
        <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800/80 rounded-lg p-0.5 text-[11px] font-bold">
          <span className="text-slate-400 px-1 hidden sm:inline">Timón:</span>
          <button
            onClick={() => handleSensitivityChange('low')}
            className={`px-2 py-0.5 rounded transition ${
              sensitivityPreset === 'low'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Suave
          </button>
          <button
            onClick={() => handleSensitivityChange('med')}
            className={`px-2 py-0.5 rounded transition ${
              sensitivityPreset === 'med'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => handleSensitivityChange('high')}
            className={`px-2 py-0.5 rounded transition ${
              sensitivityPreset === 'high'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rápido
          </button>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hostConnected
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                : 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
            }`}
          >
            {hostConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Host ({latency}ms)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Buscando Host...</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* PORTRAIT WARNING BANNER (Prompt to hold landscape) */}
      {!isLandscape && !dismissRotatePrompt && (
        <div className="relative z-20 bg-amber-950/95 backdrop-blur-md border border-amber-500/60 rounded-xl p-2 my-1 flex items-center justify-between text-xs text-amber-200 shadow-xl animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400 rotate-90 animate-bounce shrink-0" />
            <span>
              <strong>Gira tu móvil en horizontal (Modo Landscape)</strong> para una mejor vista y volante.
            </span>
          </div>
          <button
            onClick={() => {
              setDismissRotatePrompt(true)
              tryLockLandscape()
            }}
            className="text-[10px] bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-2 py-1 rounded ml-2 shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {/* SENSOR ACTIVATION BANNER IF NOT ACTIVE */}
      {!gyroActive && (
        <div className="relative z-20 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-indigo-950/90 backdrop-blur-md border border-cyan-500/50 rounded-xl p-3 text-center my-auto shadow-2xl animate-in fade-in max-w-md mx-auto">
          <Compass className="w-8 h-8 text-cyan-400 mx-auto mb-1 animate-bounce" />
          <h2 className="text-sm font-bold text-white mb-1">Manejo con Timón y Vista 3D</h2>
          <p className="text-xs text-slate-300 mb-2">
            Gira tu teléfono en horizontal como un volante real para conducir el vehículo.
          </p>
          <button
            onClick={enableGyroscope}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-lg uppercase tracking-wider shadow-lg neon-glow-cyan active:scale-95 transition"
          >
            Activar Volante y Sensores
          </button>
        </div>
      )}

      {/* 2. MAIN COCKPIT GAMEPAD LAYOUT (LANDSCAPE-FIRST OVERLAY) */}
      {gyroActive && (
        <div className="relative z-10 flex-1 grid grid-cols-12 gap-2 items-center my-1 min-h-0 pointer-events-none">
          {/* LEFT THUMB CONTROLS (Freno, Nitro, Horn) */}
          <div className="col-span-3 h-full flex flex-col justify-between gap-1.5 pointer-events-auto">
            {/* Aux buttons: Horn & Nitro */}
            <div className="grid grid-cols-2 gap-1.5 shrink-0">
              <button
                onTouchStart={() => {
                  setIsHornActive(true)
                  if ('vibrate' in navigator) try { navigator.vibrate(40) } catch {}
                }}
                onTouchEnd={() => setIsHornActive(false)}
                onMouseDown={() => setIsHornActive(true)}
                onMouseUp={() => setIsHornActive(false)}
                className={`py-2 rounded-xl border backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 ${
                  isHornActive
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 neon-glow-cyan'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300'
                }`}
                title="Bocina"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onTouchStart={() => {
                  setIsBoostActive(true)
                  if ('vibrate' in navigator) try { navigator.vibrate(50) } catch {}
                }}
                onTouchEnd={() => setIsBoostActive(false)}
                onMouseDown={() => setIsBoostActive(true)}
                onMouseUp={() => setIsBoostActive(false)}
                className={`py-2 rounded-xl border backdrop-blur-sm flex items-center justify-center gap-1 font-black text-[11px] uppercase transition-all active:scale-95 ${
                  isBoostActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-orange-300 neon-glow-orange'
                    : 'bg-slate-900/70 border-orange-500/40 text-orange-400'
                }`}
                title="Nitro Boost"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{hostNitro}%</span>
              </button>
            </div>

            {/* Left Main Pedal: BRAKE / REVERSE */}
            <button
              onTouchStart={() => {
                setTouchThrottle(-1.0)
                if ('vibrate' in navigator) try { navigator.vibrate(30) } catch {}
              }}
              onTouchEnd={() => {
                setTouchThrottle(0)
              }}
              onMouseDown={() => {
                setTouchThrottle(-1.0)
              }}
              onMouseUp={() => {
                setTouchThrottle(0)
              }}
              className={`flex-1 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-xl ${
                touchThrottle < -0.1
                  ? 'bg-rose-600/90 border-rose-400 text-white neon-glow-red scale-98'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/50'
              }`}
            >
              <ArrowDown className="w-7 h-7 mb-0.5" />
              <span>Freno / Reversa</span>
            </button>
          </div>

          {/* CENTER DASHBOARD & STEERING WHEEL */}
          <div className="col-span-6 h-full flex flex-col items-center justify-between py-1 px-1 pointer-events-auto">
            {/* Speedometer & Gear display */}
            <div className="flex items-baseline gap-2 shrink-0 bg-slate-950/50 backdrop-blur-xs px-3 py-0.5 rounded-xl border border-slate-800/50">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white drop-shadow-lg">
                {hostSpeedKmh}
              </span>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-cyan-400">KM/H</span>
                <span
                  className={`text-[11px] px-2 py-0.2 rounded font-black font-mono ${
                    hostGear === 'R'
                      ? 'bg-rose-500 text-white'
                      : hostGear === 'D'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {hostGear}
                </span>
              </div>
            </div>

            {/* Visual Steering Wheel Gauge */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-800/80 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center shadow-xl my-auto">
              {/* Wheel Ring Rotation */}
              <div
                className="absolute inset-1.5 rounded-full border-4 border-cyan-400/80 border-t-cyan-300 border-b-transparent transition-transform duration-75 flex items-center justify-center"
                style={{ transform: `rotate(${steerAngle * 45}deg)` }}
              >
                {/* Center Hub & Spokes */}
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
                <div className="absolute left-1 right-1 h-0.5 bg-cyan-400/60" />
              </div>

              {/* Steer reading */}
              <div className="absolute bottom-1 font-mono text-[9px] text-slate-300 bg-slate-950/80 px-1.5 rounded border border-slate-800">
                TIMÓN: <strong className="text-cyan-300">{steerAngle > 0 ? `+${steerAngle.toFixed(2)}` : steerAngle.toFixed(2)}</strong>
              </div>
            </div>

            {/* Bottom Actions: Calibrate Center & Control Mode */}
            <div className="flex items-center gap-1.5 shrink-0 w-full max-w-xs justify-center">
              <button
                onClick={calibrateNeutral}
                className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs border border-cyan-500/40 hover:border-cyan-400 px-2.5 py-1 rounded-lg text-[10px] font-bold text-cyan-300 active:scale-95 transition shadow"
                title="Calibrar centro neutral del timón"
              >
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>Calibrar Centro</span>
              </button>

              <button
                onClick={() => setControlMode((prev) => (prev === 'gyro_hybrid' ? 'gyro_full' : 'gyro_hybrid'))}
                className="text-[10px] px-2 py-1 rounded-lg font-bold bg-slate-900/80 backdrop-blur-xs border border-slate-700 text-slate-300 hover:text-white transition"
              >
                {controlMode === 'gyro_hybrid' ? 'Modo: Pedales' : 'Modo: Giro Total'}
              </button>
            </div>
          </div>

          {/* RIGHT THUMB CONTROLS (Gas, Camara, Reset, Luces) */}
          <div className="col-span-3 h-full flex flex-col justify-between gap-1.5 pointer-events-auto">
            {/* Aux buttons: Camera (Cockpit/Chase toggle), Reset, Lights */}
            <div className="grid grid-cols-3 gap-1 shrink-0">
              <button
                onClick={toggleMobileCamera}
                className="py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-cyan-500/50 text-cyan-300 hover:text-white flex flex-col items-center justify-center transition-all active:scale-95"
                title="Alternar Cámara Móvil (Cockpit / Chase)"
              >
                <CameraIcon className="w-4 h-4" />
                <span className="text-[8px] font-mono mt-0.5 capitalize">{cameraMode}</span>
              </button>

              <button
                onClick={triggerResetCar}
                className="py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-amber-400 hover:text-amber-300 flex items-center justify-center transition-all active:scale-95"
                title="Reiniciar Auto"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setHeadlights((prev) => !prev)}
                className={`py-2 rounded-xl border backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 ${
                  headlights
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                    : 'bg-slate-900/70 border-slate-800 text-slate-500'
                }`}
                title="Luces Delanteras"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>

            {/* Right Main Pedal: ACCELERATOR */}
            <button
              onTouchStart={() => {
                setTouchThrottle(1.0)
                if ('vibrate' in navigator) try { navigator.vibrate(30) } catch {}
              }}
              onTouchEnd={() => setTouchThrottle(0)}
              onMouseDown={() => setTouchThrottle(1.0)}
              onMouseUp={() => setTouchThrottle(0)}
              className={`flex-1 rounded-2xl border-2 backdrop-blur-sm flex flex-col items-center justify-center font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-xl ${
                touchThrottle > 0.1
                  ? 'bg-emerald-500/90 border-emerald-300 text-slate-950 neon-glow-emerald scale-98'
                  : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <ArrowUp className="w-7 h-7 mb-0.5" />
              <span>Acelerador</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
