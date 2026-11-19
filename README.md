# Prueba técnica Full Stack

Gestión de productos con NestJS, MongoDB y Angular. Incluye autenticación JWT, CRUD, paginación y filtros desde el servidor, Swagger y ejecución local con Docker.

## Revisar la aplicación

```sh
python3 scripts/setup-docker-review.py
docker compose --env-file .env.docker up --build -d --wait
docker compose --env-file .env.docker run --rm seed
```

- Aplicación: http://localhost:8080/catalog
- Swagger: http://localhost:8080/docs/
- Usuario de revisión: `review@example.test`.
- Contraseña: generada en el archivo local privado `.env.docker`. No se incluye en la entrega.

Docker debe estar activo. MongoDB conserva los datos en un volumen y no publica su puerto. La configuración es para revisión local por HTTP; no se presenta como un despliegue público de producción. Instrucciones y límites: [Docker](docs/docker.md).

## Respuestas por ejercicio

| Ejercicio | Solución | Dónde revisar |
| --- | --- | --- |
| 1. Backend | NestJS, MongoDB, CRUD, validación, JWT y Swagger | `apps/api/src/modules/` y [guía de API](docs/api/guia.md) |
| 2. Frontend | Angular, NgRx, formularios, tabla, errores y diseño responsive | `apps/web/src/app/` |
| 3. Microservicios | Propuesta para e-commerce agropecuario | [Informe, ejercicio 3](docs/informe.md#ejercicio-3-arquitectura-de-microservicios) |
| 4. Rendimiento web | Cuatro técnicas concretas y cómo verificarlas | [Informe, ejercicio 4](docs/informe.md#ejercicio-4-optimización-de-rendimiento-web) |
| 5. Seguridad y cloud | OAuth/JWT, fuerza bruta, MongoDB y despliegue | [Informe, ejercicio 5](docs/informe.md#ejercicio-5-seguridad-en-apis-y-cloud) |
| Uso de IA | Herramientas, prompts seleccionados, correcciones, tiempos y métricas parciales | [Prompts principales](docs/uso-ia/prompts-principales.md) y [métricas](docs/uso-ia/metricas.json) |

## Archivos para entregar

1. `output/delivery/products-technical-assessment.zip`: código e instrucciones, sin historial Git ni archivos privados.
2. [Respuestas teóricas en PDF](output/pdf/Prueba_Tecnica_FullStack_Respuestas.pdf): únicamente ejercicios3,4 y5, en español. Fuente editable: [docs/informe.md](docs/informe.md).
3. [Explicación del uso de IA en Word](output/documentos/Uso_de_IA.docx): trabajo realizado, decisiones, validación, prompts seleccionados, tiempo documentado y métricas parciales. Fuente: [docs/uso-ia/explicacion.md](docs/uso-ia/explicacion.md).

El README ubica los ejercicios1 y2 en el código; no añade contenido práctico al PDF teórico.

## Estructura

- `apps/api/`: API, dominio, casos de uso, persistencia y pruebas.
- `apps/web/`: interfaz, estado, autenticación y pruebas.
- `deploy/`, `compose.yaml`: servidor web y contenedores.
- `docs/`: respuestas, arquitectura, API, validación y selección de prompts.
- `scripts/`: preparación del entorno y comprobaciones de Docker.
- `output/pdf/` y `output/documentos/`: documentos finales.

La entrega omite historias, issues, manifiestos de contexto y herramientas de seguimiento de tokens. Las métricas de IA son un resumen estático de registros existentes, no un contador activo ni el consumo completo del proyecto. El ZIP se prepara sin historial Git, secretos, dependencias instaladas ni datos de MongoDB.

## Desarrollo y validación

Node compatible con `package.json` y pnpm11.25.0. Para desarrollo sin Docker, configure `apps/api/.env` desde `.env.example`, inicie Mongo y ejecute `pnpm seed:dev`, `pnpm start:dev` y, en otra terminal, `pnpm web:dev`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm openapi:check
```

Resultados y precondiciones de las pruebas: [docs/validacion.md](docs/validacion.md). Arquitectura y decisiones relevantes: [docs/arquitectura.md](docs/arquitectura.md).

## Prueba adicional con 5.000 productos

Se ejecutó una prueba de consultas, filtros, paginación y concurrencia con 5.000 productos sintéticos. Resultados, condiciones y forma de retirar los datos: [docs/pruebas-carga.md](docs/pruebas-carga.md). No cambia las protecciones de la API normal ni las métricas de IA ya cerradas.
