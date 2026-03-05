import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDbHeaders } from '../../constants/Env';
import { useContacts } from '../../utils/context';

interface PostgresConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

const STORAGE_KEY = 'postgres_config';

export default function Config() {
  const [config, setConfig] = useState<PostgresConfig>({
    host: '',
    port: '5432',
    database: '',
    user: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [dbResult, setDbResult] = useState<string>('');
  const [contacts, setContactsState] = useState<any[]>([]);
  const { setContacts } = useContacts();
  const router = useRouter();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await SecureStore.getItemAsync(STORAGE_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };


  const updateField = (field: keyof PostgresConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const fetchContacts = async () => {
    try {
      setDbResult('Fetching contacts...');
      console.log('Fetching from: /api/contacts');
      
      const response = await fetch('/api/contacts', {
        method: 'GET',
        headers: getDbHeaders(),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setContactsState(data.data);
        setContacts(data.data);
        setDbResult(`Found ${data.data.length} contacts`);
        // Navegar a home después de obtener los contactos
        setTimeout(() => router.push('/home'), 500);
      } else {
        setDbResult('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error name:', error instanceof Error ? error.name : 'N/A');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
      setDbResult('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <Button title="List Contacts" onPress={fetchContacts} color="green" />
        </View>
        {dbResult ? (
          <Text style={{ marginVertical: 10, padding: 10, backgroundColor: '#f0f0f0' }}>
            {dbResult}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#3b4047',
    color: '#fff',
    padding: 12,
    borderRadius: 5,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4a4f56',
  },
  button: {
    backgroundColor: '#3b4047',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginTop: 20,
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
