# Prompts principales utilizados

Selección de instrucciones relevantes anteriores al cierre de Docker (19 de noviembre de 2026). Los bloques en inglés son extractos literales; se omiten instrucciones de coordinación y seguimiento. Las explicaciones en español resumen el propósito, no pretenden ser transcripciones completas. No se incluye conversación, contexto interno ni instrucciones posteriores al cierre.

## 1. Aplicación Full Stack

Propósito: construir la gestión de productos con API, interfaz, seguridad y respuestas teóricas. Fuente: PROMPT-005, objetivo de proyecto.

```text
## 2. PROJECT OBJECTIVE

Build a Full Stack Product Management application for a technical assessment.

The assessment requires:

### Backend
- NestJS.
- MongoDB.
- Complete Product CRUD.
- Input validation.
- JWT authentication.
- Swagger documentation.

### Frontend
- Angular.
- Product listing.
- Product creation.
- Product editing.
- Product deletion.
- Pagination.
- State management.
- Responsive design.
- Friendly error handling.

### Theoretical exercises
- Microservices architecture for an agricultural e-commerce platform.
- At least three performance optimization techniques.
- OAuth versus JWT.
- Brute-force prevention.
- MongoDB security.
- Cloud microservices deployment.
```

La misma instrucción fijó las tecnologías de la interfaz. Extracto literal de la sección de Angular:

```text
## Technology

Use:

- Angular Standalone Components.
- TypeScript strict mode.
- Strictly Typed Reactive Forms.
- NgRx Store.
- Angular Router.
- Functional HTTP Interceptors.
- Angular @defer.
- Responsive design.
```

## 2. Arquitectura y CQRS

Propósito: separar responsabilidades y centralizar la conexión a datos sin cambiar los contratos. Fuente: PROMPT-006.

```text
Refactor the NestJS backend following these architectural decisions:

1. Hexagonal Architecture organized by business module.
2. CQRS using `@nestjs/cqrs`.
3. Commands and Queries in the Application layer.
4. Pure domain entities, value objects, business rules and ports in Domain.
5. Controllers, persistence adapters, Mongoose schemas and mappers in Infrastructure.
6. Centralized database configuration through a reusable DatabaseModule.
7. Independent Auth and Products modules.
8. Existing security pipeline must remain operational.
9. Preserve all existing business behavior and endpoint contracts.
10. Document all relevant architectural changes and validation results.
```

## 3. Paginación desde el backend

Propósito: evitar paginación local y devolver conteos, página, productos y filtros. Instrucción literal del usuario (PROMPT-008):

> La paginacion: debe venir del backend. por lo tanto necesitamos que los casos de uso, tengan indices.
> Y desde el frontend, debes obtener toda la informacion de la paginacion/filtros
> asi que en las consultas de productos, debes devolver, numero de items, numero de pagina, items, etc.

## 4. Docker y revisión local

Propósito: completar el empaquetado y dejar una instancia revisable. Instrucción literal del usuario (PROMPT-009):

> ok, dale, una vez termines, sube el docker, y dejalo en un puerto para revisarlo

Se aplicó sobre el plan de Docker del PROMPT-005. Extracto literal de requisitos:

```text
Create independent deployment images for:

1. Backend API.
2. Angular frontend.

Use MongoDB as a separate service, preferably using an appropriate official image for local integration.

Create:

- Backend multi-stage Dockerfile.
- Frontend multi-stage Dockerfile.
- Frontend web server configuration.
- Docker Compose configuration.
- Health checks.
- Environment variable documentation.
- Persistent MongoDB volume.
- Startup and shutdown instructions.
- Deployment troubleshooting guide.
```

## Cómo se controló el resultado

Los prompts orientaron la implementación; las pruebas y la revisión de código determinaron si era correcta. Se corrigieron incompatibilidades de dependencias, una dependencia Express no declarada, la colisión de la ruta de interfaz con la API y el envío de filtros vacíos. La solución final se explica en el informe y se comprueba con las pruebas incluidas.
