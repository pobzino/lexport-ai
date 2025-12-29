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
import { LinearGradient } from "expo-linear-gradient";

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
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Premium Header with Gradient */}
          <LinearGradient
            colors={['#202e46', '#2a3a54']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="items-center pb-12 pt-16"
          >
            {/* Lexport Logo */}
            <View className="flex-row items-center mb-3">
              <Text className="text-4xl font-bold text-white tracking-tight">Lex</Text>
              <Text className="text-4xl font-bold text-accent-400 tracking-tight">port</Text>
            </View>
            <Text className="text-primary-300 text-base">
              AI-Powered Legal Documents
            </Text>
          </LinearGradient>

          {/* Login Form Card */}
          <View className="flex-1 px-6 -mt-6">
            <View className="rounded-3xl bg-white p-8 shadow-card" style={{
              shadowColor: '#202e46',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 8,
            }}>
              <Text className="mb-8 text-center text-2xl font-bold text-primary-900">
                Welcome back
              </Text>

              {error ? (
                <View className="mb-6 rounded-2xl bg-red-50 p-4 border border-red-100">
                  <Text className="text-center text-sm font-medium text-red-600">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="gap-5">
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

                <View className="mt-2">
                  <Button onPress={handleEmailLogin} loading={loading}>
                    Sign In
                  </Button>
                </View>
              </View>

              {/* Divider */}
              <View className="my-8 flex-row items-center">
                <View className="h-px flex-1 bg-primary-100" />
                <Text className="mx-4 text-sm font-medium text-primary-400">or</Text>
                <View className="h-px flex-1 bg-primary-100" />
              </View>

              {/* Google Sign In */}
              <Button
                variant="outline"
                onPress={handleGoogleLogin}
                icon={<Ionicons name="logo-google" size={20} color="#202e46" />}
              >
                Continue with Google
              </Button>
            </View>

            {/* Register Link */}
            <View className="mt-8 flex-row items-center justify-center pb-8">
              <Text className="text-primary-500">Don't have an account? </Text>
              <Link href="/register" asChild>
                <Pressable>
                  <Text className="font-bold text-accent-400">
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
