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
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="border-b border-slate-200 bg-white px-6 py-4">
        <Text className="text-2xl font-bold text-slate-900">Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View className="px-6 py-4">
          <Card>
            <CardContent>
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-100">
                  <Text className="text-xl font-bold text-primary-600">
                    {user?.user_metadata?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-900">
                    {user?.user_metadata?.name || "User"}
                  </Text>
                  <Text className="text-sm text-slate-500">{user?.email}</Text>
                </View>
                <View className="rounded-full bg-emerald-100 px-3 py-1">
                  <Text className="text-xs font-medium text-emerald-700">
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
            <Text className="mb-2 text-sm font-medium text-slate-500">
              {section.title}
            </Text>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.label}
                    className={`flex-row items-center justify-between px-4 py-3 active:bg-slate-50 ${
                      index !== section.items.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color="#64748b"
                      />
                      <Text className="text-slate-900">{item.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </Pressable>
                ))}
              </CardContent>
            </Card>
          </View>
        ))}

        {/* Sign Out */}
        <View className="px-6 py-6">
          <Button variant="outline" onPress={handleSignOut}>
            Sign Out
          </Button>
        </View>

        {/* Version */}
        <View className="items-center pb-8">
          <Text className="text-sm text-slate-400">Lexport v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
