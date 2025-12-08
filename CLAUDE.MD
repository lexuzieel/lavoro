# Lavoro - Queue Library for Node.js

## Project Overview

Lavoro (Italian for "work") is a type-safe, flexible queue library for Node.js with support for multiple drivers. It provides a fluent API for job dispatching and scheduling with TypeScript support.

**Version:** 0.2.3
**License:** MIT
**Repository:** https://github.com/lexuzieel/lavoro

## Core Concepts

### Architecture

- **Queue System**: Manages job dispatching, processing, and lifecycle
- **Schedule System**: Handles recurring tasks with cron-like syntax
- **Driver Abstraction**: Pluggable backends (PostgreSQL, Memory)
- **Type Safety**: Full TypeScript support with type-safe queue names and payloads

### Key Components

1. **Queue** (`src/queue/queue.ts`)
   - Main entry point for job dispatching
   - Manages connections and drivers
   - Provides fluent API for job configuration

2. **Job** (`src/queue/contracts/job.ts`)
   - Base class for job handlers
   - Defines job payload types
   - Handles job execution logic

3. **QueueDriver** (`src/queue/contracts/queue_driver.ts`)
   - Abstract interface for queue backends
   - Implementations: PostgresQueueDriver, MemoryQueueDriver

4. **Schedule** (`src/schedule/schedule.ts`)
   - Manages recurring job execution
   - Cron-based scheduling
   - Uses `croner` for scheduling and `@verrou/core` for locking

## Project Structure

```
lavoro/
├── src/
│   ├── queue/          # Queue system
│   │   ├── contracts/  # Interfaces and base classes
│   │   ├── drivers/    # Queue driver implementations
│   │   ├── queue.ts    # Main Queue class
│   │   └── types.ts    # Type definitions
│   ├── schedule/       # Scheduling system
│   │   ├── schedule.ts
│   │   └── schedule_registry.ts
│   ├── logger.ts       # Pino logger wrapper
│   └── index.ts        # Public API exports
├── tests/
│   ├── functional/     # Integration tests
│   ├── unit/           # Unit tests
│   └── helpers/        # Test utilities
└── build/              # Compiled output (gitignored)
```

## Technology Stack

- **Language**: TypeScript (ES modules)
- **Runtime**: Node.js
- **Key Dependencies**:
  - `pg-boss`: PostgreSQL queue backend
  - `knex`: SQL query builder
  - `pino`: Structured logging
  - `croner`: Cron scheduling
  - `@verrou/core`: Distributed locking
- **Development**:
  - `vitest`: Testing framework
  - `tsup`: Build tool
  - `testcontainers`: Integration testing with Docker

## Development Workflow

### Commands

```bash
npm run check          # Type check without emitting
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run build          # Build for production
npm run watch          # Build in watch mode
```

### Import Aliases

The project uses TypeScript import aliases (defined in package.json):

- `#services/*` → `./src/services/*.js`
- `#providers/*` → `./src/providers/*.js`
- `#tests/*` → `./tests/*.js`
- `#config/*` → `./src/config/*.js`

### Testing

- Uses Vitest for unit and integration tests
- PostgreSQL tests use Testcontainers for isolated environments
- Test configuration in `vitest.config.ts`
- Environment variables in `.env.test`

## Code Conventions

### TypeScript

- Strict mode enabled
- ES module format (`.js` extensions in imports)
- Extends `@adonisjs/tsconfig`
- Type exports prefixed with `type` keyword

### Naming

- PascalCase for classes (Job, Queue, Schedule)
- camelCase for functions and variables
- SCREAMING_SNAKE_CASE for constants
- Descriptive names reflecting purpose

### Error Handling

- Errors should be properly typed
- Use try-catch blocks for async operations
- Log errors using the integrated logger

### Logging

- Uses Pino logger (`src/logger.ts`)
- Structured logging with context
- Available via `Logger` export

## Queue Drivers

### PostgreSQL Driver (`src/queue/drivers/postgres.ts`)

- Backed by `pg-boss`
- Requires PostgreSQL database
- Supports distributed processing
- Handles job retries and failures

### Memory Driver (`src/queue/drivers/memory.ts`)

- In-memory queue for testing/development
- No external dependencies
- Data lost on restart
- Not suitable for production

## API Design

### Fluent API Pattern

Jobs are dispatched using a fluent interface:

```typescript
await queue.dispatch(new MyJob(payload))
  .onQueue('high-priority')
  .delay(1000)
  .retry(3)
```

### Type Safety

Queue names and payloads are type-checked at compile time using TypeScript generics and mapped types.

## Git Workflow

- Main branch: (not specified, typically `main` or `master`)
- Feature branches: Use descriptive names
- Commit messages: Follow conventional commits
- Version bumping: Use `bump-version.sh` script
- Post-version: Automatically pushes tags

## CI/CD

- GitHub Actions workflows in `.github/`
- Code coverage reporting to Codecov
- Pre-publish checks: type check + tests + build

## Documentation

- README.md: Basic project info
- CHANGELOG.md: Version history following Keep a Changelog
- This file (CLAUDE.MD): Project context for AI assistance

## Notes for Claude

- When modifying queue logic, consider impact on both drivers
- Schedule changes may affect cron parsing and job execution timing
- Always run tests after changes to queue/schedule core
- Check type safety when modifying contracts/interfaces
- Follow existing patterns for consistency
- Imports use `.js` extension even for `.ts` files (ES module requirement)
