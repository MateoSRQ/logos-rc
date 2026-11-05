# Matriz de Pruebas: [ID-NOMBRE]

- **ID Feature**: `FEAT-[NUM]`
- **Estado de Cobertura**: [PENDING | IN_PROGRESS | PASSED]

---

## 1. Pruebas Unitarias (Lógica Aislada y Dominio)
Pruebas de funciones, validadores, entidades y cálculos puros. Sin dependencias externas reales.

| Test ID | Módulo / Función | Caso de Prueba | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `UNIT-001` | `validateInput()` | Envío de correo inválido | Lanza `ValidationError` con código `INVALID_EMAIL` | [ ] Pendiente |
| `UNIT-002` | `calculateTotal()` | Lista de 3 ítems con descuentos | Retorna suma neta con precisión de 2 decimales | [ ] Pendiente |
| `UNIT-003` | `DomainEntity.update()` | Estado no permitido para transición | Lanza `InvalidStateTransitionException` | [ ] Pendiente |

**Comando de Ejecución**:
```bash
npm run test:unit -- [ruta_o_patron]
# o pytest tests/unit/test_[feature].py
```

---

## 2. Pruebas de Integración (Componentes y Persistencia)
Pruebas de integración entre capas: Repositorio con base de datos de prueba, servicios con clientes simulados, serialización.

| Test ID | Componentes Involucrados | Caso de Prueba | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `INT-001` | Repositorio + DB Test | Inserción y consulta por ID | Registro recuperado coincide exactamente | [ ] Pendiente |
| `INT-002` | Servicio + Repositorio | Manejo de rollback en fallo de transacción | No se persisten datos huérfanos | [ ] Pendiente |

**Comando de Ejecución**:
```bash
npm run test:integration -- [ruta_o_patron]
# o pytest tests/integration/test_[feature].py
```

---

## 3. Pruebas Funcionales / E2E (Flujo Completo de Usuario)
Pruebas sobre el sistema o la API completa simulando el comportamiento del cliente final contra los criterios de aceptación.

| Test ID | Criterio de Aceptación | Endpoint / Flujo | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :--- |
| `FUNC-001` | Happy Path creación | `POST /api/v1/resource` | Status 201 + Body con ID y datos creados | [ ] Pendiente |
| `FUNC-002` | Control de duplicados | `POST /api/v1/resource` x2 | Segundo intento responde 409 Conflict | [ ] Pendiente |
| `FUNC-003` | No autenticado | `GET /api/v1/resource` sin header | Status 401 Unauthorized | [ ] Pendiente |

**Comando de Ejecución**:
```bash
npm run test:e2e -- [ruta_o_patron]
# o pytest tests/functional/test_[feature].py
```

---

## 4. Registro de Ejecución y Evidencia
- **Fecha de Validación**: [YYYY-MM-DD]
- **Tasa de Aprobación**: 0% / 100%
- **Resumen de Cobertura**:
  - Unitarias: [X/X pasando]
  - Integración: [X/X pasando]
  - Funcionales: [X/X pasando]
