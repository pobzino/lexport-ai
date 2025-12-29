import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";

const MENU_ITEMS = [
  {
    title: "Account",
    items: [
      { icon: "person", label: "Profile", href: "/settings/profile" },
      { icon: "notifications", label: "Notifications", href: "/settings/notifications" },
      { icon: "shield-checkmark", label: "Security", href: "/settings/security" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: "globe", label: "Default Jurisdiction", href: "/settings/jurisdiction" },
      { icon: "document-text", label: "Signature Style", href: "/settings/signature" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "help-circle", label: "Help Center", href: "/help" },
      { icon: "chatbubble", label: "Contact Us", href: "/contact" },
      { icon: "document", label: "Terms of Service", href: "/terms" },
      { icon: "lock-closed", label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      signOut();
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: signOut },
        ]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 py-5 shadow-sm" style={{
        shadowColor: '#202e46',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <Text className="text-2xl font-bold text-primary-900">Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View className="px-6 py-5">
          <Card>
            <CardContent>
              <View className="flex-row items-center gap-4">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent-100">
                  <Text className="text-2xl font-bold text-accent-500">
                    {user?.user_metadata?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-primary-900 text-lg">
                    {user?.user_metadata?.name || "User"}
                  </Text>
                  <Text className="text-sm text-primary-500">{user?.email}</Text>
                </View>
                <View className="rounded-full bg-success-100 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-success-700">
                    Free Plan
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Menu Sections */}
        {MENU_ITEMS.map((section) => (
          <View key={section.title} className="px-6 py-2">
            <Text className="mb-3 text-xs font-bold text-primary-400 uppercase tracking-wider">
              {section.title}
            </Text>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.label}
                    className={`flex-row items-center justify-between px-5 py-4 active:bg-primary-50 ${index !== section.items.length - 1
                        ? "border-b border-primary-100"
                        : ""
                      }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color="#627d98"
                        />
                      </View>
                      <Text className="font-medium text-primary-900">{item.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#829ab1" />
                  </Pressable>
                ))}
              </CardContent>
            </Card>
          </View>
        ))}

        {/* Sign Out */}
        <View className="px-6 py-8">
          <Button variant="outline" onPress={handleSignOut}>
            Sign Out
          </Button>
        </View>

        {/* Version */}
        <View className="items-center pb-10">
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-bold text-primary-400">Lex</Text>
            <Text className="text-sm font-bold text-accent-400">port</Text>
          </View>
          <Text className="text-xs text-primary-300">Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
