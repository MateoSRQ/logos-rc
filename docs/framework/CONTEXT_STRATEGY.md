# Estrategia de Control Agéntico y Optimización de Contexto

El contexto del modelo de lenguaje es un recurso limitado y valioso. Este documento establece los principios de ingeniería de contexto para evitar la degradación de rendimiento (*lost in the middle*), saturación de memoria y consumo desmedido de tokens.

---

## 1. Principio de Divulgación Progresiva (*Progressive Disclosure*)

Ningún agente debe cargar toda la documentación al inicio de la conversación. La lectura de archivos debe seguir este orden estricto de menor a mayor profundidad:

1. **Nivel 0: Bootstrap**:
   - Solo lee `docs/project/status.md` (~100 tokens).
   - Identifica la feature activa y el objetivo inmediato.
2. **Nivel 1: Especificación Focalizada**:
   - Lee exclusivamente `docs/project/features/FEAT-XXX/spec.md`.
3. **Nivel 2: Documentación de Soporte Requerida (Bajo Demanda)**:
   - Solo si la feature interactúa con la base de datos: lee `docs/project/database.md`.
   - Solo si la feature requiere nuevas variables de entorno: lee `docs/project/credentials.example.md`.
   - Solo si la feature modifica la estructura de capas: lee `docs/project/architecture.md`.
4. **Nivel 3: Archivos de Código Específicos**:
   - Leer solo los archivos involucrados en la tarea actual usando rangos de líneas o herramientas de lectura focalizadas.

---

## 2. Aislamiento de Acciones Pesadas Mediante Subagentes

Las tareas que producen salidas masivas de texto (logs, stacks de trazas, ejecuciones completas de test suites, linting profundo) deben delegarse a **subagentes efímeros**:

```
[Agente Orquestador (Contexto Limpio)]
        │
        ├──> invoke_subagent(Role: "Tester", Workspace: "branch/inherit")
        │         │
        │         ├──> Ejecuta: npm test / pytest
        │         ├──> Analiza 500 líneas de logs
        │         └──> Retorna: "5 pruebas pasaron, 0 fallos. Archivos tocados: [x, y]"
        │
[Agente Orquestador recibe SOLO el resumen (100 tokens vs 15,000 tokens)]
```

### Reglas de Uso de Subagentes:
1. **Ejecución de Pruebas Iterativas**: Ejecutar pruebas en el subagente para no llenar el contexto principal con logs de errores intermedios.
2. **Investigación de Código Amplio**: Usar subagentes con rol de `research` para rastrear librerías, dependencias o APIs externas.
3. **Refactorizaciones Extensas**: Delegar cambios mecánicos en múltiples archivos para no agotar la ventana del orquestador.

---

## 3. Separación de Acción y Documentación

Para evitar ambigüedad en el razonamiento del modelo:
- **Fase de Planeación / Documentación**: El agente diseña y escribe la especificación y los casos de prueba en markdown. No escribe código ejecutable aquí.
- **Fase de Ejecución**: El agente lee el contrato redactado previamente y produce el código de implementación.
- **Fase de Cierre / Registro**: El agente documenta los resultados de las pruebas y actualiza el estado.

---

## 4. Gestión de Memoria y Sesiones

- Si una sesión se extiende y la ventana de contexto supera el 60% de capacidad:
  1. Guardar el estado actual en `docs/project/status.md`.
  2. Recomendar al usuario el comando `/compact` o iniciar una nueva sesión limpia.
  3. En la nueva sesión, el agente continuará exactamente en el punto registrado en `status.md`.
