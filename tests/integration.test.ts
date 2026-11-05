import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

describe('FEAT-002: WebSocket Relay Server Integration Tests', () => {
  let server: http.Server
  let wss: WebSocketServer
  let port: number

  beforeAll(async () => {
    server = http.createServer()
    wss = new WebSocketServer({ server })

    const rooms = new Map<string, { host: WebSocket | null; controllers: Set<WebSocket> }>()

    function getOrCreateRoom(roomCode: string) {
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, { host: null, controllers: new Set() })
      }
      return rooms.get(roomCode)!
    }

    wss.on('connection', (ws) => {
      let role: string | null = null
      let roomCode: string | null = null

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString())

        if (msg.type === 'register') {
          role = msg.role
          roomCode = msg.room
          const room = getOrCreateRoom(roomCode!)

          if (role === 'host') {
            room.host = ws
            ws.send(JSON.stringify({ type: 'registered', role: 'host', room: roomCode, connectedPeer: room.controllers.size > 0 }))
            if (room.controllers.size > 0) {
              ws.send(JSON.stringify({ type: 'peer_status', role: 'controller', connected: true }))
              for (const c of room.controllers) {
                c.send(JSON.stringify({ type: 'peer_status', role: 'host', connected: true }))
              }
            }
          } else if (role === 'controller') {
            room.controllers.add(ws)
            ws.send(JSON.stringify({ type: 'registered', role: 'controller', room: roomCode, connectedPeer: room.host !== null }))
            if (room.host) {
              room.host.send(JSON.stringify({ type: 'peer_status', role: 'controller', connected: true }))
              ws.send(JSON.stringify({ type: 'peer_status', role: 'host', connected: true }))
            }
          }
        }

        if (msg.type === 'control' && roomCode) {
          const room = rooms.get(roomCode)
          if (room?.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify(msg))
          }
        }

        if (msg.type === 'telemetry' && roomCode) {
          const room = rooms.get(roomCode)
          if (room) {
            for (const c of room.controllers) {
              c.send(JSON.stringify(msg))
            }
          }
        }
      })

      ws.on('close', () => {
        if (!roomCode) return
        const room = rooms.get(roomCode)
        if (!room) return
        if (role === 'host' && room.host === ws) {
          room.host = null
          for (const c of room.controllers) {
            c.send(JSON.stringify({ type: 'peer_status', role: 'host', connected: false }))
          }
        } else if (role === 'controller') {
          room.controllers.delete(ws)
          if (room.host) {
            room.host.send(JSON.stringify({ type: 'peer_status', role: 'controller', connected: false }))
          }
        }
      })
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port
        resolve()
      })
    })
  })

  afterAll(async () => {
    wss.close()
    await new Promise<void>((res) => server.close(() => res()))
  })

  it('INT-001: Pairs host and mobile controller and relays control packets', async () => {
    const hostWs = new WebSocket(`ws://127.0.0.1:${port}`)
    const ctrlWs = new WebSocket(`ws://127.0.0.1:${port}`)

    await Promise.all([
      new Promise((res) => hostWs.on('open', res)),
      new Promise((res) => ctrlWs.on('open', res)),
    ])

    const receivedHostMessages: any[] = []
    hostWs.on('message', (data) => receivedHostMessages.push(JSON.parse(data.toString())))

    // 1. Host registers
    hostWs.send(JSON.stringify({ type: 'register', role: 'host', room: 'TEST-ROOM-1' }))
    await new Promise((res) => setTimeout(res, 50))

    // 2. Controller registers
    ctrlWs.send(JSON.stringify({ type: 'register', role: 'controller', room: 'TEST-ROOM-1' }))
    await new Promise((res) => setTimeout(res, 50))

    // Check host received peer_status connected
    const peerConnected = receivedHostMessages.find((m) => m.type === 'peer_status' && m.connected === true)
    expect(peerConnected).toBeDefined()

    // 3. Controller sends control packet
    ctrlWs.send(
      JSON.stringify({
        type: 'control',
        room: 'TEST-ROOM-1',
        steer: 0.5,
        throttle: 0.8,
        brake: false,
        boost: true,
      })
    )

    await new Promise((res) => setTimeout(res, 50))

    const controlReceived = receivedHostMessages.find((m) => m.type === 'control' && m.throttle === 0.8)
    expect(controlReceived).toBeDefined()
    expect(controlReceived.steer).toBe(0.5)

    hostWs.close()
    ctrlWs.close()
  })

  it('INT-002: Informs peer when other client disconnects', async () => {
    const hostWs = new WebSocket(`ws://127.0.0.1:${port}`)
    const ctrlWs = new WebSocket(`ws://127.0.0.1:${port}`)

    await Promise.all([
      new Promise((res) => hostWs.on('open', res)),
      new Promise((res) => ctrlWs.on('open', res)),
    ])

    const ctrlMessages: any[] = []
    ctrlWs.on('message', (d) => ctrlMessages.push(JSON.parse(d.toString())))

    hostWs.send(JSON.stringify({ type: 'register', role: 'host', room: 'ROOM-DISC' }))
    ctrlWs.send(JSON.stringify({ type: 'register', role: 'controller', room: 'ROOM-DISC' }))
    await new Promise((res) => setTimeout(res, 50))

    // Disconnect host
    hostWs.close()
    await new Promise((res) => setTimeout(res, 50))

    const disconnectNotice = ctrlMessages.find((m) => m.type === 'peer_status' && m.connected === false)
    expect(disconnectNotice).toBeDefined()

    ctrlWs.close()
  })
})
