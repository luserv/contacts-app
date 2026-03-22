import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContactOrganization, useContacts } from '../../utils/context';
import { useI18n } from '../../utils/i18n';
import { formatDate } from '../../utils/contactUtils';
import { sharedStyles as s } from './contactStyles';

interface Props {
  contactId: string;
  initialOrganizations: ContactOrganization[];
}

export default function OrganizationsCard({ contactId, initialOrganizations }: Props) {
  const { t } = useI18n();
  const { getContactOrganizations, addContactOrganization, removeContactOrganization, searchOrganizations } = useContacts();

  const [organizations, setOrganizations] = useState<ContactOrganization[]>(initialOrganizations);
  const [modalVisible, setModalVisible] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [achievement, setAchievement] = useState('');
  const [date, setDate] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const openModal = () => {
    setOrgName('');
    setAchievement('');
    setDate('');
    setSuggestions([]);
    setModalVisible(true);
  };

  const handleNameChange = async (text: string) => {
    setOrgName(text);
    if (text.trim().length >= 2) {
      const results = await searchOrganizations(text.trim());
      setSuggestions(results.map(r => r.name).filter(n => n !== text));
    } else {
      setSuggestions([]);
    }
  };

  const handleSave = async () => {
    if (!orgName.trim()) {
      Alert.alert(t.common.error, t.organizations.orgNameRequired);
      return;
    }
    const ok = await addContactOrganization(contactId, orgName.trim(), achievement.trim(), date.trim() || undefined);
    if (ok) {
      setOrganizations(await getContactOrganizations(contactId));
      setModalVisible(false);
    } else {
      Alert.alert(t.common.error, t.organizations.saveError);
    }
  };

  const handleRemove = (org: ContactOrganization) => {
    Alert.alert(
      t.organizations.deleteTitle,
      t.organizations.deleteConfirm(org.organization_name),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive', onPress: async () => {
            await removeContactOrganization(org.id);
            setOrganizations(prev => prev.filter(o => o.id !== org.id));
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{t.organizations.title}</Text>
          <Pressable style={s.addButton} onPress={openModal}>
            <Text style={s.addButtonText}>{t.common.add}</Text>
          </Pressable>
        </View>

        {organizations.length === 0 ? (
          <Text style={s.emptyText}>{t.organizations.empty}</Text>
        ) : (
          organizations.map(org => (
            <View key={org.id} style={styles.orgRow}>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.organization_name}</Text>
                {org.achievement ? <Text style={styles.orgAchievement}>{org.achievement}</Text> : null}
                {org.date ? <Text style={styles.orgDate}>{org.date}</Text> : null}
              </View>
              <Pressable onPress={() => handleRemove(org)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>{t.organizations.addTitle}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>{t.organizations.orgName} <Text style={s.required}>{t.common.required}</Text></Text>
              <TextInput
                style={s.input} value={orgName} onChangeText={handleNameChange}
                placeholder={t.organizations.orgName} placeholderTextColor="#C7C7CC"
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {suggestions.map(sg => (
                    <Pressable key={sg} style={styles.suggestionRow} onPress={() => { setOrgName(sg); setSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{sg}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={s.fieldLabel}>{t.organizations.achievement}</Text>
              <TextInput
                style={s.input} value={achievement} onChangeText={setAchievement}
                placeholder={t.organizations.achievementPlaceholder} placeholderTextColor="#C7C7CC"
              />

              <Text style={s.fieldLabel}>{t.organizations.date}</Text>
              <TextInput
                style={s.input} value={date}
                onChangeText={v => formatDate(v, setDate)}
                placeholder={t.contacts.birthdatePlaceholder} placeholderTextColor="#C7C7CC"
                keyboardType="numeric" maxLength={10}
              />
            </ScrollView>

            <View style={s.modalActions}>
              <Pressable style={s.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={s.btnCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={s.btnSave} onPress={handleSave}>
                <Text style={s.btnSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  orgRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 16, fontWeight: '600', color: '#000' },
  orgAchievement: { fontSize: 14, color: '#333', marginTop: 2 },
  orgDate: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  suggestions: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8,
    backgroundColor: '#fff', marginTop: 4, marginBottom: 4,
  },
  suggestionRow: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7',
  },
  suggestionText: { fontSize: 15, color: '#007AFF' },
});
