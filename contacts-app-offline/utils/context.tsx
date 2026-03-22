import { SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export const DB_NAME = 'contacts.db';

export async function initializeDatabase(db: SQLiteDatabase) {
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
  `);

    // Migraciones: agregar columnas si no existen
    try { await db.execAsync('ALTER TABLE contact ADD COLUMN birthdate TEXT;'); } catch (_) {}
    try { await db.execAsync("ALTER TABLE contact ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female'));"); } catch (_) {}
    // Migración national_identity_card: eliminar UNIQUE(contact_id), agregar issue_date y expiry_date
    // Si ADD COLUMN issue_date tiene éxito → tabla en esquema viejo → recrear sin UNIQUE
    try {
        await db.execAsync('ALTER TABLE national_identity_card ADD COLUMN issue_date TEXT;');
        // Llegamos aquí → esquema viejo, necesita recrearse sin UNIQUE
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
        // Columna ya existe → migración ya corrió. Asegurar expiry_date por si fue parcial.
        try { await db.execAsync('ALTER TABLE national_identity_card ADD COLUMN expiry_date TEXT;'); } catch (_) {}
    }

    await db.execAsync(`
    INSERT OR IGNORE INTO marital_status (status_id, marital_status) VALUES
      ('soltero', 'Soltero/a'),
      ('casado', 'Casado/a'),
      ('divorciado', 'Divorciado/a'),
      ('viudo', 'Viudo/a'),
      ('union_libre', 'Unión libre'),
      ('separado', 'Separado/a');
  `);

    await db.execAsync(`
    INSERT OR IGNORE INTO relationship_type (type_id, label) VALUES
      ('padre', 'Padre'),
      ('madre', 'Madre'),
      ('hijo', 'Hijo'),
      ('hija', 'Hija'),
      ('hermano', 'Hermano'),
      ('hermana', 'Hermana'),
      ('tio', 'Tío'),
      ('tia', 'Tía'),
      ('sobrino', 'Sobrino'),
      ('sobrina', 'Sobrina'),
      ('abuelo', 'Abuelo'),
      ('abuela', 'Abuela'),
      ('primo', 'Primo'),
      ('prima', 'Prima'),
      ('conyuge', 'Cónyuge'),
      ('nieto', 'Nieto'),
      ('nieta', 'Nieta');
  `);
}

interface Contact {
    contact_id: string;
    first_name: string;
    middle_name?: string;
    surname: string;
    status_id?: string;
    [key: string]: any;
}

export interface ContactPhone {
    id: number;
    contact_id: string;
    phone: string;
    label?: string;
}

export interface ContactEmail {
    id: number;
    contact_id: string;
    email: string;
    label?: string;
}

export interface Relationship {
    id: number;
    related_contact_id: string;
    type_id: string;
    label: string;
    first_name: string;
    surname: string;
}

export interface RelationshipType {
    type_id: string;
    label: string;
}

export interface MaritalStatus {
    status_id: string;
    marital_status: string;
}

export interface ContactOrganization {
    id: number;
    contact_id: string;
    organization_id: string;
    organization_name: string;
    achievement: string;
    date?: string;
}

export interface IdentityCard {
    id: number;
    contact_id: string;
    doc_type: string;
    card_number: string;
    issue_date?: string;
    expiry_date?: string;
}

export interface ContactKeyword {
    id: number;
    contact_id: string;
    keyword: string;
}

interface ContactsContextType {
    contacts: Contact[];
    fetchContacts: () => Promise<void>;
    createContact: (data: {
        first_name: string;
        middle_name?: string;
        surname: string;
        birthdate?: string;
        gender?: 'male' | 'female';
        status_id?: string;
    }) => Promise<Contact | null>;
    getContact: (id: string) => Promise<Contact | null>;
    getRelationships: (contactId: string) => Promise<Relationship[]>;
    addRelationship: (contactId: string, relatedContactId: string, typeId: string) => Promise<boolean>;
    removeRelationship: (id: number) => Promise<boolean>;
    getRelationshipTypes: () => Promise<RelationshipType[]>;
    getMaritalStatuses: () => Promise<MaritalStatus[]>;
    getIdentityCards: (contactId: string) => Promise<IdentityCard[]>;
    addIdentityCard: (contactId: string, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string) => Promise<boolean>;
    deleteIdentityCard: (id: number) => Promise<boolean>;
    getContactOrganizations: (contactId: string) => Promise<ContactOrganization[]>;
    addContactOrganization: (contactId: string, orgName: string, achievement: string, date?: string) => Promise<boolean>;
    removeContactOrganization: (id: number) => Promise<boolean>;
    searchOrganizations: (query: string) => Promise<{ organization_id: string; name: string }[]>;
    updateContact: (id: string, data: {
        first_name: string;
        middle_name?: string;
        surname: string;
        birthdate?: string;
        gender?: 'male' | 'female';
        status_id?: string;
    }) => Promise<boolean>;
    getContactPhones: (contactId: string) => Promise<ContactPhone[]>;
    addContactPhone: (contactId: string, phone: string, label?: string) => Promise<boolean>;
    removeContactPhone: (id: number) => Promise<boolean>;
    getContactEmails: (contactId: string) => Promise<ContactEmail[]>;
    addContactEmail: (contactId: string, email: string, label?: string) => Promise<boolean>;
    removeContactEmail: (id: number) => Promise<boolean>;
    getContactKeywords: (contactId: string) => Promise<ContactKeyword[]>;
    addContactKeyword: (contactId: string, keyword: string) => Promise<boolean>;
    removeContactKeyword: (id: number) => Promise<boolean>;
    searchContacts: (query: string) => Promise<Contact[]>;
}

function getInverseType(typeId: string, gender: 'male' | 'female' | null): string | null {
    const esMale = gender === 'male';
    const esFemale = gender === 'female';

    switch (typeId) {
        // Si B es padre/madre de A → A es hijo/hija de B según género de A
        case 'padre':
        case 'madre':
            return esFemale ? 'hija' : 'hijo';

        // Si B es hijo/hija de A → A es padre/madre de B según género de A
        case 'hijo':
        case 'hija':
            return esFemale ? 'madre' : 'padre';

        // Hermano/hermana → según género de A
        case 'hermano':
        case 'hermana':
            return esFemale ? 'hermana' : 'hermano';

        // Tío/tía → sobrino/sobrina según género de A
        case 'tio':
        case 'tia':
            return esFemale ? 'sobrina' : 'sobrino';

        // Sobrino/sobrina → tío/tía según género de A
        case 'sobrino':
        case 'sobrina':
            return esFemale ? 'tia' : 'tio';

        // Abuelo/abuela → nieto/nieta según género de A
        case 'abuelo':
        case 'abuela':
            return esFemale ? 'nieta' : 'nieto';

        // Nieto/nieta → abuelo/abuela según género de A
        case 'nieto':
        case 'nieta':
            return esFemale ? 'abuela' : 'abuelo';

        // Primo/prima → según género de A
        case 'primo':
        case 'prima':
            return esFemale ? 'prima' : 'primo';

        case 'conyuge':
            return 'conyuge';

        default:
            return null;
    }
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export function ContactsProvider({ children }: { children: ReactNode }) {
    const db = useSQLiteContext();
    const [contacts, setContacts] = useState<Contact[]>([]);

    const fetchContacts = async () => {
        try {
            const result = await db.getAllAsync<Contact>('SELECT * FROM contact ORDER BY first_name ASC;');
            setContacts(result);
        } catch (e) {
            console.error(e);
        }
    };

    const createContact = async (data: {
        first_name: string;
        middle_name?: string;
        surname: string;
        birthdate?: string;
        gender?: 'male' | 'female';
        status_id?: string;
    }) => {
        try {
            const id = 'c' + Date.now();
            await db.runAsync(
                'INSERT INTO contact (contact_id, first_name, middle_name, surname, birthdate, gender, status_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                id, data.first_name, data.middle_name ?? null, data.surname, data.birthdate ?? null, data.gender ?? null, data.status_id ?? null
            );
            return { contact_id: id, ...data };
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const getContact = async (id: string) => {
        try {
            const contact = await db.getFirstAsync<Contact>('SELECT * FROM contact WHERE contact_id = ?;', id);
            return contact || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const getRelationships = async (contactId: string): Promise<Relationship[]> => {
        try {
            const result = await db.getAllAsync<Relationship>(`
                SELECT
                    cr.id,
                    cr.related_contact_id,
                    cr.type_id,
                    rt.label,
                    c.first_name,
                    c.surname
                FROM contact_relationship cr
                JOIN relationship_type rt ON cr.type_id = rt.type_id
                JOIN contact c ON cr.related_contact_id = c.contact_id
                WHERE cr.contact_id = ?
                ORDER BY rt.label ASC;
            `, contactId);
            return result;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addRelationship = async (contactId: string, relatedContactId: string, typeId: string): Promise<boolean> => {
        try {
            const existing = await db.getFirstAsync<{ id: number }>(
                'SELECT id FROM contact_relationship WHERE contact_id = ? AND related_contact_id = ? AND type_id = ?',
                contactId, relatedContactId, typeId
            );
            if (existing) return false;

            await db.runAsync(
                'INSERT INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                contactId, relatedContactId, typeId
            );

            // Obtener géneros de A (contactId) y B (relatedContactId)
            const [contactA, contactB] = await Promise.all([
                db.getFirstAsync<{ gender: 'male' | 'female' | null }>('SELECT gender FROM contact WHERE contact_id = ?', contactId),
                db.getFirstAsync<{ gender: 'male' | 'female' | null }>('SELECT gender FROM contact WHERE contact_id = ?', relatedContactId),
            ]);
            const genderA = contactA?.gender ?? null;
            const genderB = contactB?.gender ?? null;

            // Insertar relación inversa (B → A)
            const inverseTypeId = getInverseType(typeId, genderA);
            if (inverseTypeId) {
                await db.runAsync(
                    'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                    relatedContactId, contactId, inverseTypeId
                );
            }

            // Propagación entre hermanos/hermanas:
            // Si A agrega a B como hermano/hermana, todos los hermanos existentes de A
            // también deben ser hermanos de B (y viceversa)
            if (typeId === 'hermano' || typeId === 'hermana') {
                const siblingsOfA = await db.getAllAsync<{ related_contact_id: string }>(
                    `SELECT related_contact_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('hermano', 'hermana') AND related_contact_id != ?`,
                    contactId, relatedContactId
                );

                for (const { related_contact_id: siblingId } of siblingsOfA) {
                    const sibling = await db.getFirstAsync<{ gender: 'male' | 'female' | null }>(
                        'SELECT gender FROM contact WHERE contact_id = ?', siblingId
                    );
                    const genderSibling = sibling?.gender ?? null;

                    const typeBtoSibling = genderSibling === 'female' ? 'hermana' : 'hermano';
                    const typeSiblingToB = genderB === 'female' ? 'hermana' : 'hermano';

                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        relatedContactId, siblingId, typeBtoSibling
                    );
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        siblingId, relatedContactId, typeSiblingToB
                    );
                }

                // Propagación de padres: los padres de A pasan a ser padres de B y viceversa
                const parentsOfA = await db.getAllAsync<{ related_contact_id: string; type_id: string }>(
                    `SELECT related_contact_id, type_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('padre', 'madre')`,
                    contactId
                );
                for (const { related_contact_id: parentId, type_id: parentTypeId } of parentsOfA) {
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        relatedContactId, parentId, parentTypeId
                    );
                    const childType = genderB === 'female' ? 'hija' : 'hijo';
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        parentId, relatedContactId, childType
                    );
                }

                const parentsOfB = await db.getAllAsync<{ related_contact_id: string; type_id: string }>(
                    `SELECT related_contact_id, type_id FROM contact_relationship
                     WHERE contact_id = ? AND type_id IN ('padre', 'madre')`,
                    relatedContactId
                );
                for (const { related_contact_id: parentId, type_id: parentTypeId } of parentsOfB) {
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        contactId, parentId, parentTypeId
                    );
                    const childType = genderA === 'female' ? 'hija' : 'hijo';
                    await db.runAsync(
                        'INSERT OR IGNORE INTO contact_relationship (contact_id, related_contact_id, type_id) VALUES (?, ?, ?)',
                        parentId, contactId, childType
                    );
                }
            }

            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const removeRelationship = async (id: number): Promise<boolean> => {
        try {
            const rel = await db.getFirstAsync<{ contact_id: string; related_contact_id: string; type_id: string }>(
                'SELECT contact_id, related_contact_id, type_id FROM contact_relationship WHERE id = ?', id
            );
            if (rel) {
                const contact = await db.getFirstAsync<{ gender: 'male' | 'female' | null }>(
                    'SELECT gender FROM contact WHERE contact_id = ?', rel.contact_id
                );
                const inverseTypeId = getInverseType(rel.type_id, contact?.gender ?? null);
                if (inverseTypeId) {
                    await db.runAsync(
                        'DELETE FROM contact_relationship WHERE contact_id = ? AND related_contact_id = ? AND type_id = ?',
                        rel.related_contact_id, rel.contact_id, inverseTypeId
                    );
                }
            }
            await db.runAsync('DELETE FROM contact_relationship WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getRelationshipTypes = async (): Promise<RelationshipType[]> => {
        try {
            const result = await db.getAllAsync<RelationshipType>('SELECT * FROM relationship_type ORDER BY label ASC;');
            return result;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const updateContact = async (id: string, data: {
        first_name: string;
        middle_name?: string;
        surname: string;
        birthdate?: string;
        gender?: 'male' | 'female';
        status_id?: string;
    }): Promise<boolean> => {
        try {
            await db.runAsync(
                'UPDATE contact SET first_name = ?, middle_name = ?, surname = ?, birthdate = ?, gender = ?, status_id = ? WHERE contact_id = ?',
                data.first_name, data.middle_name ?? null, data.surname, data.birthdate ?? null, data.gender ?? null, data.status_id ?? null, id
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getContactPhones = async (contactId: string): Promise<ContactPhone[]> => {
        try {
            return await db.getAllAsync<ContactPhone>(
                'SELECT * FROM contact_phone WHERE contact_id = ? ORDER BY id ASC', contactId
            );
        } catch (e) { console.error(e); return []; }
    };

    const addContactPhone = async (contactId: string, phone: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync(
                'INSERT INTO contact_phone (contact_id, phone, label) VALUES (?, ?, ?)',
                contactId, phone, label ?? null
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactPhone = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_phone WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getContactEmails = async (contactId: string): Promise<ContactEmail[]> => {
        try {
            return await db.getAllAsync<ContactEmail>(
                'SELECT * FROM contact_email WHERE contact_id = ? ORDER BY id ASC', contactId
            );
        } catch (e) { console.error(e); return []; }
    };

    const addContactEmail = async (contactId: string, email: string, label?: string): Promise<boolean> => {
        try {
            await db.runAsync(
                'INSERT INTO contact_email (contact_id, email, label) VALUES (?, ?, ?)',
                contactId, email, label ?? null
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactEmail = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_email WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const getMaritalStatuses = async (): Promise<MaritalStatus[]> => {
        try {
            const result = await db.getAllAsync<MaritalStatus>('SELECT * FROM marital_status ORDER BY marital_status ASC;');
            return result;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const getIdentityCards = async (contactId: string): Promise<IdentityCard[]> => {
        try {
            return await db.getAllAsync<IdentityCard>(
                'SELECT * FROM national_identity_card WHERE contact_id = ? ORDER BY id ASC', contactId
            );
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addIdentityCard = async (
        contactId: string, docType: string, cardNumber: string, issueDate?: string, expiryDate?: string
    ): Promise<boolean> => {
        try {
            // Cédula: solo una por contacto
            if (docType === 'Cédula') {
                const existing = await db.getFirstAsync<{ id: number }>(
                    "SELECT id FROM national_identity_card WHERE contact_id = ? AND doc_type = 'Cédula'", contactId
                );
                if (existing) return false;
            }
            await db.runAsync(
                'INSERT INTO national_identity_card (contact_id, doc_type, card_number, issue_date, expiry_date) VALUES (?, ?, ?, ?, ?)',
                contactId, docType, cardNumber, issueDate ?? null, expiryDate ?? null
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const deleteIdentityCard = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM national_identity_card WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const getContactOrganizations = async (contactId: string): Promise<ContactOrganization[]> => {
        try {
            return await db.getAllAsync<ContactOrganization>(`
                SELECT co.id, co.contact_id, co.organization_id, o.name AS organization_name,
                       co.achievement, co.date
                FROM contact_organization co
                JOIN organization o ON co.organization_id = o.organization_id
                WHERE co.contact_id = ?
                ORDER BY co.date DESC, o.name ASC
            `, contactId);
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const addContactOrganization = async (
        contactId: string, orgName: string, achievement: string, date?: string
    ): Promise<boolean> => {
        try {
            // Crear organización si no existe
            const orgId = 'org_' + orgName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            await db.runAsync(
                'INSERT OR IGNORE INTO organization (organization_id, name) VALUES (?, ?)',
                orgId, orgName.trim()
            );
            // Obtener el id real (puede haber existido ya)
            const org = await db.getFirstAsync<{ organization_id: string }>(
                'SELECT organization_id FROM organization WHERE name = ?', orgName.trim()
            );
            if (!org) return false;
            await db.runAsync(
                'INSERT INTO contact_organization (contact_id, organization_id, achievement, date) VALUES (?, ?, ?, ?)',
                contactId, org.organization_id, achievement.trim(), date ?? null
            );
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const removeContactOrganization = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_organization WHERE id = ?', id);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const searchOrganizations = async (query: string): Promise<{ organization_id: string; name: string }[]> => {
        try {
            return await db.getAllAsync<{ organization_id: string; name: string }>(
                'SELECT organization_id, name FROM organization WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
                `%${query}%`
            );
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const getContactKeywords = async (contactId: string): Promise<ContactKeyword[]> => {
        try {
            return await db.getAllAsync<ContactKeyword>(
                'SELECT * FROM contact_keyword WHERE contact_id = ? ORDER BY keyword ASC', contactId
            );
        } catch (e) { console.error(e); return []; }
    };

    const addContactKeyword = async (contactId: string, keyword: string): Promise<boolean> => {
        try {
            await db.runAsync(
                'INSERT OR IGNORE INTO contact_keyword (contact_id, keyword) VALUES (?, ?)',
                contactId, keyword.trim()
            );
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const removeContactKeyword = async (id: number): Promise<boolean> => {
        try {
            await db.runAsync('DELETE FROM contact_keyword WHERE id = ?', id);
            return true;
        } catch (e) { console.error(e); return false; }
    };

    const searchContacts = async (query: string): Promise<Contact[]> => {
        try {
            const q = `%${query}%`;
            return await db.getAllAsync<Contact>(
                `SELECT DISTINCT c.* FROM contact c
                 LEFT JOIN contact_keyword ck ON c.contact_id = ck.contact_id
                 WHERE c.first_name LIKE ? OR c.middle_name LIKE ? OR c.surname LIKE ? OR ck.keyword LIKE ?
                 ORDER BY c.first_name ASC`,
                q, q, q, q
            );
        } catch (e) { console.error(e); return []; }
    };

    return (
        <ContactsContext.Provider value={{
            contacts,
            fetchContacts,
            createContact,
            getContact,
            getRelationships,
            addRelationship,
            removeRelationship,
            getRelationshipTypes,
            getMaritalStatuses,
            getIdentityCards,
            addIdentityCard,
            deleteIdentityCard,
            updateContact,
            getContactOrganizations,
            addContactOrganization,
            removeContactOrganization,
            searchOrganizations,
            getContactPhones,
            addContactPhone,
            removeContactPhone,
            getContactEmails,
            addContactEmail,
            removeContactEmail,
            getContactKeywords,
            addContactKeyword,
            removeContactKeyword,
            searchContacts,
        }}>
            {children}
        </ContactsContext.Provider>
    );
}

export function useContacts() {
    const context = useContext(ContactsContext);
    if (!context) {
        throw new Error('useContacts must be used within a ContactsProvider');
    }
    return context;
}
