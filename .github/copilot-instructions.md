# HRFlow Backend — Project Guidelines

## Project Overview

NestJS 11 HR management backend with **in-memory data store** (no database). Intended as a training/demo project. Data resets on every server restart; seed data is loaded on start when `SEED_ON_START=true`.

Three user roles: `hr_admin`, `manager`, `employee`. All routes require JWT by default (global `JwtAuthGuard`); use `@Public()` to opt out.

## Build & Test

```bash
pnpm install          # Install dependencies
pnpm run start:dev    # Development (watch mode)
pnpm run build        # Compile TypeScript → dist/
pnpm run start:prod   # Run compiled output
pnpm run test         # Unit tests (Jest)
pnpm run test:e2e     # End-to-end tests
pnpm run test:cov     # Test coverage
pnpm run lint         # ESLint
```

## Architecture

Feature-based NestJS modules under `src/modules/`:

| Module | Responsibility |
|---|---|
| `auth` | JWT login, register, forgot/reset password |
| `employees` | Employee CRUD; hr_admin only for write ops |
| `departments` | Department CRUD |
| `leave-types` | Leave type definitions |
| `leave-policies` | Leave policy rules |
| `leave-balance` | Per-employee leave balance tracking |
| `leave-requests` | Leave request lifecycle (submit → approve/reject) |
| `calendar` | Public holidays and calendar events |
| `reports` | Reporting and analytics |

**Infrastructure:**
- `src/store/in-memory.store.ts` — singleton `InMemoryStore` (injectable); all data lives here as plain arrays. Use `store.generateId()` (UUID v4) and `store.now()` (ISO timestamp) for new records.
- `src/seed/` — seeds `InMemoryStore` on startup
- `src/shared/` — global guards, decorators, interceptors, filters, interfaces

**Global providers (registered in `AppModule`):**
- `JwtAuthGuard` via `APP_GUARD` — protects all routes
- `RolesGuard` via `APP_GUARD` — enforces `@Roles()`
- `ResponseTransformInterceptor` via `APP_INTERCEPTOR` — wraps every response as `{ success: true, data: ..., timestamp: "..." }`
- `HttpExceptionFilter` via `APP_FILTER`

## Conventions

### Data Access
- Inject `InMemoryStore` directly into services. Mutate arrays in place.
- No ORM, no raw SQL. Example:
  ```typescript
  this.store.employees.push(newEmployee);
  const found = this.store.employees.find(e => e.id === id);
  ```
- Always use `store.generateId()` for new record IDs.

### DTOs
- Use `class-validator` decorators (`@IsString()`, `@IsEmail()`, `@IsUUID()`, `@IsOptional()`, etc.)
- Use `@ApiProperty()` / `@ApiPropertyOptional()` for Swagger docs on every DTO field.
- File naming: `create-<resource>.dto.ts`, `update-<resource>.dto.ts`

### Controllers
- Decorate with `@ApiTags()`, `@ApiBearerAuth()`, and `@ApiOperation()` for Swagger.
- Use `@UseGuards(RolesGuard)` + `@Roles('hr_admin')` for role-restricted endpoints.
- Use `@CurrentUser()` to access the authenticated user in route handlers.
- Delegate all logic to the service; controllers only handle HTTP concerns.

### Services
- Throw NestJS exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`) — they are caught by the global filter.
- Hash passwords with `bcryptjs` (already a dependency).

### Auth
- JWT payload shape: `{ sub: string, email: string, role: string }`
- Bypass auth with `@Public()` decorator (e.g., login, register routes).

### Interfaces
- Shared data-shape interfaces live in `src/shared/interfaces/`. Add new ones here.

### File & Class Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Services/controllers/modules follow the pattern `<Resource>Service`, `<Resource>Controller`, `<Resource>Module`
