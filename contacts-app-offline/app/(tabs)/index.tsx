import { Stack, useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Dropdown from '../../components/Dropdown';
import { MaritalStatus, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { getZodiacSymbol } from '../../utils/contactUtils';

const DOC_TYPES = ['Pasaporte', 'Cédula', 'Licencia de conducir', 'Otro'];

interface Contact {
  contact_id: string;
  [key: string]: any;
}

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [maritalStatuses, setMaritalStatuses] = useState<MaritalStatus[]>([]);

  // Documento de identidad
  const [hasDoc, setHasDoc] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [cardNumber, setCardNumber] = useState('');

  const router = useRouter();
  const { contacts, fetchContacts, createContact, getMaritalStatuses, addIdentityCard, searchContacts } = useContacts();
  const { t } = useI18n();

  const [searchResults, setSearchResults] = React.useState<Contact[]>([]);

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      searchContacts(trimmed).then(setSearchResults);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredContacts = searchQuery.trim() ? searchResults : contacts;

  const formatBirthdate = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setBirthdate(formatted);
  };

  const handleOpenModal = async () => {
    const statuses = await getMaritalStatuses();
    setMaritalStatuses(statuses);
    setFirstName('');
    setMiddleName('');
    setSurname('');
    setBirthdate('');
    setGender(null);
    setSelectedStatusId(null);
    setHasDoc(false);
    setDocType(DOC_TYPES[0]);
    setCardNumber('');
    setModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!firstName.trim() || !surname.trim()) {
      alert(t.contacts.nameRequired);
      return;
    }

    try {
      const newContact = await createContact({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        surname: surname.trim(),
        birthdate: birthdate.trim() || undefined,
        gender: gender ?? undefined,
        status_id: selectedStatusId ?? undefined,
      });

      if (newContact) {
        if (hasDoc && cardNumber.trim()) {
          await addIdentityCard(newContact.contact_id, docType, cardNumber.trim());
        }
        setModalVisible(false);
        await fetchContacts();
        router.push(`/contact/${newContact.contact_id}`);
      } else {
        alert(t.contacts.createError);
      }
    } catch (error) {
      alert(t.common.error + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: t.tabs.contacts }} />

      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.contacts.search}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={20} color="#8E8E93" />
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.contact_id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.contactItem}
              onPress={() => router.push(`/contact/${item.contact_id}`)}
            >
              <View style={styles.avatar}>
                {getZodiacSymbol(item.birthdate) ? (
                  <Text style={styles.avatarZodiac}>{getZodiacSymbol(item.birthdate)}</Text>
                ) : (
                  <Text style={styles.avatarText}>
                    {item.first_name?.[0]?.toUpperCase()}
                    {item.surname?.[0]?.toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={styles.contactName}>
                {[item.first_name, item.middle_name, item.surname].filter(Boolean).join(' ')}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t.contacts.empty}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />

        <Pressable style={styles.fab} onPress={handleOpenModal}>
          <Plus size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t.contacts.newContact}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.fieldLabel}>{t.contacts.firstName} <Text style={styles.required}>{t.common.required}</Text></Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.firstNamePlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.middleName}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.middleNamePlaceholder}
                value={middleName}
                onChangeText={setMiddleName}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.surname} <Text style={styles.required}>{t.common.required}</Text></Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.surnamePlaceholder}
                value={surname}
                onChangeText={setSurname}
                placeholderTextColor="#C7C7CC"
              />

              <Text style={styles.fieldLabel}>{t.contacts.gender}</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as const).map(g => (
                  <Pressable
                    key={g}
                    style={[styles.genderChip, gender === g && styles.genderChipSelected]}
                    onPress={() => setGender(prev => prev === g ? null : g)}
                  >
                    <Text style={[styles.genderChipText, gender === g && styles.genderChipTextSelected]}>
                      {g === 'male' ? t.contacts.male : t.contacts.female}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t.contacts.birthdate}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.contacts.birthdatePlaceholder}
                value={birthdate}
                onChangeText={formatBirthdate}
                placeholderTextColor="#C7C7CC"
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={styles.fieldLabel}>{t.contacts.maritalStatus}</Text>
              <Dropdown
                options={maritalStatuses.map(s => ({ label: s.marital_status, value: s.status_id }))}
                value={selectedStatusId}
                onSelect={setSelectedStatusId}
                allowNull
              />

              {/* Documento de identidad */}
              <Pressable style={styles.docToggle} onPress={() => setHasDoc(v => !v)}>
                <View style={[styles.docToggleBox, hasDoc && styles.docToggleBoxActive]}>
                  {hasDoc && <Text style={styles.docToggleCheck}>✓</Text>}
                </View>
                <Text style={styles.docToggleLabel}>{t.contacts.hasDoc}</Text>
              </Pressable>

              {hasDoc && (
                <>
                  <Text style={styles.fieldLabel}>{t.contacts.docType}</Text>
                  <Dropdown
                    options={DOC_TYPES.map(d => ({ label: d, value: d }))}
                    value={docType}
                    onSelect={v => v && setDocType(v)}
                  />

                  <Text style={styles.fieldLabel}>{t.contacts.docNumber}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t.contacts.docNumberPlaceholder}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholderTextColor="#C7C7CC"
                    autoCapitalize="characters"
                  />
                </>
              )}

            </ScrollView>

            <View style={styles.buttonContainer}>
              <Pressable style={[styles.button, styles.buttonCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.textCancel}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.buttonSave]} onPress={handleSaveContact}>
                <Text style={styles.textSave}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 12, marginHorizontal: 16, marginVertical: 10, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },

  listContent: { paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#8E8E93' },

  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  avatarZodiac: { fontSize: 22 },
  contactName: { fontSize: 17, color: '#000' },

  fab: {
    position: 'absolute', right: 16, bottom: 32,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#000',
    textAlign: 'center', marginBottom: 20,
  },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  required: { color: '#FF3B30' },
  input: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: '#000', backgroundColor: '#F9F9F9',
  },

  docToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  docToggleBox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  docToggleBoxActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  docToggleCheck: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  docToggleLabel: { fontSize: 15, color: '#333' },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#C7C7CC', alignItems: 'center', backgroundColor: '#F9F9F9',
  },
  genderChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderChipText: { fontSize: 15, color: '#333' },
  genderChipTextSelected: { color: '#fff', fontWeight: '600' },


  buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 24 },
  button: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonCancel: { backgroundColor: '#E5E5EA' },
  buttonSave: { backgroundColor: '#007AFF' },
  textCancel: { fontSize: 16, fontWeight: '600', color: '#000' },
  textSave: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
