# Ejecutar y revisar con Docker

Requisitos: Docker Desktop/Engine activo y Compose v2. Las imágenes se compilan sin instalar Node o Mongo en el host. Python3 solo genera la configuración privada.

```sh
python3 scripts/setup-docker-review.py
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d --wait
docker compose --env-file .env.docker run --rm seed
```

Abra http://localhost:8080/catalog. El email predeterminado es review@example.test y la contraseña aleatoria está en `.env.docker`. Ese archivo local no está incluido en el ZIP ni en Git; se crea con permisos0600 y no se sobrescribe. El seed es idempotente: editar la contraseña en el archivo no cambia la de un usuario ya existente.

## Configuración

| Variable | Uso |
| --- | --- |
| WEB_PORT | Puerto publicado en127.0.0.1; predeterminado8080 |
| DEMO_USER_EMAIL | Identidad para el seed de revisión |
| DEMO_USER_PASSWORD | Contraseña local de12..128 caracteres |
| JWT_SECRET | Secreto aleatorio, mínimo32 bytes |

La plantilla pública es `.env.docker.example`; contiene marcadores, no credenciales. Para cambiar puerto, edite WEB_PORT y recree api/web: `docker compose --env-file .env.docker up -d --force-recreate --wait api web`. Los orígenes CORS del compose siguen ese puerto. Use localhost o127.0.0.1 consistentemente para las cookies.

## Rutas y disponibilidad

NGINX sirve el build de Angular y conserva /catalog y /login al recargar. /auth, /products y /docs se envían sin prefijo adicional a la API; se conservan Origin, Cookie, Authorization y el header CSRF. /healthz verifica NGINX; /api-healthz verifica API y Mongo con un ping acotado, devuelve200 o503 sin detalles internos. API3000/Mongo27017 no se publican en el host.

## Operación y datos

```sh
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=100 api web mongo
docker compose --env-file .env.docker restart
# Detener sin borrar la base:
docker compose --env-file .env.docker down
# Volver a iniciar:
docker compose --env-file .env.docker up -d --wait
```

El volumen products-review_mongo-data conserva datos tras restart/down/up. No usar `down -v` salvo que se quiera borrar deliberadamente la base. No se monta el código fuente ni se toca la base Mongo nativa de desarrollo. La aplicación queda activa mientras Docker esté ejecutándose; restart unless-stopped no inicia Docker Desktop tras apagar el equipo.

## Pruebas

`node scripts/docker-smoke.mjs` comprueba13 condiciones, incluida persistencia tras reinicio y recuperación de una caída de Mongo. Interrumpe brevemente el stack: usar fuera de una revisión activa. `node scripts/docker-browser.mjs` ejecuta los dos recorridos Playwright existentes; requiere Node/pnpm en el host y Chromium/Chrome compatible. Las credenciales se leen del archivo privado y no se pasan por argumentos.

## Alcance de seguridad

Es una revisión local por HTTP con API en development y Swagger disponible. La imagen API usa production por defecto; en ese modo siguen exigidos orígenes HTTPS, cookie Secure, Swagger deshabilitado y seed rechazado. No se ha desplegado en cloud. Mongo no tiene autenticación dentro de su red Docker privada; no publicar su puerto ni reutilizar este compose como hosting público. Para producción faltan TLS, secretos gestionados, Mongo autenticado/TLS/backups, provisión de usuarios y política de proxy/rate limit/replicación.

Bases oficiales fijadas por digest, lock reproducible y pnpm11.25. API/web no-root, sin capacidades ni escrituras permanentes fuera de tmpfs. El builder Angular requiere bindings nativos; se probó Linux arm64 sobre macOS arm64, no todas las plataformas. Solo está permitida la instalación revisada de esbuild; no se habilitan scripts de dependencias globalmente.

## Problemas habituales

- Daemon no disponible: abrir Docker Desktop y verificar docker info.
- Variables ausentes: ejecutar el script de preparación. Usar config --quiet; config sin esa opción expande secretos.
-403 al autenticar: comprobar host/puerto exacto y header CSRF; no usar comodines CORS.
-401 tras editar contraseña: el seed conserva usuarios existentes; recuperar la credencial original o administrar la identidad conscientemente.
-429: esperar la ventana de limitación; el rate limit sigue en memoria y detrás del proxy.
- API no saludable: revisar Mongo y el mensaje de arranque saneado. No compartir inspect/environment completos.
