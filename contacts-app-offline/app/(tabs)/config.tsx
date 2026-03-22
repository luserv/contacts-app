import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DB_NAME, useContacts } from '../../utils/context';
import { Lang, useI18n } from '../../utils/i18n';
import { getScheduledBirthdayCount, notificationsAvailable, requestNotificationPermissions, scheduleAllBirthdayNotifications } from '../../utils/notifications';

const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function Config() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  const { contacts, fetchContacts } = useContacts();
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    fetchContacts();
    getScheduledBirthdayCount().then(setNotifCount);
  }, []);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      setStatus(null);

      const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
      if (!dbInfo.exists) {
        setStatus(t.config.dbNotFound);
        return;
      }

      const exportPath = `${FileSystem.cacheDirectory}contacts_backup_${Date.now()}.db`;
      await FileSystem.copyAsync({ from: DB_PATH, to: exportPath });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setStatus(t.config.sharingUnavailable);
        return;
      }

      await Sharing.shareAsync(exportPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: t.config.exportBtn,
        UTI: 'public.database',
      });

      setStatus(t.config.exportSuccess);
    } catch (e) {
      console.error(e);
      setStatus(t.config.exportErrorPrefix + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleNotifications = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setStatus(t.config.notifPermError);
        return;
      }
      const count = await scheduleAllBirthdayNotifications(contacts);
      setNotifCount(count);
      setStatus(t.config.notifScheduled(count));
    } catch (e) {
      setStatus(t.config.notifErrorPrefix + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      t.config.importTitle,
      t.config.importConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.config.importContinue, style: 'destructive', onPress: async () => {
            try {
              setIsLoading(true);
              setStatus(null);

              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (result.canceled) {
                setIsLoading(false);
                return;
              }

              const file = result.assets[0];

              const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
              const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
              }

              await FileSystem.copyAsync({ from: file.uri, to: DB_PATH });

              setStatus(t.config.importSuccess);
              Alert.alert(t.config.importSuccessTitle, t.config.importSuccessMsg);
            } catch (e) {
              console.error(e);
              setStatus(t.config.importErrorPrefix + (e instanceof Error ? e.message : String(e)));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.config.title}</Text>

      {/* Idioma */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>{t.config.language}</Text>
        <Text style={styles.cardDesc}>{t.config.languageDesc}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notificaciones */}
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.cardTitle}>{t.config.notifications}</Text>
        <Text style={styles.cardDesc}>
          {t.config.notificationsDesc}
          {notifCount !== null ? t.config.notificationsActive(notifCount) : ''}
        </Text>
        {notificationsAvailable ? (
          <Pressable
            style={[styles.button, styles.buttonNotif, isLoading && styles.buttonDisabled]}
            onPress={handleScheduleNotifications}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{t.config.scheduleBtn}</Text>
          </Pressable>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{t.config.notificationsUnavailable}</Text>
          </View>
        )}
      </View>

      {/* Base de datos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.config.database}</Text>
        <Text style={styles.cardDesc}>{t.config.databaseDesc}</Text>

        <Pressable
          style={[styles.button, styles.buttonExport, isLoading && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t.config.exportBtn}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonImport, isLoading && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t.config.importBtn}</Text>
        </Pressable>

        {status && (
          <View style={[styles.statusBox, status.startsWith('Error') && styles.statusBoxError]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    backgroundColor: '#F9F9F9',
  },
  langBtnActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F0FF',
  },
  langFlag: { fontSize: 20 },
  langLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  langLabelActive: { color: '#007AFF', fontWeight: '700' },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonNotif: { backgroundColor: '#FF9500' },
  buttonExport: { backgroundColor: '#007AFF' },
  buttonImport: { backgroundColor: '#34C759' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  statusBoxError: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
});
