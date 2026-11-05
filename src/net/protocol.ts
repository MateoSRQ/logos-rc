export type ClientRole = 'host' | 'controller'

export interface GyroData {
  alpha: number // Compass z (0 to 360)
  beta: number  // Pitch front/back (-180 to 180)
  gamma: number // Roll left/right (-90 to 90)
  calibratedRoll: number  // Normalized -1 (left) to +1 (right)
  calibratedPitch: number // Normalized -1 (back) to +1 (forward)
}

export type CameraViewMode = 'chase' | 'cockpit' | 'topdown' | 'orbit'

export interface ControlPacket {
  type: 'control'
  room: string
  timestamp: number
  steer: number         // -1 (left) to 1 (right)
  throttle: number      // -1 (reverse/brake) to 1 (full forward)
  brake: boolean        // Handbrake / hard stop
  boost: boolean        // Nitro boost
  gyro: GyroData
  headlights?: boolean
  horn?: boolean
  cameraMode?: CameraViewMode
  resetCar?: boolean
}

export interface TelemetryPacket {
  type: 'telemetry'
  room: string
  timestamp: number
  speedKmh: number
  rpm: number
  gear: string          // 'P' | 'D' | 'R'
  nitro: number         // 0 to 100
  collision: boolean
  collisionForce?: number
  lightsOn: boolean
  cameraMode: CameraViewMode
  x?: number
  y?: number
  z?: number
  heading?: number
  pitch?: number
  roll?: number
  steerAngle?: number
  speed?: number
}

export interface RegisterPacket {
  type: 'register'
  role: ClientRole
  room: string
  deviceInfo?: string
}

export interface RegisteredPacket {
  type: 'registered'
  role: ClientRole
  room: string
  connectedPeer: boolean
}

export interface PeerStatusPacket {
  type: 'peer_status'
  role: ClientRole
  connected: boolean
  deviceInfo?: string
}

export interface PingPacket {
  type: 'ping'
  timestamp: number
}

export interface PongPacket {
  type: 'pong'
  timestamp: number
}

export type WebSocketMessage =
  | ControlPacket
  | TelemetryPacket
  | RegisterPacket
  | RegisteredPacket
  | PeerStatusPacket
  | PingPacket
  | PongPacket

export function isControlPacket(msg: unknown): msg is ControlPacket {
  return typeof msg === 'object' && msg !== null && (msg as { type?: unknown }).type === 'control'
}

export function isTelemetryPacket(msg: unknown): msg is TelemetryPacket {
  return typeof msg === 'object' && msg !== null && (msg as { type?: unknown }).type === 'telemetry'
}
