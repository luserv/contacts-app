import { SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export const DB_NAME = 'contacts.db';

export async function initializeDatabase(db: SQLiteDatabase) {
    // Initialization is handled by scripts/init-sqlite.mjs,
    // but we ensure tables exist here to prevent errors in Expo if not pre-seeded.
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
    status_id TEXT,
    FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
  );

  CREATE TABLE IF NOT EXISTS national_identity_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL,
    card_number TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
  );
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

interface ContactsContextType {
    contacts: Contact[];
    fetchContacts: () => Promise<void>;
    createContact: (data: { first_name: string; surname: string }) => Promise<Contact | null>;
    getContact: (id: string) => Promise<Contact | null>;
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

    const createContact = async (data: { first_name: string; surname: string }) => {
        try {
            const id = 'c' + Date.now(); // Generate a specific ID format used in seed script (c00000001)
            await db.runAsync(
                'INSERT INTO contact (contact_id, first_name, surname) VALUES (?, ?, ?)',
                id, data.first_name, data.surname
            );
            const newContact = { contact_id: id, first_name: data.first_name, surname: data.surname };
            return newContact;
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

    return (
        <ContactsContext.Provider value={{ contacts, fetchContacts, createContact, getContact }}>
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
