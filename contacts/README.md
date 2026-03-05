# Contacts App

This Expo/Next project manages contacts with **dual database support**:
- **PostgreSQL** (remote Render) for production
- **SQLite** (local file) for offline/local development

---

## Database Mode Setup

Switch between databases by setting `DATABASE_MODE` in your `.env` file:

### Mode 1: PostgreSQL (Default)

Set in `.env`:
```dotenv
DATABASE_MODE=postgres
DATABASE_URL=postgresql://user:pass@host:5432/database
```

**Setup:**
```bash
npm install
npm run prisma:generate
npx prisma db push
npm run prisma:seed
```

### Mode 2: SQLite (Local)

Set in `.env`:
```dotenv
DATABASE_MODE=sqlite
```

**Setup:**
```bash
npm install
npm run sqlite:seed
```

The SQLite database will be created at `data/contacts.db`.

---

## API Routes

All API endpoints automatically use the configured database mode:
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Create a new contact
- `GET /api/contacts/[id]` - Get contact details
- `GET /api/test-db` - Test database connection

---

## Development

The `db-client.ts` file provides a unified interface that automatically selects the database based on `DATABASE_MODE`:
- `dbClient.getContacts()`
- `dbClient.getContactById(id)`
- `dbClient.createContact(data)`
- `dbClient.testConnection()`

---

## Notes

- **PostgreSQL** requires internet connection and is managed externally
- **SQLite** is fully local and offline-capable
- Data is NOT shared between modes
- `data/` directory should be in `.gitignore`