# Framework de Desarrollo Agéntico Modular (FDAM)

Este directorio contiene un marco de trabajo desacoplado, estandarizado y reutilizable para el desarrollo de software asistido por agentes de Inteligencia Artificial.

El framework está diseñado para:
1. **Desarrollo Feature-by-Feature**: Asegurar que cada incremento de software esté delimitado, implementado y probado antes de continuar al siguiente.
2. **Pirámide de Pruebas Completa**: Integrar pruebas unitarias, integrales y funcionales/E2E como condición estricta de finalización (*Definition of Done*).
3. **Eficiencia Máxima de Tokens y Contexto**: Minimizar el consumo de tokens evitando la lectura masiva de archivos irrelevantes mediante *Progressive Disclosure* y aislamiento con subagentes.
4. **Portabilidad Multi-Proyecto**: Puede copiarse directamente en cualquier repositorio bajo la carpeta `docs/framework/`.

---

## Estructura del Framework

- **[LIFECYCLE.md](./LIFECYCLE.md)**: El ciclo de vida de desarrollo feature por feature (especificación, pruebas, desarrollo, validación y cierre).
- **[CONTEXT_STRATEGY.md](./CONTEXT_STRATEGY.md)**: Reglas de economía de contexto y delegación a subagentes para preservar la ventana de contexto.
- **[SESSION_PROTOCOL.md](./SESSION_PROTOCOL.md)**: Protocolo obligatorio de inicio y finalización de sesión para agentes.
- **[templates/](./templates/)**: Plantillas estándar para instanciar en cada proyecto:
  - `architecture_tpl.md`: Arquitectura, capas, patrones y decisiones técnicas.
  - `database_tpl.md`: Esquemas, modelos relacionales/no-relacionales y migraciones.
  - `credentials_tpl.md`: Catálogo de variables de entorno y reglas de seguridad.
  - `dependencies_tpl.md`: Stack tecnológico, paquetes de terceros y versiones.
  - `feature_spec_tpl.md`: Especificación funcional y técnica por feature.
  - `test_matrix_tpl.md`: Matriz de pruebas unitarias, integrales y funcionales.
  - `status_tpl.md`: Tablero de estado global (*Single Source of Truth*).

---

## Cómo Instanciar este Framework en un Nuevo Proyecto

1. Copiar la carpeta `docs/framework/` al nuevo proyecto.
2. Copiar las plantillas desde `docs/framework/templates/` hacia `docs/project/`:
   ```bash
   mkdir -p docs/project/features
   cp docs/framework/templates/architecture_tpl.md docs/project/architecture.md
   cp docs/framework/templates/database_tpl.md docs/project/database.md
   cp docs/framework/templates/credentials_tpl.md docs/project/credentials.example.md
   cp docs/framework/templates/dependencies_tpl.md docs/project/dependencies.md
   cp docs/framework/templates/status_tpl.md docs/project/status.md
   ```
3. Configurar los archivos de reglas del agente:
   - Crear o actualizar `GEMINI.md` y `.agents/rules/session_bootstrap.md` con las directivas de inicio de sesión descritas en `SESSION_PROTOCOL.md`.
