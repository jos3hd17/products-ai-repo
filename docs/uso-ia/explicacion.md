# Uso de IA en la prueba técnica

Usé Codex para ayudarme a planificar, desarrollar y revisar la aplicación. También utilicé subagentes para tareas acotadas y algunas revisiones con Codex CLI. Las decisiones se comprobaron con código y pruebas; no di por correcto un resultado solo porque lo generó la IA.

### Qué hice y por qué

- Organización. Dividí el trabajo en backend, documentación, frontend y Docker para avanzar por partes y comprobar cada entrega.

- Backend y arquitectura. La IA ayudó con el CRUD, las validaciones y la autenticación. Separé Auth y Products con puertos, adaptadores y CQRS para distinguir responsabilidades y facilitar pruebas. Los handlers mantienen una integración explícita con Nest.

- Frontend. Usé Angular con formularios tipados y NgRx para filtros y página. La paginación viene del servidor. El precio se guarda como entero en unidades menores para evitar errores de punto flotante.

- Seguridad. El access token queda en memoria y el refresh en una cookie HttpOnly. No los guardé en localStorage ni sessionStorage. La renovación se coordina y solo reintenta una vez para evitar bucles.

- Docker. Preparé imágenes separadas y Mongo con volumen persistente. Así se puede revisar la aplicación en un único puerto local sin montar el código ni exponer la base.

### Prompts principales

Conservé cuatro instrucciones relevantes: construir la aplicación Full Stack; reorganizar el backend con Hexagonal y CQRS; hacer la paginación desde el backend; y completar Docker para revisión local. Los extractos originales están en docs/uso-ia/prompts-principales.md. La selección termina con Docker; no incluye el historial ni el contexto interno.

### Cómo comprobé el resultado

Ejecuté 157 pruebas de backend, 56 de Angular, dos recorridos en navegador y 13 comprobaciones de Docker. Corregí incompatibilidades de dependencias, una dependencia Express no declarada, la colisión de la ruta de la interfaz con la API y el envío de filtros vacíos. También probé 5.000 productos: 6.605 consultas de carga terminaron sin errores, hasta 60 clientes concurrentes. El informe de carga explica las condiciones y sus límites.

### Tiempo y tokens disponibles

Entre el primer commit y el cierre de Docker transcurrieron 19 h 15 min 26 s, del 18 al 19 de noviembre de 2026, hora de Bogotá. Ese intervalo incluye pausas y no mide horas efectivas de trabajo.

Hay 80.647 tokens registrados en cuatro ejecuciones CLI: 79.382 de entrada y 1.265 de salida. De la entrada, 44.800 estaban en caché y ya están incluidos en el subtotal. Esta muestra no cubre toda la conversación ni los subagentes; el total y el coste del proyecto no están disponibles.
