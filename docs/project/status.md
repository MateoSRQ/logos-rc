# Tablero Central de Estado y Control del Proyecto

> [!IMPORTANT]
> **SINGLE SOURCE OF TRUTH**: Este archivo es el primer punto de lectura obligatorio para el agente al iniciar cada sesión. Debe mantenerse actualizado tras cada avance o cambio de fase.

---

## 1. Información General del Proyecto
- **Nombre del Proyecto**: Logos RC (Remote Controlled 3D Car with Babylon.js & TanStack Start)
- **Fase Actual**: Circuito Oval Indianapolis, Dirección Ultra Sensible y Stunt Infield (Sprint 2)
- **Última Actualización**: 2026-11-04 21:25
- **Próximo Hito (Milestone)**: Simulación 3D de Auto RC completa con control remoto por giroscopio vía WebSocket desde smartphone

---

## 2. Feature en Progreso (ACTIVE FEATURE)
- **ID & Nombre**: `FEAT-006` - Indianapolis Motor Speedway Oval, High Sensitivity Steering & Infield Stunt Loop
- **Fase Actual**: COMPLETADO & VERIFICADO (100%)
- **Ruta de Especificación**: `docs/project/features/FEAT-001/spec.md`
- **Ruta de Pruebas**: `tests/engine.test.ts`
- **Tareas Completadas**:
  - Circuito ovalado rectangular al estilo **Indianapolis Motor Speedway (IMS)** con Frontstretch (180m), Turn 1 peraltada, North Short Chute, Turn 2, Backstretch de alta velocidad (180m), Turn 3, South Short Chute y Turn 4 (`src/engine/TrackBuilder.ts`).
  - La legendaria **"Yard of Bricks"** de ladrillos vitrificados en la línea de meta con placa dorada de homenaje.
  - La icónica **Torre Pagoda IMS** de control y el pilón de puntuación digital (Scoring Pylon) en la recta principal.
  - Muros de seguridad tipo SAFER continuos a lo largo de todo el trazado con solver analítico que impide salir de la pista.
  - Infield con curvas enlazadas, **360 Stunt Loop elevado** y rampas de salto.
  - Dirección del timón ultra sensible y ágil: `turnSpeedBase: 3.4` (incremento de +84%), mayor ángulo de giro de ruedas (`maxSteerAngleRad: 0.65`), sensibilidad giroscópica de `1.45 - 1.95` y ángulo de bloqueo a solo 22 grados de inclinación.
  - Suite de 12/12 pruebas unitarias e integrales en Vitest pasando exitosamente.
- **Tarea Inmediata Siguiente**: Pruebas de manejo móvil con giroscopio en vivo.

---

## 3. Registro de Features (Feature Roadmap & Backlog)

| ID | Nombre de Feature | Prioridad | Pruebas Unitarias | Pruebas Integración | Pruebas Funcionales | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-001` | TanStack Start + BabylonJS 3D RC Car & Track Scene | Alta | [x] | [x] | [x] | COMPLETED |
| `FEAT-002` | WebSocket Relay Server & Room Pairing System (QR Code) | Alta | [x] | [x] | [x] | COMPLETED |
| `FEAT-003` | Mobile Gyroscope RC Remote Controller UI (`/controller`) | Alta | [x] | [x] | [x] | COMPLETED |
| `FEAT-004` | Extended Circuit, Mountain Ranges, Directional Jumps & Movable Objects | Alta | [x] | [x] | [x] | COMPLETED |
| `FEAT-005` | Walled Arcade Track, Dragon Twists, Mega Jumps & 360 Stunt Loop | Alta | [x] | [x] | [x] | COMPLETED |
| `FEAT-006` | Indianapolis Motor Speedway Oval & Ultra-Responsive Steering | Alta | [x] | [x] | [x] | COMPLETED |

---

## 4. Registro de Cambios Recientes (Recent History)
- `2026-11-04`:
  - Activación del túnel seguro ngrok (`https://limit-stardust-glitzy.ngrok-free.dev`) para permitir sensores giroscópicos móviles en contexto HTTPS seguro.
  - Construcción de pista de circuito de 220m con cordillera de montañas alpinas y picos nevados procedurales.
  - Implementación del gestor de cuerpos dinámicos desplazables (`MovableObjectsManager`) con cajas de madera, barriles y conos de tráfico dispersables al impacto.
  - Malla detallada del auto RC con cálipers de freno rojos, rines de 5 radios, alerón GT3 con endplates, jaula antivuelco, difusor trasero, tubos de escape dobles con efecto nitro y antena flexible.
