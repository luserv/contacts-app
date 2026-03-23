/**
 * Inicialización del esquema de base de datos.
 * Acepta cualquier objeto que implemente la interfaz mínima de DB
 * para que funcione tanto con expo-sqlite (native) como con el
 * adaptador IPC de Electron.
 */

interface MinimalDB {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<void>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}

export async function initializeDatabase(db: MinimalDB) {
  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS marital_status (
    status_id TEXT PRIMARY KEY,
    marital_status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact (
    contact_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    surname TEXT NOT NULL,
    birthdate TEXT,
    gender TEXT CHECK(gender IN ('male', 'female')),
    status_id TEXT,
    FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
  );

  CREATE TABLE IF NOT EXISTS contact_phone (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    label TEXT,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
  );

  CREATE TABLE IF NOT EXISTS contact_email (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    email TEXT NOT NULL,
    label TEXT,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
  );

  CREATE TABLE IF NOT EXISTS national_identity_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    card_number TEXT NOT NULL,
    issue_date TEXT,
    expiry_date TEXT,
    FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
  );

  CREATE TABLE IF NOT EXISTS relationship_type (
    type_id TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_relationship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    related_contact_id TEXT NOT NULL,
    type_id TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id),
    FOREIGN KEY (related_contact_id) REFERENCES contact(contact_id),
    FOREIGN KEY (type_id) REFERENCES relationship_type(type_id),
    UNIQUE(contact_id, related_contact_id, type_id)
  );

  CREATE TABLE IF NOT EXISTS organization (
    organization_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS contact_organization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    achievement TEXT NOT NULL,
    date TEXT,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id),
    FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
  );

  CREATE TABLE IF NOT EXISTS contact_keyword (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    UNIQUE(contact_id, keyword),
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
  );

  CREATE TABLE IF NOT EXISTS contact_note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
  );

  CREATE TABLE IF NOT EXISTS contact_url (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL,
    url TEXT NOT NULL,
    label TEXT,
    FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
  );
  `);

  // Migraciones
  try { await db.execAsync('ALTER TABLE contact ADD COLUMN birthdate TEXT;'); } catch (_) {}
  try { await db.execAsync("ALTER TABLE contact ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'));"); } catch (_) {}
  try {
    await db.execAsync('ALTER TABLE national_identity_card ADD COLUMN issue_date TEXT;');
    await db.execAsync('ALTER TABLE national_identity_card ADD COLUMN expiry_date TEXT;');
    await db.execAsync(`CREATE TABLE national_identity_card_tmp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      card_number TEXT NOT NULL,
      issue_date TEXT,
      expiry_date TEXT,
      FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
    )`);
    await db.execAsync(`INSERT INTO national_identity_card_tmp (id, contact_id, doc_type, card_number)
      SELECT id, contact_id, doc_type, card_number FROM national_identity_card`);
    await db.execAsync('DROP TABLE national_identity_card');
    await db.execAsync('ALTER TABLE national_identity_card_tmp RENAME TO national_identity_card');
  } catch (_) {
    try { await db.execAsync('ALTER TABLE national_identity_card ADD COLUMN expiry_date TEXT;'); } catch (_) {}
  }

  await db.execAsync(`
  INSERT OR IGNORE INTO marital_status (status_id, marital_status) VALUES
    ('soltero', 'Soltero/a'),('casado', 'Casado/a'),('divorciado', 'Divorciado/a'),
    ('viudo', 'Viudo/a'),('union_libre', 'Unión libre'),('separado', 'Separado/a');
  `);

  await db.execAsync(`
  INSERT OR IGNORE INTO relationship_type (type_id, label) VALUES
    ('padre','Padre'),('madre','Madre'),('hijo','Hijo'),('hija','Hija'),
    ('hermano','Hermano'),('hermana','Hermana'),('tio','Tío'),('tia','Tía'),
    ('sobrino','Sobrino'),('sobrina','Sobrina'),('abuelo','Abuelo'),('abuela','Abuela'),
    ('primo','Primo'),('prima','Prima'),('conyuge','Cónyuge'),('nieto','Nieto'),('nieta','Nieta');
  `);
}
