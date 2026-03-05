# API Testing Examples

This file contains curl examples to test the API endpoints with both database modes.

## Starting the Server

```bash
npm start
```

The server will be available at: `http://localhost:8081`

---

## Test Database Connection

### PostgreSQL
```bash
curl http://localhost:8081/api/test-db
```

### SQLite
Same endpoint—it auto-detects from `DATABASE_MODE` in `.env`

Expected response:
```json
{
  "success": true,
  "message": "Connected to PostgreSQL successfully!" 
}
```

---

## Get All Contacts

```bash
curl http://localhost:8081/api/contacts
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "contact_id": "c00000001",
      "first_name": "Alice",
      "middle_name": null,
      "surname": "Smith",
      "marital_status": "Single",
      "doc_type": "ID",
      "card_number": "ABC123456"
    },
    {
      "contact_id": "c00000002",
      "first_name": "Bob",
      "middle_name": null,
      "surname": "Jones",
      "marital_status": "Married",
      "doc_type": null,
      "card_number": null
    }
  ]
}
```

---

## Create a New Contact

```bash
curl -X POST http://localhost:8081/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Charlie",
    "surname": "Brown"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "contact_id": "cXYZ12AB34",
    "first_name": "Charlie",
    "surname": "Brown"
  }
}
```

---

## Get Single Contact

```bash
curl http://localhost:8081/api/contacts/c00000001
```

Expected response:
```json
{
  "success": true,
  "data": {
    "contact_id": "c00000001",
    "first_name": "Alice",
    "surname": "Smith",
    "status_id": "single",
    "middle_name": null
  }
}
```

---

## Switching Database Modes

1. Edit `.env`:
   ```dotenv
   DATABASE_MODE=sqlite  # or 'postgres'
   ```

2. Restart your dev server:
   ```bash
   npm start
   ```

3. The same API endpoints will now use your selected database

---

## Notes

- **PostgreSQL**: Data persists on the remote Render server
- **SQLite**: Data is stored in `./data/contacts.db` (local, ignored by git)
- Both modes return identical API responses
- Create a new contact a few times to see the auto-increment `contact_id`
