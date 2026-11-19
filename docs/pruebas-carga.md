# Prueba de carga con 5.000 productos

Ejecutada el 19 de noviembre de 2026, en el entorno local de revisión.

## Resultado

Se añadieron **5.000 productos sintéticos**, conservando el producto original. La base de revisión contiene **5.001 productos**. Las consultas, filtros y paginación se comprobaron por HTTP y desde Angular en escritorio y móvil.

Durante las etapas de carga se completaron **6.605 consultas correctas, sin errores**, en 32,36 segundos medidos. Es una prueba local escalonada, no una certificación de capacidad de producción ni una prueba prolongada de estabilidad.

## Rendimiento observado

| Clientes concurrentes | Consultas correctas | Consultas por segundo | Latencia p95 | Errores |
| --- | --- | --- | --- | --- |
| 1 | 978 | 122.22 | 13.01 ms | 0 |
| 10 | 1858 | 231.41 | 81.08 ms | 0 |
| 30 | 1872 | 229.89 | 255.52 ms | 0 |
| 60 | 1897 | 231.58 | 516.77 ms | 0 |

p95 significa que el 95% de las consultas medidas terminó en ese tiempo o menos. La latencia incluye la respuesta HTTP completa y su validación en el generador. Se usó una mezcla de listado general, primera/última página, categoría exacta, búsquedas y búsquedas sin resultados; cada nivel duró aproximadamente 8 segundos, tras calentamiento.

Con 10 clientes el caudal ya rondaba230 consultas/s. Aumentar a 30/60 añadió latencia sin aumentar de forma sostenida ese caudal. Esto muestra una zona de saturación para esta mezcla y esta máquina; no justifica extrapolar usuarios reales o rendimiento cloud. No se fijó un SLA de producción.

## Consultas y experiencia de usuario

Se comprobaron 21 casos funcionales: metadatos del servidor, tamaño 20/100, primera página, última página y fuera de rango, categorías exactas, búsqueda sin distinguir mayúsculas, filtros combinados, ausencia de resultados, caracteres de regex tratados como texto y los cinco campos de orden en ambos sentidos. También se recorrieron las 50 páginas de 100 productos: aparecieron exactamente 5.000 identificadores únicos, sin duplicados entre páginas.

En 1440x1000 y 390x844 se verificaron login, búsqueda de los 5.000 productos, 20 filas visibles por página, navegación y una categoría de 500 coincidencias. No se observaron errores JavaScript ni desbordamiento horizontal del documento. Son comprobaciones funcionales; las duraciones del recorrido no son métricas LCP/INP ni una auditoría de accesibilidad.

## Qué muestran los índices

- **Global newest**: 100 filas devueltas, 100 documentos y 100 claves examinados en la lectura; el conteo examinó 5001 documentos y 0 claves. Índices de lectura: createdAt_-1__id_-1.
- **Exact category and price**: 100 filas devueltas, 100 documentos y 100 claves examinados en la lectura; el conteo examinó 0 documentos y 500 claves. Índices de lectura: category_1_priceMinor_1__id_1.
- **Substring search**: 100 filas devueltas, 102 documentos y 102 claves examinados en la lectura; el conteo examinó 0 documentos y 5001 claves. Índices de lectura: createdAt_-1__id_-1.
- **Last page with search**: 100 filas devueltas, 100 documentos y 5000 claves examinados en la lectura; el conteo examinó 0 documentos y 5001 claves. Índices de lectura: name_1__id_1.

La categoría exacta aprovecha el índice compuesto. En cambio, contar toda la colección, la búsqueda de subcadenas y un offset profundo siguen recorriendo miles de documentos o claves. Con un catálogo mayor convendría perfilar esas consultas antes de decidir entre optimizar conteos, búsqueda especializada o paginación por cursor. No se cambió el código de negocio durante esta prueba.

## Recursos muestreados

| Servicio de prueba | Pico CPU observado | Pico de memoria observado |
| --- | --- | --- |
| api | 82.19% | 271.50 MiB |
| web | 12.90% | 11.09 MiB |
| mongo | 675.05% | 366.80 MiB |

Docker disponía de 8 CPU lógicas y 7.65 GiB. En Docker, 100% de CPU equivale aproximadamente a un núcleo: el pico de Mongo no es un porcentaje del total de la máquina. Los valores son máximos observados por muestreo, no una medición continua ni evidencia de fugas de memoria. Mongo concentró la mayor carga computacional observada; no se realizó un perfilador causal de CPU.

## Límites de solicitudes y aislamiento

Las mediciones de capacidad se ejecutaron en una API y un NGINX temporales, con las mismas imágenes y la misma base de 5.001 productos. Solo en esa API temporal se redujo RATE_WINDOW_MS a 1 ms para evitar que el límite de 100 consultas/minuto ocultara la capacidad de consulta. JWT, validaciones y auditoría de solicitudes siguieron activos. La API normal del puerto8080 no cambió su configuración.

Después se recreó la API temporal con la ventana normal de 60 s y un contador nuevo: una ráfaga de 130 consultas produjo **100 respuestas200 y30 respuestas429**, todas las rechazadas con Retry-After. El bloqueo es la protección esperada y no un fallo de Mongo.

El generador, los contenedores y Chrome compartieron el mismo equipo, con cachés calientes y sin límites de recursos equivalentes a un servidor de producción. No se midieron 5.000 creaciones HTTP: la preparación se hizo con insertMany de Mongoose y las reglas de su schema. La prueba mide lecturas y filtros bajo concurrencia. Los máximos no se buscaron hasta provocar una caída; no es una prueba de resistencia de horas.

El script se ajustó durante la preparación para leer correctamente el plan de conteo y cerrar el muestreo Docker. La tabla anterior corresponde a la última ejecución completa; los intentos de diagnóstico no se mezclan con esos resultados. No hubo errores HTTP en las etapas de consulta de esos intentos previos.

## Revisar y repetir

La aplicación sigue disponible en http://localhost:8080/catalog. Los productos de carga se reconocen por el prefijo **Carga5000 3764545e** y sus categorías. El hash de los datos originales coincidió antes y después; no se alteró el producto existente. Los contenedores temporales se retiraron al terminar.

```sh
# Repetir usando los mismos 5.000 productos, sin duplicarlos:
node scripts/stress-products.mjs
# Eliminar únicamente los productos sintéticos de esta prueba:
node scripts/stress-products.mjs --cleanup
```

Requiere Node/pnpm, dependencias instaladas con `pnpm install --frozen-lockfile`, Docker activo y Chromium de Playwright o Chrome instalado (también admite PLAYWRIGHT_CHROMIUM_EXECUTABLE). El puerto temporal 18080 debe estar libre. Las credenciales se leen de `.env.docker` y no se escriben en el resultado. La marca de propiedad para reutilizar/retirar los datos se guarda en un archivo local ignorado de pruebas; no forma parte del entregable ni de un sistema de tracking.

El JSON adjunto `docs/pruebas-carga.json` conserva los resultados de esta ejecución, incluidos p50/p99, casos, planes resumidos y condiciones. Si se repite la prueba se actualiza ese JSON; esta explicación resume la ejecución revisada.
