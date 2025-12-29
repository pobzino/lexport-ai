import { Stack } from "expo-router";

export default function ContractsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="new"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
