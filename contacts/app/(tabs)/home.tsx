import { Stack, useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getDbHeaders } from '../../constants/Env';
import { useContacts } from '../../utils/context';

interface Contact {
  id: string | number;
  [key: string]: any;
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const router = useRouter();
  const { contacts, setContacts } = useContacts();
  const [localContacts, setLocalContacts] = useState<Contact[]>([]);


  

  const filteredContacts = (contacts && contacts.length > 0 ? contacts : localContacts).filter(
    (contact) =>
      contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.middle_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.surname?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleCreateContact = async () => {
    setModalVisible(true);
    setFirstName('');
    setSurname('');
  };

  const handleSaveContact = async () => {
    if (!firstName.trim() || !surname.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      console.log('Creating new contact...');
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getDbHeaders(),
        },
        body: JSON.stringify({
          first_name: firstName,
          surname: surname,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('Contact created:', data.data);
        setModalVisible(false);
        await fetchContacts();
        setContacts(data.data);
        router.push(`/contact/${data.data.contact_id}`);
      } else {
        alert('Error: ' + (data.error || 'Failed to create contact'));
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const fetchContacts = async () => {
    try {
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
        setLocalContacts(data.data);
        setContacts(data.data);
        console.log('Contacts received:', data.data);
        if (data.data && data.data.length > 0) {
          console.log('First contact fields:', Object.keys(data.data[0]));
        }
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error name:', error instanceof Error ? error.name : 'N/A');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    }
  };



  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} />
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={20} color="#8E8E93" />
          </Pressable>
        )}
      </View>

      <Animated.View entering={FadeIn} >
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={() => (
            <View style={styles.headerContainer}>
              <View style={{ marginBottom: 10 }}>

                {filteredContacts.length > 0 && (
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 18, marginVertical: 10 }}>
                      Database Contacts:
                    </Text>
                    {filteredContacts.map((contact, index) => (
                      <Pressable
                        key={index}
                        style={styles.contactItem}
                        onPress={() => router.push(`/contact/${contact.contact_id}`)}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {contact.first_name?.[0]?.toUpperCase()}
                            {contact.middle_name?.[0]?.toUpperCase()}
                            {contact.surname?.[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.contactName}>
                            {[contact.first_name, contact.middle_name, contact.surname]
                              .filter(Boolean)
                              .join(' ')}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
        />
        <Pressable style={styles.fab} onPress={handleCreateContact}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Nuevo Contacto</Text>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el nombre"
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el apellido"
                value={surname}
                onChangeText={setSurname}
                placeholderTextColor="#C7C7CC"
              />

              <View style={styles.buttonContainer}>
                <Pressable
                  style={[styles.button, styles.buttonCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.textCancel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSave]}
                  onPress={handleSaveContact}
                >
                  <Text style={styles.textSave}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginHorizontal: 16,
    marginVertical: 10,
    height: 100
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 18,
    color: '#000',
  },
  
  listContent: {
    paddingBottom: 100,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#E5E5EA',
  },
  buttonSave: {
    backgroundColor: '#007AFF',
  },
  textCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  textSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 17,
    color: '#000',
  },
});