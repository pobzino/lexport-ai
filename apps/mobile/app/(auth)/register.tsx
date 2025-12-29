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

export default function RegisterScreen() {
  const { signUpWithEmail, signInWithGoogle, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      await signUpWithEmail(email, password, { name });
      router.replace("/(dashboard)");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setError("");
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
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
            <View className="mb-8 items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
                <Ionicons name="document-text" size={32} color="white" />
              </View>
              <Text className="text-3xl font-bold text-slate-900">Lexport</Text>
            </View>

            {/* Register Form */}
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="mb-6 text-center text-xl font-semibold text-slate-900">
                Create your account
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
                  label="Full Name"
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  autoCapitalize="words"
                />

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
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                <Input
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                <Button onPress={handleRegister} loading={loading}>
                  Create Account
                </Button>
              </View>

              {/* Divider */}
              <View className="my-6 flex-row items-center">
                <View className="h-px flex-1 bg-slate-200" />
                <Text className="mx-4 text-sm text-slate-400">or</Text>
                <View className="h-px flex-1 bg-slate-200" />
              </View>

              {/* Google Sign Up */}
              <Button
                variant="outline"
                onPress={handleGoogleSignUp}
                icon={<Ionicons name="logo-google" size={20} color="#1e293b" />}
              >
                Continue with Google
              </Button>
            </View>

            {/* Login Link */}
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-slate-500">Already have an account? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text className="font-semibold text-primary-600">
                    Sign in
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
