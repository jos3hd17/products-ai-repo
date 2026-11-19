# Guía de la API

Base local desde Docker: `http://localhost:8080`. No hay prefijo `/api`. Swagger está disponible en `/docs/` para la revisión local; el contrato exportado es `docs/api/openapi.json`. Se genera desde los controladores y se valida contra respuestas HTTP reales.

## Autenticación

`POST /auth/login` recibe email y password; devuelve accessToken, tokenType y expiresIn. `GET /auth/me` consulta el usuario autenticado. `POST /auth/refresh` rota la cookie de sesión. `POST /auth/logout` revoca la capacidad de renovar y borra la cookie.

Login, refresh y logout requieren `Origin` permitido y `X-CSRF-Protection: 1`. El navegador gestiona la cookie HttpOnly en `/auth`, SameSite=Lax en revisión local; en producción se exige HTTPS y Secure. Angular conserva el access token solo en memoria y coordina una renovación por instancia, con un solo reintento. No se guardan tokens en NgRx ni almacenamiento del navegador.

Todos los endpoints de productos y `/auth/me` requieren `Authorization: Bearer <accessToken>`. En Swagger, autentíquese con el usuario local y use el token recibido en Authorize. Las credenciales y tokens reales nunca deben copiarse a documentación o commits.

## Productos

| Método | Ruta | Resultado |
| --- | --- | --- |
| POST | /products | Crea producto, 201 |
| GET | /products | Lista filtrada y paginada, 200 |
| GET | /products/:id | Consulta producto, 200 |
| PATCH | /products/:id | Modifica campos enviados, 200 |
| DELETE | /products/:id | Elimina producto, 204 |

Campos: name obligatorio, description/category opcionales, priceMinor entero seguro no negativo y stock entero no negativo. priceMinor usa dos decimales: 1599 representa 15,99. No se implementa conversión de moneda. Se rechazan campos desconocidos, null no permitido, identificadores inválidos y PATCH vacío.

## Paginación y filtros desde MongoDB

Ejemplo: `/products?page=2&pageSize=10&category=Semillas&sortBy=priceMinor&sortDirection=asc`.

La respuesta contiene `items`, `itemCount`, `total`, `page`, `pageSize`, `totalPages` y `filters`. total cuenta todos los registros coincidentes; itemCount cuenta los recibidos en esa página. totalPages es ceil(total/pageSize), con cero para una colección vacía. Una página fuera del rango puede devolver items vacío sin cambiar el número solicitado.

page admite1..10000; pageSize1..100 (por defecto1 y20, respectivamente). search busca una subcadena literal del nombre sin distinguir mayúsculas; category es coincidencia exacta normalizada. Los campos permitidos para ordenar son name, priceMinor, stock, createdAt y updatedAt, con asc/desc; por defecto createdAt descendente. _id desempata de forma estable. filters devuelve search/category normalizados (null si no se enviaron) y el orden efectivo.

El repositorio ejecuta countDocuments y find/sort/skip/limit. Los índices compuestos cubren cada orden y su combinación con category. La búsqueda de subcadenas y offsets altos pueden recorrer datos; no se afirma una mejora de rendimiento medida. Conteo y lista no son una instantánea transaccional bajo escrituras concurrentes.

## Errores y seguridad

Respuestas con statusCode, code, message y correlationId; errores inesperados no exponen el proveedor ni una pila.401 corresponde a autenticación inválida,403 a controles de origen/CSRF,404 a recurso inexistente,400 a entradas inválidas y429 a límites de frecuencia. Login5 y refresh20 por60s por IP/handler, configurables; contadores por proceso. Tras logout el access token ya emitido sigue válido hasta su expiración.

Documentación interactiva siempre deshabilitada en producción; habilitarla explícitamente en ese modo se rechaza. `/healthz` es disponibilidad operativa de API/Mongo, separado del contrato de negocio y de los guards. NGINX lo publica como `/api-healthz`.

Para mantener el contrato: `pnpm openapi:export` y `pnpm openapi:check`. El exportador no abre un servidor ni requiere acceso a Mongo o credenciales.
