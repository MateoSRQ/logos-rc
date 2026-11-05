# Protocolo de Sesión Agéntica (Inicio y Fin de Sesión)

Este protocolo es de obligatorio cumplimiento por cualquier agente de IA que opere en este repositorio. Garantiza sincronización continua, continuidad entre sesiones y cero pérdida de contexto.

---

## 1. Protocolo de Inicio de Sesión (*Session Bootstrap*)

En el primer turno de cualquier interacción o al iniciar una nueva tarea, el agente debe realizar estrictamente los siguientes pasos:

1. **Paso 1: Leer el Tablero Central de Estado**:
   - Leer `docs/project/status.md`.
   - Identificar:
     - Estado general del proyecto.
     - Feature actualmente en progreso (`ACTIVE_FEATURE`).
     - Tarea inmediata pendiente.
2. **Paso 2: Confirmar Estado al Usuario**:
   - Responder confirmando la feature activa y el objetivo de la sesión actual sin releer archivos innecesarios.
   - Si no hay feature activa, consultar el backlog en `status.md` y proponer la siguiente.
3. **Paso 3: Carga Quirúrgica**:
   - Leer únicamente la documentación directamente relevante para la tarea inmediata (según los principios de `CONTEXT_STRATEGY.md`).

---

## 2. Protocolo de Fin de Sesión y Transición

Antes de dar por concluido un turno o una sesión de trabajo:

1. **Paso 1: Verificar Pruebas**:
   - Confirmar que las pruebas unitarias, integrales y funcionales asociadas a la tarea estén pasando o claramente documentadas si quedaron en progreso.
2. **Paso 2: Actualizar `status.md`**:
   - Registrar el porcentaje de avance de la feature.
   - Listar tareas completadas y la próxima tarea pendiente.
   - Si la feature se completó, moverla a `COMPLETED_FEATURES` y actualizar el puntero a la siguiente.
3. **Paso 3: Sincronizar Documentación de Soporte**:
   - Si se agregaron endpoints, modelos de datos o dependencias, actualizar `architecture.md`, `database.md`, `dependencies.md` o `credentials.example.md`.
4. **Paso 4: Resumen Conciso al Usuario**:
   - Informar al usuario el estado exacto en que queda el repositorio y el comando o paso con el que se continuará.
