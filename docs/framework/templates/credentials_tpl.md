# Catálogo de Credenciales y Variables de Entorno

> [!CAUTION]
> **REGLA DE SEGURIDAD ABSOLUTA**: Este documento y cualquier archivo versionado en el repositorio **NUNCA DEBEN CONTENER SECRETOS REALES**, contraseñas de producción, tokens privados ni llaves criptográficas. Solo debe registrar la estructura de variables y valores de ejemplo seguros.

---

## 1. Variables de Entorno Requeridas (.env.example)

| Variable | Tipo | Requerido | Valor por Defecto / Ejemplo Local | Descripción y Alcance |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` / `ENV` | String | Sí | `development` | Entorno de ejecución (`development`, `test`, `production`) |
| `PORT` | Integer | No | `3000` | Puerto en el que escucha el servicio |
| `DATABASE_URL` | String | Sí | `postgresql://user:pass@localhost:5432/db_dev` | Cadena de conexión al motor de base de datos |
| `JWT_SECRET` | String | Sí | `example_insecure_secret_for_local_dev_only` | Clave simétrica para firma y verificación de tokens |
| `API_KEY_EXTERNAL` | String | No | `test_key_abc123` | Credencial para el proveedor de servicios externos |

---

## 2. Gestión de Secretos por Entorno

- **Desarrollo Local**: Copiar `.env.example` a `.env` (ignorado por Git). Los valores locales deben ser específicos para contenedores Docker o bases de datos locales.
- **Entorno de Pruebas (CI/CD)**: Variables inyectadas mediante el gestor de secretos de la plataforma (GitHub Secrets, GitLab CI Variables, etc.) usando credenciales efímeras.
- **Entorno de Producción**: Gestionado mediante un almacén seguro de secretos (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Kubernetes Secrets).
