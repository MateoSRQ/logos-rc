# Especificación de Feature: FEAT-001 Auto RC 3D con TanStack Start y Babylon.js

- **ID Feature**: `FEAT-001`
- **Nombre**: TanStack Start + BabylonJS 3D RC Car Engine, Track & Controls
- **Estado**: IN_PROGRESS
- **Fecha de Inicio**: 2026-11-02
- **Responsable / Agente**: Antigravity AI

---

## 1. Problema y Objetivo
Construir una experiencia inmersiva y de alto rendimiento donde un vehículo a control remoto (RC) pueda ser visualizado y manejado en un entorno tridimensional (Babylon.js) dentro de una aplicación web construida con TanStack Start, recibiendo comandos de control por giroscopio desde un smartphone a través de WebSockets o mediante teclado/pantalla de escritorio como alternativa.

---

## 2. Alcance (Scope)
### Dentro del Alcance (In Scope)
- [x] Configuración de TanStack Start con Vite, React 19 y Tailwind CSS.
- [x] Motor de física vehicular arcade: aceleración, frenado, reversa, derrape, dirección Ackermann, resistencia al rodamiento y gravedad/saltos.
- [x] Malla 3D procedural de alta fidelidad del auto RC en Babylon.js con suspensión, rotación de 4 ruedas independientes, pivote de dirección delantero, alerón y luces LED funcionales.
- [x] Pista interactiva con asfalto, cordones bicolores, rampa de saltos, conos de slalom y barreras perimetrales con colisión.
- [x] Múltiples cámaras: Chase (seguimiento dinámico), Cockpit (primera persona / capó), Top-Down (aérea) y Orbit (inspección 360°).
- [x] Servidor WebSocket relay y protocolo tipado para sincronización en tiempo real.
- [x] Interfaz móvil en `/controller` con lectura de `DeviceOrientation` (giroscopio e inclinación), calibración neutral, acelerador, freno/reversa, bocina y nitro boost.
- [x] Generación de código QR en pantalla principal para conectar el teléfono escaneándolo con la cámara.
- [x] Efectos de sonido sintetizados mediante Web Audio API (motor, nitro, bocina, choques).
- [x] Suite de pruebas unitarias y de integración (física vehicular, protocolo de red, calibrador de giroscopio).

---

## 3. Contratos de Datos (WebSocket Packets)
### Control Packet (Mobile -> Host @ 60Hz)
```json
{
  "type": "control",
  "room": "RC-7782",
  "timestamp": 1730590000000,
  "steer": 0.45,
  "throttle": 0.8,
  "brake": false,
  "boost": true,
  "gyro": {
    "alpha": 120.4,
    "beta": 22.1,
    "gamma": -15.3,
    "calibratedRoll": 0.45,
    "calibratedPitch": 0.8
  },
  "headlights": true,
  "horn": false,
  "cameraMode": "chase",
  "resetCar": false
}
```

### Telemetry Packet (Host -> Mobile @ 15Hz)
```json
{
  "type": "telemetry",
  "room": "RC-7782",
  "timestamp": 1730590000050,
  "speedKmh": 48.2,
  "rpm": 4200,
  "gear": "D2",
  "battery": 94,
  "collision": false,
  "activeView": "chase",
  "lightsOn": true
}
```

---

## 4. Criterios de Aceptación (Gherkin)

### Escenario 1: Conducción en Pantalla Principal (Local / Teclado)
- **Dado que** el usuario abre la aplicación en el navegador de escritorio
- **Cuando** presiona las teclas W/Flecha Arriba (acelera) o A/D (gira)
- **Entonces** las ruedas delanteras pivotan en el ángulo de dirección correspondiente, el auto avanza con física inercial, el velocímetro refleja la velocidad y la cámara sigue suavemente al vehículo.

### Escenario 2: Emparejamiento con Teléfono Móvil
- **Dado que** la pantalla principal muestra un código de sala y un código QR
- **Cuando** el usuario escanea el código con su teléfono y accede a `/controller?room=...`
- **Entonces** ambos extremos se conectan por WebSocket, el estado cambia a "Connected 🟢" y el teléfono transmite la orientación física en tiempo real.

### Escenario 3: Control por Giroscopio (Tilt & Rotate)
- **Dado que** el teléfono está conectado y el giroscopio activado
- **Cuando** el usuario inclina el teléfono a la izquierda o a la derecha
- **Entonces** el valor `gamma` calibrado gira las ruedas del auto y dirige el trayecto proporcionalmente.
- **Cuando** presiona el pedal táctil o inclina hacia adelante
- **Entonces** el vehículo acelera en el espacio tridimensional.
