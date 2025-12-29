import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      await signInWithEmail(email, password);
      router.replace("/(dashboard)");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            {/* Logo / Brand */}
            <View className="mb-10 items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
                <Ionicons name="document-text" size={32} color="white" />
              </View>
              <Text className="text-3xl font-bold text-slate-900">Lexport</Text>
              <Text className="mt-2 text-center text-slate-500">
                AI-Powered Legal Documents
              </Text>
            </View>

            {/* Login Form */}
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="mb-6 text-center text-xl font-semibold text-slate-900">
                Welcome back
              </Text>

              {error ? (
                <View className="mb-4 rounded-xl bg-red-50 p-3">
                  <Text className="text-center text-sm text-red-600">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="gap-4">
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                <Button onPress={handleEmailLogin} loading={loading}>
                  Sign In
                </Button>
              </View>

              {/* Divider */}
              <View className="my-6 flex-row items-center">
                <View className="h-px flex-1 bg-slate-200" />
                <Text className="mx-4 text-sm text-slate-400">or</Text>
                <View className="h-px flex-1 bg-slate-200" />
              </View>

              {/* Google Sign In */}
              <Button
                variant="outline"
                onPress={handleGoogleLogin}
                icon={<Ionicons name="logo-google" size={20} color="#1e293b" />}
              >
                Continue with Google
              </Button>
            </View>

            {/* Register Link */}
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-slate-500">Don't have an account? </Text>
              <Link href="/register" asChild>
                <Pressable>
                  <Text className="font-semibold text-primary-600">
                    Sign up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
