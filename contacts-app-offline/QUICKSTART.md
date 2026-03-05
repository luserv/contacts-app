# Quick Start Guide - Switching Between Database Modes

This app supports two database configurations. Switch between them easily:

## PostgreSQL Mode (Default - Remote)

**For production or testing with remote database:**

1. Ensure `.env` contains:
   ```
   DATABASE_MODE=postgres
   DATABASE_URL=postgresql://user:pass@host:port/database
   ```

2. Start the app:
   ```
   npm start
   ```

## SQLite Mode (Local Development)

**For offline development with a local database:**

1. Set in `.env`:
   ```
   DATABASE_MODE=sqlite
   ```

2. Initialize the database (one-time):
   ```
   npm run sqlite:seed
   ```
   
   This creates `data/contacts.db` with sample data.

3. Start the app:
   ```
   npm start
   ```

## Switching Between Modes

Simply change `DATABASE_MODE` in your `.env` file and restart your dev server. The API endpoints automatically use the configured database.

**Important Notes:**
- Each mode has its own separate database
- Data is NOT shared between PostgreSQL and SQLite
- SQLite data is stored in `data/contacts.db` (ignored by git)
- PostgreSQL keeps data on the remote server

## Testing Your Setup

Test that your database works:
```bash
npm run test:db    # For PostgreSQL mode
node scripts/test-db-client.mjs    # For SQLite mode
```

## File Locations

- **PostgreSQL Config**: `.env` (DATABASE_URL)
- **SQLite Database**: `data/contacts.db`
- **Database Logic**: `app/api/db-client.ts` (handles both modes automatically)
