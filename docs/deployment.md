# Despliegue en producción (Dokploy)

Registro de la instalación en producción de DominIA Agentes para Soniquete con Arte.

## Datos de la instalación

- **Dirección pública de la app:** `https://crm.soniqueteconarte.jigretera.com`
- **Servidor:** Servidor propio (DGX Spark / Ubuntu 24.04 LTS arm64) en red local `192.168.1.17`.
- **Panel de control:** Dokploy (en modo Docker Swarm) en el puerto `3000`.
- **Servicio en Dokploy:** `soniquete-con-arte` (tipo Application, repositorio `jigomez-gr/omnicanal`, rama `main`, compilado con `Dockerfile`).
- **Comprobación de salud:** `https://crm.soniqueteconarte.jigretera.com/api/health` (responde `status: ok`, latencia de base de datos de 1 ms).

## Base de datos

- **Motor:** PostgreSQL 16.15 (paquetes oficiales PGDG de Ubuntu).
- **Ubicación:** Directamente en el sistema operativo del servidor (puerto `5433`).
- **Nombre de la base de datos:** `omnicanal`.
- **Extensiones instaladas:**
  - `vector`: versión 0.8.7 (soporte nativo para `halfvec(1536)` para la IA y búsqueda híbrida).
  - `unaccent`: para búsqueda de texto sin acentos en español.
- **Tablas:** 64 tablas creadas, todas con Row Level Security activado.
- **Migraciones:** 10 migraciones aplicadas y registradas en `drizzle.__drizzle_migrations`.

## Almacenamiento de archivos (File System)

- **Tipo:** Disco local (sin servicios externos como Supabase).
- **Ruta en el contenedor:** `/app/data/uploads`
- **Ruta en el host:** `/var/lib/dokploy/omnicanal/uploads` (permisos asignados al usuario node 1000:1000).

## Tareas en segundo plano

- Programación cada minuto en Dokploy (pestaña Schedules) llamando a `/api/cron/tick` para procesar mensajes entrantes, respuestas de la IA y envíos programados.

## Cómo publicar una versión nueva en el futuro

1. Realizar los cambios en la rama `main` y verificar que las pruebas pasen en local (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`).
2. Si el cambio incluye migraciones de base de datos, aplicarlas antes de desplegar desde la terminal:
   ```powershell
   $env:DATABASE_URL="postgresql://postgres:<CONTRASEÑA>@192.168.1.17:5433/omnicanal?sslmode=disable"
   pnpm db:migrate
   ```
3. Subir los cambios a GitHub (`git push origin main`).
4. En Dokploy, entrar en la aplicación `soniquete-con-arte`, pestaña **Deployments**, y pulsar **Redeploy**.
5. Comprobar que `https://crm.soniqueteconarte.jigretera.com/api/health` responda `status: ok` y la versión actualizada.
