import { Stack } from "expo-router";
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ContactsProvider } from '../utils/context';

export default function RootLayout() {
  return (
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
  );
}