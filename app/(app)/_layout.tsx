import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="deck" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="safety/index" />
      <Stack.Screen name="safety/emergency" />
      <Stack.Screen name="safety/guidelines" />
      <Stack.Screen name="report" />
      <Stack.Screen name="report-result" />
      <Stack.Screen name="rate/[sessionId]" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="group/[id]/chat" />
      <Stack.Screen name="group/[id]/host-check-in" />
      <Stack.Screen name="check-in/[groupId]" />
      <Stack.Screen name="check-in/result" />
      <Stack.Screen
        name="activity/[id]"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
