import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
        }}
      />

      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}