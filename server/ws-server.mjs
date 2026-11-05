import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

const PORT = Number(process.env.WS_PORT || process.env.PORT || 6322)
const HOST = '0.0.0.0'

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200)
    res.end(
      JSON.stringify({
        status: 'online',
        service: 'logos-rc-ws-relay',
        activeRooms: rooms.size,
        timestamp: Date.now(),
      })
    )
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

const wss = new WebSocketServer({ server })

/**
 * Room management:
 * Map<string, { host: WebSocket | null, controllers: Set<WebSocket> }>
 */
const rooms = new Map()

// Reverse lookup for socket metadata
const socketMeta = new WeakMap()

function getOrCreateRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      host: null,
      controllers: new Set(),
      createdAt: Date.now(),
    })
  }
  return rooms.get(roomCode)
}

function cleanRoom(roomCode) {
  const room = rooms.get(roomCode)
  if (!room) return
  if (!room.host && room.controllers.size === 0) {
    rooms.delete(roomCode)
    console.log(`[Room ${roomCode}] Empty room cleaned up. Active rooms: ${rooms.size}`)
  }
}

function safeSend(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
    } catch (err) {
      console.error('Error sending message to client:', err)
    }
  }
}

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  socketMeta.set(ws, { role: null, room: null, deviceInfo: '' })

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (!msg || typeof msg !== 'object') return

    // 1. Handle Registration
    if (msg.type === 'register') {
      const { role, room: roomCode, deviceInfo } = msg
      if (!roomCode || (role !== 'host' && role !== 'controller')) return

      const meta = socketMeta.get(ws) || {}
      meta.role = role
      meta.room = roomCode
      meta.deviceInfo = deviceInfo || ''
      socketMeta.set(ws, meta)

      const room = getOrCreateRoom(roomCode)

      if (role === 'host') {
        if (room.host && room.host !== ws && room.host.readyState === WebSocket.OPEN) {
          safeSend(room.host, {
            type: 'peer_status',
            role: 'host',
            connected: false,
            deviceInfo: 'Replaced by newer host session',
          })
          room.host.close()
        }
        room.host = ws
        console.log(`[Room ${roomCode}] Host registered (${clientIp})`)

        safeSend(ws, {
          type: 'registered',
          role: 'host',
          room: roomCode,
          connectedPeer: room.controllers.size > 0,
        })

        if (room.controllers.size > 0) {
          safeSend(ws, {
            type: 'peer_status',
            role: 'controller',
            connected: true,
            deviceInfo: 'Mobile controller already connected',
          })
          for (const ctrl of room.controllers) {
            safeSend(ctrl, {
              type: 'peer_status',
              role: 'host',
              connected: true,
            })
          }
        }
      } else if (role === 'controller') {
        room.controllers.add(ws)
        console.log(`[Room ${roomCode}] Mobile controller connected (${deviceInfo || clientIp})`)

        safeSend(ws, {
          type: 'registered',
          role: 'controller',
          room: roomCode,
          connectedPeer: room.host !== null && room.host.readyState === WebSocket.OPEN,
        })

        if (room.host && room.host.readyState === WebSocket.OPEN) {
          safeSend(room.host, {
            type: 'peer_status',
            role: 'controller',
            connected: true,
            deviceInfo: deviceInfo || 'Mobile Controller',
          })
          safeSend(ws, {
            type: 'peer_status',
            role: 'host',
            connected: true,
          })
        }
      }
      return
    }

    // 2. Handle Latency Ping/Pong
    if (msg.type === 'ping') {
      safeSend(ws, { type: 'pong', timestamp: msg.timestamp || Date.now() })
      return
    }

    const meta = socketMeta.get(ws)
    if (!meta || !meta.room) return
    const room = rooms.get(meta.room)
    if (!room) return

    // 3. Route Control Packet (Mobile -> Host)
    if (msg.type === 'control') {
      if (room.host && room.host.readyState === WebSocket.OPEN) {
        safeSend(room.host, msg)
      }
      return
    }

    // 4. Route Telemetry Packet (Host -> Controllers)
    if (msg.type === 'telemetry') {
      for (const ctrl of room.controllers) {
        safeSend(ctrl, msg)
      }
      return
    }
  })

  ws.on('close', () => {
    const meta = socketMeta.get(ws)
    if (!meta || !meta.room) return
    const { room: roomCode, role } = meta
    const room = rooms.get(roomCode)
    if (!room) return

    if (role === 'host' && room.host === ws) {
      room.host = null
      console.log(`[Room ${roomCode}] Host disconnected`)
      for (const ctrl of room.controllers) {
        safeSend(ctrl, {
          type: 'peer_status',
          role: 'host',
          connected: false,
        })
      }
    } else if (role === 'controller') {
      room.controllers.delete(ws)
      console.log(`[Room ${roomCode}] Mobile controller disconnected`)
      if (room.host && room.host.readyState === WebSocket.OPEN) {
        safeSend(room.host, {
          type: 'peer_status',
          role: 'controller',
          connected: room.controllers.size > 0,
        })
      }
    }

    cleanRoom(roomCode)
  })

  ws.on('error', (err) => {
    console.error(`Socket error from ${clientIp}:`, err.message)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`🚀 Logos RC WebSocket Server running at http://${HOST}:${PORT} (ws://${HOST}:${PORT})`)
})
