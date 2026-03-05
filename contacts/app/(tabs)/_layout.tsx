import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';


export default function TabsLayout() {
  return (
    
      <Tabs>
        <Tabs.Screen name="home" options={{ 
          headerTitle: "Contacts",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color}/> 
          }} 
        />
        <Tabs.Screen name="config" options={{
          headerTitle: "Config", 
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> 
          }} 
        />
      </Tabs>


  );
}
