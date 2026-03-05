import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface Note {
  id: string;
  title: string | null;
  content: string | null;
  modifiedDate: Date | null;
}

export interface Contact {
  id: string | number;
  [key: string]: any;
}

export const DB_NAME = 'contacts.db';

interface NotesContextType {
  notes: Note[];
  createNote: () => Promise<Note | undefined>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

interface ContactsContextType {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);
const ContactsContext = createContext<ContactsContextType | null>(null);

export async function initializeDatabase(db: any) {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT,
        content TEXT,
        modifiedDate TEXT
      );
    `);
  } catch (e) {
    console.error('Error al inicializar la base de datos:', e);
  }
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (db) {
      fetchNotes();
    }
  }, [db]);

  const fetchNotes = useCallback(async () => {
    const notes = await db.getAllAsync<Note>(
      'SELECT * FROM notes ORDER BY modifiedDate DESC'
    );
    setNotes(notes);
  }, [db]);

  const createNote = async () => {
    const newNote = {
      title: '',
      content: '',
      modifiedDate: new Date(),
    };

    try {
      const result = await db.runAsync(
        'INSERT INTO notes (title, content, modifiedDate) VALUES (?, ?, ?)',
        [newNote.title, newNote.content, newNote.modifiedDate.toISOString()]
      );
      await fetchNotes();
      return { ...newNote, id: result.lastInsertRowId.toString() };
    } catch (e) {
      console.log(e);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const existingNote = await db.getFirstAsync<Note>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );

    if (!existingNote) return;

    const updatedNote = {
      title: updates.title ?? existingNote.title,
      content: updates.content ?? existingNote.content,
      modifiedDate: updates.modifiedDate ?? new Date(),
    };

    await db.runAsync(
      'UPDATE notes SET title = ?, content = ?, modifiedDate = ? WHERE id = ?',
      [
        updatedNote.title,
        updatedNote.content,
        updatedNote.modifiedDate.toISOString(),
        id,
      ]
    );
    await fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    await fetchNotes();
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        createNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);

  return (
    <ContactsContext.Provider value={{ contacts, setContacts }}>
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
