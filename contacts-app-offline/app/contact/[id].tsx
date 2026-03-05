import { Link, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useContacts } from '../../utils/context';

interface ContactDetail {
  contact_id: number;
  first_name: string;
  surname: string;
  email_address?: string;
  phone_number?: string;
  [key: string]: any;
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getContact } = useContacts();

  useEffect(() => {
    const fetchContact = async () => {
      try {
        if (typeof id === 'string') {
          const contactData = await getContact(id);
          if (contactData) {
            setContact(contactData);
          } else {
            setError('Contact not found');
          }
        }
      } catch (err) {
        setError('Failed to load contact');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchContact();
    }
  }, [id, getContact]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !contact) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Contact not found'}</Text>
        <Link href="../" style={styles.backLink}>Go Back</Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: `${contact.first_name} ${contact.surname}`,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact.first_name?.[0]?.toUpperCase()}{contact.surname?.[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{contact.first_name} {contact.surname}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Details</Text>

          {Object.entries(contact).map(([key, value]) => {
            if (['contact_id', 'first_name', 'surname', 'status_id', 'created_at', 'updated_at'].includes(key)) return null;

            let displayValue = String(value);

            if (key === 'date_of_birth' && value) {
              const date = new Date(value as string);
              // Format: 21 de agosto de 2000
              // Using UTC to avoid timezone shifts if the date implies UTC midnight
              displayValue = date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC'
              });
            }

            if (key === 'gender' && value) {
              displayValue = value === 'W' ? 'FEMENINO' : value === 'M' ? 'MASCULINO' : String(value);
            }

            return (
              <View key={key} style={styles.infoRow}>
                <Text style={styles.label}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.value}>{displayValue}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginBottom: 10,
  },
  backLink: {
    fontSize: 16,
    color: '#007AFF',
  },
});
