# Respuestas teóricas

## Ejercicio 3 Arquitectura de microservicios

Para una plataforma de e-commerce agropecuario separaría el sistema por responsabilidades: catálogo, inventario, pedidos, pagos, logística e identidad. El catálogo manejaría las fichas y variedades; inventario, los lotes, el stock y los vencimientos; logística, las entregas rurales y la cadena de frío. Cada servicio sería dueño de sus datos.

Usaría HTTP para consultas que necesitan respuesta inmediata y eventos para comunicar cambios, como una reserva de inventario o un pago aprobado. Al comprar, el pedido conserva la cotización, se reserva el stock y se intenta el cobro. Si el pago falla, se libera la reserva. Los cobros y eventos deben soportar reintentos sin duplicar operaciones.

Aplicaría HTTPS, identidades de servicio y permisos mínimos. El gateway sería el punto de entrada, pero cada servicio también comprobaría quién puede acceder a sus recursos. No compartiría credenciales de base de datos entre servicios.

Esta separación permite escalar y aislar fallos, pero añade complejidad: latencia, eventos duplicados y datos que no se actualizan al mismo tiempo. Por eso empezaría con un monolito modular y separaría servicios cuando la escala o los equipos lo justifiquen. Esta es una propuesta; la aplicación entregada sigue siendo un monolito modular.

## Ejercicio 4 Optimización de rendimiento web

### Cargar menos código al inicio

Dividiría la aplicación por rutas y cargaría las funciones secundarias cuando se necesiten. No retrasaría el login ni la tabla principal. Revisaría el tamaño de los archivos y las solicitudes de red en una primera visita desde móvil.

### Reducir datos y peticiones

Usaría paginación y filtros en el servidor para no descargar todos los productos. En el buscador esperaría una pausa breve al escribir y cancelaría consultas anteriores. Mediría los datos transferidos y la latencia con un catálogo representativo; los índices deben revisarse con el plan de consulta.

### Optimizar imágenes y evitar saltos de pantalla

Serviría imágenes comprimidas y del tamaño adecuado, reservando su espacio antes de que carguen. Las imágenes fuera de pantalla pueden cargarse después; la principal no debería esperar. También mantendría estados claros de carga y error, con controles fáciles de usar en pantallas pequeñas.

Compararía los resultados con el mismo dispositivo, red y estado de caché. Revisaría LCP, INP y CLS, además de los recorridos reales. No afirmaría una mejora de velocidad solo porque el código quedó dividido o la pantalla se ve bien.

## Ejercicio 5 Seguridad en APIs y cloud

### OAuth y JWT

OAuth permite delegar acceso a recursos; JWT es un formato para transportar información verificable. Se pueden usar juntos, pero no son equivalentes. Un token de OAuth puede ser un JWT o ser opaco. Para una integración OAuth usaría un flujo de código con PKCE. Un JWT firmado no oculta su contenido: hay que validar firma, algoritmo, emisor, audiencia y expiración.

### Protección contra fuerza bruta

Combinaría límites por IP y cuenta, respuestas de error genéricas, esperas progresivas y monitoreo. Añadiría MFA cuando corresponda. Un bloqueo por cuenta debe tener recuperación para no facilitar que un atacante bloquee a otra persona. Con varias réplicas, los límites deben coordinarse; un contador en memoria solo protege su propio proceso.

### Seguridad de MongoDB

Usaría autenticación, permisos mínimos, red privada, TLS y secretos fuera del código. Mantendría versiones soportadas y copias de respaldo cuya restauración se haya probado. La API debe construir sus filtros a partir de entradas validadas, sin aceptar operadores Mongo del cliente. La base no se expone al navegador y la expiración de las sesiones se comprueba al autorizar, no solo con la limpieza TTL.

### Despliegue en la nube

Elegiría un servicio administrado acorde al proyecto. Prepararía imágenes reproducibles, pruebas en CI, un entorno de staging y un despliegue gradual con rollback. Configuraría HTTPS, secretos gestionados, bases privadas, comprobaciones de disponibilidad y alertas. Kubernetes sería una opción si la operación lo necesita, no un requisito inicial. También cuidaría la compatibilidad de datos y contratos entre versiones; revertir código no deshace un pago.
