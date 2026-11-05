# Tablero Central de Estado y Control del Proyecto

> [!IMPORTANT]
> **SINGLE SOURCE OF TRUTH**: Este archivo es el primer punto de lectura obligatorio para el agente al iniciar cada sesión. Debe mantenerse actualizado tras cada avance o cambio de fase.

---

## 1. Información General del Proyecto
- **Nombre del Proyecto**: [NOMBRE_PROYECTO]
- **Fase Actual**: [Incepción / Arquitectura Base / Desarrollo Activo / Mantenimiento]
- **Última Actualización**: [YYYY-MM-DD HH:mm]
- **Próximo Hito (Milestone)**: [Descripción del siguiente release o entregable]

---

## 2. Feature en Progreso (ACTIVE FEATURE)
- **ID & Nombre**: `FEAT-[NUM]` - [Nombre de la Feature]
- **Fase Actual**: [ESPECIFICACIÓN | MATRIZ_PRUEBAS | TDD_UNIT | IMPLEMENTACIÓN | PRUEBAS_INTEGRACIÓN | COMPLETA]
- **Ruta de Especificación**: `docs/project/features/FEAT-[NUM]/spec.md`
- **Ruta de Pruebas**: `docs/project/features/FEAT-[NUM]/tests.md`
- **Tarea Inmediata Siguiente**: [Descripción ultra-específica de lo que debe hacerse a continuación]

---

## 3. Registro de Features (Feature Roadmap & Backlog)

| ID | Nombre de Feature | Prioridad | Pruebas Unitarias | Pruebas Integración | Pruebas Funcionales | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `FEAT-001` | [Setup y Estructura Base] | Alta | [ ] | [ ] | [ ] | PENDING |
| `FEAT-002` | [Autenticación / Core] | Alta | [ ] | [ ] | [ ] | BACKLOG |
| `FEAT-003` | [Gestión de Recursos] | Media | [ ] | [ ] | [ ] | BACKLOG |

---

## 4. Registro de Cambios Recientes (Recent History)
- `YYYY-MM-DD`: [Descripción breve del cambio o feature entregada]
