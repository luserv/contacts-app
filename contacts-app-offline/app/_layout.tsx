import { Stack } from "expo-router";
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ContactsProvider, DB_NAME, initializeDatabase } from '../utils/context';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName={DB_NAME}
      onInit={initializeDatabase}
    >
      <ContactsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle={'dark-content'} />
          <Stack>
            <Stack.Screen name="(tabs)" options={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
            }} />
            <Stack.Screen
              name="contact/[id]"
              options={{
                headerShown: true,
              }}
            />
          </Stack>
        </GestureHandlerRootView>
      </ContactsProvider>
    </SQLiteProvider>
  );
}