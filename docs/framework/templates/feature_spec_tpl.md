# Especificación de Feature: [ID-NOMBRE]

- **ID Feature**: `FEAT-[NUM]` (ej. `FEAT-001`)
- **Nombre**: [Nombre descriptivo]
- **Estado**: [DRAFT | APPROVED | IN_PROGRESS | TESTING | COMPLETED]
- **Fecha de Inicio**: [YYYY-MM-DD]
- **Responsable / Agente**: [Nombre de agente o humano]

---

## 1. Problema y Objetivo de Negocio
- **¿Qué necesidad resuelve?**: [Explicación clara del valor de la feature]
- **¿Quién es el usuario / consumidor?**: [Rol de usuario final, sistema cliente o API]

---

## 2. Alcance (Scope)
### Dentro del Alcance (In Scope)
- [ ] [Requisito 1]
- [ ] [Requisito 2]

### Fuera del Alcance (Out of Scope)
- [Cosas que expresamente no se implementarán en esta feature para evitar scope creep]

---

## 3. Contratos de Datos e Interfaces
### Entrada (Input Payload / Request)
```json
{
  "field_name": "string",
  "limit": 10
}
```

### Salida (Output / Response)
```json
{
  "id": "uuid",
  "status": "success",
  "created_at": "ISO8601"
}
```

---

## 4. Criterios de Aceptación (Gherkin)

### Escenario 1: Flujo Exitoso (Happy Path)
- **Dado que** [el usuario está autenticado y tiene permisos]
- **Cuando** [envía una solicitud con datos válidos]
- **Entonces** [el sistema responde con código 201 y crea el registro en base de datos]

### Escenario 2: Validación Fallida (Bad Request)
- **Dado que** [el payload carece de un campo obligatorio]
- **Cuando** [se procesa la petición]
- **Entonces** [el sistema responde con código 400 y detalla el campo inválido]

### Escenario 3: Manejo de Errores / Casos Límite
- **Dado que** [ocurre un conflicto de duplicidad de clave]
- **Cuando** [se intenta persistir]
- **Entonces** [el sistema retorna código 409 con mensaje explicativo sin exponer detalles internos]
