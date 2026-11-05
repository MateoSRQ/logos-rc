# Matriz de Pruebas: FEAT-001 Auto RC y Control Remoto

- **ID Feature**: `FEAT-001`
- **Estado de Cobertura**: PASSED

---

## 1. Pruebas Unitarias (Lógica Aislada y Dominio)

| Test ID | Módulo / Función | Caso de Prueba | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `UNIT-001` | `VehiclePhysics.update()` | Aceleración desde reposo | La velocidad se incrementa según aceleración y delta time sin saltos bruscos | [x] Passed |
| `UNIT-002` | `VehiclePhysics.update()` | Frenado y desaceleración | La velocidad decae hacia cero con resistencia al rodamiento y freno activo | [x] Passed |
| `UNIT-003` | `VehiclePhysics.update()` | Giro y ángulo de dirección | La dirección modifica el rumbo `heading` en función de la velocidad y Ackermann | [x] Passed |
| `UNIT-004` | `VehiclePhysics.update()` | Reversa tras parada | Con velocidad cero y acelerador negativo entra marcha atrás `R` | [x] Passed |
| `UNIT-005` | `GyroCalibration.normalize()` | Inclinación móvil normalizada | Convierte ángulos gamma/beta a rango [-1, 1] respetando zona muerta y suavizado | [x] Passed |
| `UNIT-006` | `Protocol.serialize/deserialize` | Empaquetado de comandos de control | Valida estructura e integridad del paquete JSON de control de auto | [x] Passed |

---

## 2. Pruebas de Integración (Componentes y Red)

| Test ID | Componentes Involucrados | Caso de Prueba | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `INT-001` | WebSocket Relay + Host + Controller | Registro de sala y emparejamiento | Controller y Host se asocian a la misma sala y reciben mensajes cruzados | [x] Passed |
| `INT-002` | WebSocket Relay | Desconexión de cliente | Notifica al par restante sobre la pérdida de conexión (`controller_disconnected`) | [x] Passed |
| `INT-003` | VehiclePhysics + SoundEffects | Cálculo de RPM y volumen | La frecuencia del motor de audio se ajusta linealmente a la velocidad del auto | [x] Passed |

---

## 3. Pruebas Funcionales / E2E (Flujo de Usuario)

| Test ID | Criterio de Aceptación | Flujo | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `FUNC-001` | Navegación TanStack Start | Carga de `/` | Renderiza canvas WebGL, escena Babylon.js, vehículo y HUD con código QR | [x] Passed |
| `FUNC-002` | Controlador Móvil | Carga de `/controller?room=TEST` | Renderiza UI de control, botón de giroscopio y pedales táctiles | [x] Passed |
