import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="age-and-safety" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
