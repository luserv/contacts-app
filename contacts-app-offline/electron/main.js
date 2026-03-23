const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Registrar el protocolo antes de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
]);

// Obtener ruta de datos del usuario (persiste entre actualizaciones)
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'contacts.db');

let db = null;

function initDB() {
  // En producción, better-sqlite3 está fuera del asar (asarUnpack)
  const bsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')
    : 'better-sqlite3';
  const Database = require(bsPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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

  const migrations = [
    "ALTER TABLE contact ADD COLUMN birthdate TEXT",
    "ALTER TABLE contact ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'))",
    "ALTER TABLE national_identity_card ADD COLUMN issue_date TEXT",
    "ALTER TABLE national_identity_card ADD COLUMN expiry_date TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) {}
  }

  db.exec(`
    INSERT OR IGNORE INTO marital_status (status_id, marital_status) VALUES
      ('soltero', 'Soltero/a'),('casado', 'Casado/a'),('divorciado', 'Divorciado/a'),
      ('viudo', 'Viudo/a'),('union_libre', 'Unión libre'),('separado', 'Separado/a');

    INSERT OR IGNORE INTO relationship_type (type_id, label) VALUES
      ('padre','Padre'),('madre','Madre'),('hijo','Hijo'),('hija','Hija'),
      ('hermano','Hermano'),('hermana','Hermana'),('tio','Tío'),('tia','Tía'),
      ('sobrino','Sobrino'),('sobrina','Sobrina'),('abuelo','Abuelo'),('abuela','Abuela'),
      ('primo','Primo'),('prima','Prima'),('conyuge','Cónyuge'),('nieto','Nieto'),('nieta','Nieta');
  `);
}

// Manejadores IPC — importar VCF
ipcMain.handle('fs:readVcf', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar contactos VCF',
    filters: [{ name: 'vCard', extensions: ['vcf', 'vcard'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { content };
  } catch (e) {
    return { error: e.message };
  }
});

// Manejadores IPC — notificaciones
ipcMain.handle('notif:checkBirthdays', () => {
  // Devuelve contactos cuyo cumpleaños es mañana (DD/MM/AAAA)
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const prefix = `${day}/${month}/`;
    const rows = db.prepare(
      `SELECT first_name, surname, birthdate FROM contact WHERE birthdate LIKE ?`
    ).all(`${prefix}%`);
    return rows;
  } catch (_) { return []; }
});

// Manejadores IPC — archivo (import/export DB)
ipcMain.handle('fs:importDB', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Importar base de datos',
    filters: [{ name: 'SQLite DB', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    fs.copyFileSync(result.filePaths[0], dbPath);
    // Reabrir la conexión con el nuevo archivo
    db.close();
    initDB();
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('fs:exportDB', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Exportar base de datos',
    defaultPath: `contacts_backup_${Date.now()}.db`,
    filters: [{ name: 'SQLite DB', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    // Hacer checkpoint WAL antes de copiar
    db.pragma('wal_checkpoint(FULL)');
    fs.copyFileSync(dbPath, result.filePath);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// Manejadores IPC — base de datos
ipcMain.handle('db:exec', (_event, sql) => {
  db.exec(sql);
});

ipcMain.handle('db:run', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  stmt.run(...(params || []));
});

ipcMain.handle('db:getAll', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || []));
});

ipcMain.handle('db:getFirst', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  return stmt.get(...(params || [])) ?? null;
});

function getDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist')
    : path.join(__dirname, '..', 'dist');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 800,
    icon: path.join(__dirname, '../assets/images/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:8081');
    win.webContents.openDevTools();
  } else {
    // Usar protocolo personalizado para que las rutas absolutas funcionen
    win.loadURL('app://./index.html');
  }
}

app.whenReady().then(() => {
  // Protocolo app:// sirve archivos desde la carpeta dist
  protocol.handle('app', (request) => {
    const distPath = getDistPath();
    let filePath = request.url.replace('app://./', '').replace('app://', '');

    // Quitar query string y hash
    filePath = filePath.split('?')[0].split('#')[0];

    // Decodificar URI
    filePath = decodeURIComponent(filePath);

    const fullPath = path.join(distPath, filePath);

    // Si el archivo existe, servirlo; si no, servir index.html (SPA fallback)
    const targetPath = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
      ? fullPath
      : path.join(distPath, 'index.html');

    return net.fetch(url.pathToFileURL(targetPath).toString());
  });

  initDB();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
