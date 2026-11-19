# Validación del entregable

La aplicación dispone de pruebas de backend, interfaz y recorridos reales contra Docker. Los comandos permiten repetirlas; no se requiere ni se continúa un sistema de seguimiento de historias, incidencias o consumo.

| Verificación | Resultado disponible | Cómo repetirla |
| --- | --- | --- |
| Backend NestJS, dominio, seguridad e integración con Mongo | 157 pruebas correctas | `pnpm --filter @assessment/api test` |
| Angular, formularios, estado, HTTP y notificaciones | 56 pruebas correctas | `pnpm --filter @assessment/web test` |
| Recorridos completos en navegador | 2 correctos: escritorio y móvil | `node scripts/docker-browser.mjs` |
| Docker: autenticación, CRUD, filtros, persistencia y recuperación | 13 comprobaciones correctas | `node scripts/docker-smoke.mjs` |
| Contrato OpenAPI | Exportación válida y actualizada | `pnpm openapi:check` |

También se validaron tipos, lint, compilación e instalación de las imágenes. Las cifras describen pruebas ejecutadas; no equivalen a cobertura auditada ni garantizan operación en todos los navegadores o en cloud.

Las pruebas API requieren `mongod` nativo para una base temporal aislada. Las de Docker usan exclusivamente la instancia local de revisión y credenciales de `.env.docker`; crean y eliminan productos de prueba. El smoke reinicia contenedores y detiene Mongo brevemente para verificar recuperación: ejecutarlo fuera de una revisión activa. Nunca usar `down -v` como parte rutinaria de la validación.

El último ajuste de presentación se revisó en escritorio y móvil: tabla prioritaria, sin consejos, toast pequeño con cierre manual y expiración a los cuatro segundos. No altera el contrato de paginación del servidor.

Prueba adicional de carga con 5.000 productos: [resultados y límites](pruebas-carga.md). Incluye 21 comprobaciones de consulta, recorrido de las 50 páginas, dos tamaños de navegador y una ráfaga separada para validar el rate limit normal.
