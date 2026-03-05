# Architecture: Database Abstraction Layer

This document explains how the dual-database support is implemented.

---

## Overview

The app uses an abstraction layer (`db-client.ts`) that provides a unified interface regardless of which database is in use. This allows seamless switching between PostgreSQL and SQLite without changing endpoint code.

## Flow Diagram

```
API Endpoint
    ↓
┌─────────────────────┐
│ db-client.ts        │ (Abstraction Layer)
│ dbClient.getXxx()   │
└──────────┬──────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
PostgreSQL      SQLite
(Prisma)        (better-sqlite3)
    ↓             ↓
┌─────────────────────┐
│  Remote Database    │
└─────────────────────┘
```

---

## Key Components

### 1. `app/api/db-client.ts`

The abstraction layer that exports `dbClient` object with unified methods:

```typescript
dbClient.getContacts()           // Get all contacts
dbClient.getContactById(id)      // Get single contact
dbClient.createContact(data)     // Create contact
dbClient.testConnection()        // Test DB connection
```

Each method internally checks `DATABASE_MODE` environment variable and routes to the appropriate implementation.

### 2. Environment Variable: `DATABASE_MODE`

Set in `.env`:
```dotenv
DATABASE_MODE=postgres  # or 'sqlite'
```

The `dbClient` reads this at **runtime** to determine which database operations to use.

### 3. PostgreSQL Implementation

- Uses **Prisma Client** (`@prisma/client`)
- Connects to remote Render Postgres via `DATABASE_URL`
- Schema defined in `prisma/schema.prisma`
- Seed data in `prisma/seed.ts`

### 4. SQLite Implementation

- Uses **better-sqlite3** (synchronous SQLite3 for Node.js)
- Local file database: `data/contacts.db`
- Schema defined/initialized via `scripts/init-sqlite.mjs`
- Seed data via `npm run sqlite:seed`

---

## API Endpoints (All Use `dbClient`)

Each endpoint imports and uses the abstraction layer:

```typescript
import { dbClient } from './db-client';

export async function GET(request: Request) {
  const data = await dbClient.getContacts();
  // ... returns same response regardless of DB mode
}
```

### Files:
- `app/api/contacts+api.ts` - List & create contacts
- `app/api/contacts/[id]+api.ts` - Get single contact
- `app/api/test-db+api.ts` - Test database

---

## Database Switching at Runtime

No re-compilation needed. Simply:

1. Change `DATABASE_MODE` in `.env`
2. Restart the dev server
3. API endpoints automatically use the new database

This is possible because:
- The mode is read from environment variables (not compile-time constants)
- Each database adapter is loaded dynamically based on the mode
- Response format is identical between both implementations

---

## Schema Consistency

Both databases use the same data model:

```
Contact
├── contact_id (STRING PRIMARY KEY)
├── first_name (STRING)
├── middle_name (STRING NULL)
├── surname (STRING)
├── status_id (STRING FOREIGN KEY)
└── relations:
    ├── MaritalStatus
    └── NationalIdentityCard

MaritalStatus
├── status_id (STRING PRIMARY KEY)
└── marital_status (STRING)

NationalIdentityCard
├── id (INT PRIMARY KEY)
├── contact_id (STRING UNIQUE FOREIGN KEY)
├── doc_type (STRING)
└── card_number (STRING)
```

---

## Adding New Features

When adding a new feature that needs database access:

1. **Add to `dbClient`** in `app/api/db-client.ts`:
   ```typescript
   async myNewFeature(params: T) {
     if (DATABASE_MODE === 'sqlite') {
       return mySqliteImpl(params);
     }
     return myPostgresImpl(params);
   }
   ```

2. **Implement PostgreSQL version** using Prisma

3. **Implement SQLite version** using better-sqlite3

4. **Update API endpoint** to use `dbClient.myNewFeature()`

---

## Performance Considerations

- **PostgreSQL**: Network latency, handled by Render infrastructure
- **SQLite**: Local disk I/O, very fast for single-user development
- Both are sufficient for this app's use case

---

## Testing

Test your implementation against both databases:

```bash
# Test PostgreSQL
DATABASE_MODE=postgres npm start

# Test SQLite
DATABASE_MODE=sqlite npm start
```

Both should behave identically from the API perspective.
