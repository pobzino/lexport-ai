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
            className="items-center pb-10 pt-12"
          >
            {/* Lexport Logo */}
            <View className="flex-row items-center mb-2">
              <Text className="text-3xl font-bold text-white tracking-tight">Lex</Text>
              <Text className="text-3xl font-bold text-accent-400 tracking-tight">port</Text>
            </View>
            <Text className="text-primary-300 text-sm">
              Get started in seconds
            </Text>
          </LinearGradient>

          {/* Register Form Card */}
          <View className="flex-1 px-6 -mt-5">
            <View className="rounded-3xl bg-white p-7 shadow-card" style={{
              shadowColor: '#202e46',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 8,
            }}>
              <Text className="mb-6 text-center text-xl font-bold text-primary-900">
                Create your account
              </Text>

              {error ? (
                <View className="mb-5 rounded-2xl bg-red-50 p-4 border border-red-100">
                  <Text className="text-center text-sm font-medium text-red-600">
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

                <View className="mt-2">
                  <Button onPress={handleRegister} loading={loading}>
                    Create Account
                  </Button>
                </View>
              </View>

              {/* Divider */}
              <View className="my-6 flex-row items-center">
                <View className="h-px flex-1 bg-primary-100" />
                <Text className="mx-4 text-sm font-medium text-primary-400">or</Text>
                <View className="h-px flex-1 bg-primary-100" />
              </View>

              {/* Google Sign Up */}
              <Button
                variant="outline"
                onPress={handleGoogleSignUp}
                icon={<Ionicons name="logo-google" size={20} color="#202e46" />}
              >
                Continue with Google
              </Button>
            </View>

            {/* Login Link */}
            <View className="mt-6 flex-row items-center justify-center pb-6">
              <Text className="text-primary-500">Already have an account? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text className="font-bold text-accent-400">
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
