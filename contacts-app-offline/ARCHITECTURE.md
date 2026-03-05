# Arquitectura del Proyecto: Enfoque Offline con SQLite

Este documento detalla la arquitectura de la aplicación de gestión de contactos, la cual está diseñada para funcionar **100% offline** utilizando una base de datos local embebida.

---

## Resumen

La aplicación es un proyecto de **React Native** construido con **Expo** (usando **Expo Router** para la navegación). Se ha elegido un enfoque offline prioritario (offline-first) donde todos los datos se procesan y almacenan localmente en el dispositivo del usuario mediante SQLite.

Ya no se utiliza una base de datos PostgreSQL remota; todo el peso de los datos y el estado reside directamente en el dispositivo móvil o en el entorno web emulado de Expo.

## Componentes Clave

### 1. Base de Datos (Expo SQLite)

Hacemos uso del paquete `expo-sqlite` (específicamente sus APIs síncronas/asíncronas modernas). El ciclo de vida de la base de datos es manejado en `app/_layout.tsx` a través del componente `<SQLiteProvider>`.

- **Ubicación del esquema:** La base de datos se inicializa vía el archivo `utils/context.tsx` (función `initializeDatabase`).
- **Modo Diario (Journal):** Se usa `PRAGMA journal_mode = WAL` para mejorar la concurrencia y velocidad de las transacciones (Write-Ahead Logging).

### 2. Estado Global y Contexto de Datos (Context API)

En lugar de llamadas a endpoints de API como `/api/contacts`, el acceso a la base de datos se administra mediante proveedores de contexto (React Context) que residen en `utils/context.tsx`.

- **`ContactsProvider`**: Proveedor global que envuelve la app.
- **Acciones permitidas (`useContacts`)**:
  - `contacts`: Lista local de contactos hidratada desde la BD.
  - `fetchContacts()`: Refresca o carga la lista de contactos desde SQLite.
  - `createContact(data)`: Inserta un nuevo registro directo en la tabla SQLite.
  - `getContact(id)`: Busca un contacto por su ID utilizando consultas directas (`db.getFirstAsync`).

### 3. Navegación (Expo Router)

La arquitectura de enrutamiento está basada en el sistema de archivos (file-based routing):

- `app/_layout.tsx`: Disposición principal, provee el contexto y la conexión a SQLite.
- `app/(tabs)/`: Vistas tabuladas de la aplicación (como `home.tsx` y `config.tsx`).
- `app/contact/[id].tsx`: Pantalla de detalle de cada contacto (enrutamiento dinámico).

---

## Estructura de Datos (Esquema SQLite)

El modelo de datos se enfoca en las necesidades esenciales de un contacto:

```sql
-- Estado Civil
CREATE TABLE marital_status (
  status_id TEXT PRIMARY KEY,
  marital_status TEXT NOT NULL
);

-- Contacto Principal
CREATE TABLE contact (
  contact_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  surname TEXT NOT NULL,
  status_id TEXT,
  FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
);

-- Documento de Identidad Nacional interactuando de forma 1 a 1
CREATE TABLE national_identity_card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL,
  card_number TEXT NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
);
```

## Flujo de Datos (Data Flow)

1. **La app inicia**: `SQLiteProvider` se encarga de crear el archivo `contacts.db` interno. Si no existen las tablas, corre los scripts de inicialización (`initializeDatabase`).
2. **Los proveedores (Context)**: Inicializan un estado base (vacío).
3. **El usuario ingresa al Home**: Al cargar pantalla (montaje), se dispara el método `fetchContacts()` de `useContacts()`, el cual efectúa un `SELECT * FROM contact`.
4. **El usuario guarda un contacto**: `createContact` hace el `INSERT` en la BD local y posteriormente actualiza la interfaz obteniendo los nuevos datos.

---

## Uso y Desarrollo

Para ejecutar y probar la base de datos, simplemente corre el servidor de desarrollo:

```bash
npx expo start
```

_No es necesario levantar bases de datos externas de Docker o Postgres._ Todo el estado recae puramente en la carpeta e infraestructura de la aplicación móvil con Expo Go, Android Emulator o Web.
