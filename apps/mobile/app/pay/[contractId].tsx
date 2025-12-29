import { View, Text, ActivityIndicator, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useStripe, CardField, StripeProvider } from "@stripe/stripe-react-native";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lexport.ai";
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

interface PaymentInfo {
  contractId: string;
  contractTitle: string;
  amount: number;
  currency: string;
  clientSecret: string;
  paymentIntentId: string;
  depositAmount?: number;
  isDeposit?: boolean;
}

function PaymentContent() {
  const { contractId, token, signed } = useLocalSearchParams<{
    contractId: string;
    token?: string;
    signed?: string;
  }>();

  const { confirmPayment, initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  useEffect(() => {
    async function fetchPaymentInfo() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${API_BASE}/api/contracts/${contractId}/payment`, {
          method: "POST",
          headers,
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to initialize payment");
        }

        const data = await response.json();
        setPaymentInfo(data);

        // Initialize Payment Sheet (alternative to Card input)
        if (data.clientSecret) {
          await initPaymentSheet({
            paymentIntentClientSecret: data.clientSecret,
            merchantDisplayName: "Lexport",
            style: "automatic",
            googlePay: { merchantCountryCode: "US", testEnv: true },
            applePay: { merchantCountryCode: "US" },
          });
        }
      } catch (err) {
        console.error("Error fetching payment info:", err);
        setError(err instanceof Error ? err.message : "Failed to load payment");
      } finally {
        setLoading(false);
      }
    }

    if (contractId) {
      fetchPaymentInfo();
    }
  }, [contractId, token, initPaymentSheet]);

  const handlePayWithCard = async () => {
    if (!paymentInfo?.clientSecret || !cardComplete) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: confirmError, paymentIntent } = await confirmPayment(
        paymentInfo.clientSecret,
        {
          paymentMethodType: "Card",
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === "Succeeded") {
        setSuccess(true);
      } else {
        throw new Error("Payment was not successful");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handlePayWithSheet = async () => {
    if (!paymentInfo?.clientSecret) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: sheetError } = await presentPaymentSheet();

      if (sheetError) {
        if (sheetError.code === "Canceled") {
          // User canceled - not an error
          return;
        }
        throw new Error(sheetError.message);
      }

      setSuccess(true);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#529ec6" />
        <Text className="mt-4 text-primary-600">Setting up payment...</Text>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-6">
          <Ionicons name="checkmark-circle" size={48} color="#10b981" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">Payment Complete!</Text>
        <Text className="text-center text-primary-500 mb-6">
          Your payment of {formatAmount(paymentInfo?.amount || 0, paymentInfo?.currency || "usd")} has been processed.
        </Text>
        <Button onPress={() => router.replace(`/contracts/${contractId}`)}>
          View Contract
        </Button>
      </SafeAreaView>
    );
  }

  if (error && !paymentInfo) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <Ionicons name="card-outline" size={48} color="#dc2626" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">Payment Error</Text>
        <Text className="text-center text-primary-500 mb-6">{error}</Text>
        <Button variant="outline" onPress={() => router.back()}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center bg-white px-4 py-4 border-b border-primary-100">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={24} color="#202e46" />
        </Pressable>
        <View className="ml-2 flex-1">
          <Text className="text-lg font-bold text-primary-900">Payment</Text>
          <Text className="text-sm text-primary-500" numberOfLines={1}>
            {paymentInfo?.contractTitle}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="lock-closed" size={14} color="#10b981" />
          <Text className="text-xs text-success-600">Secure</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <View className="bg-white rounded-2xl p-6 mb-6 border border-primary-100">
          <Text className="text-sm text-primary-500 mb-1">
            {paymentInfo?.isDeposit ? "Deposit Amount" : "Amount Due"}
          </Text>
          <Text className="text-4xl font-bold text-primary-900">
            {formatAmount(paymentInfo?.amount || 0, paymentInfo?.currency || "usd")}
          </Text>
          {paymentInfo?.isDeposit && paymentInfo?.depositAmount && (
            <Text className="text-sm text-primary-400 mt-2">
              Balance of {formatAmount((paymentInfo.amount / (paymentInfo.depositAmount / 100)) - paymentInfo.amount, paymentInfo.currency)} due later
            </Text>
          )}
        </View>

        {/* Card Input */}
        <View className="bg-white rounded-2xl p-6 mb-6 border border-primary-100">
          <Text className="text-sm font-medium text-primary-700 mb-4">Card Details</Text>
          <CardField
            postalCodeEnabled={false}
            placeholders={{
              number: "4242 4242 4242 4242",
            }}
            cardStyle={{
              backgroundColor: "#FFFFFF",
              textColor: "#202e46",
              borderWidth: 1,
              borderColor: "#d9e2ec",
              borderRadius: 12,
              fontSize: 16,
              placeholderColor: "#829ab1",
            }}
            style={{
              width: "100%",
              height: 50,
              marginVertical: 8,
            }}
            onCardChange={(details) => {
              setCardComplete(details.complete);
            }}
          />

          {error && (
            <View className="flex-row items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl">
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text className="text-sm text-red-700 flex-1">{error}</Text>
            </View>
          )}
        </View>

        {/* Pay Button */}
        <Button
          onPress={handlePayWithCard}
          disabled={processing || !cardComplete}
          loading={processing}
          icon={<Ionicons name="card" size={18} color="white" />}
        >
          {processing ? "Processing..." : `Pay ${formatAmount(paymentInfo?.amount || 0, paymentInfo?.currency || "usd")}`}
        </Button>

        {/* Or divider */}
        <View className="flex-row items-center gap-4 my-6">
          <View className="flex-1 h-px bg-primary-200" />
          <Text className="text-sm text-primary-400">or</Text>
          <View className="flex-1 h-px bg-primary-200" />
        </View>

        {/* Apple Pay / Google Pay */}
        <Button
          variant="outline"
          onPress={handlePayWithSheet}
          disabled={processing}
          icon={<Ionicons name="wallet" size={18} color="#202e46" />}
        >
          Pay with Apple Pay / Google Pay
        </Button>

        {/* Security Notice */}
        <View className="flex-row items-start gap-3 mt-8 px-2">
          <Ionicons name="shield-checkmark" size={18} color="#829ab1" />
          <Text className="text-xs text-primary-500 flex-1">
            Your payment is secured with 256-bit encryption. We never store your full card details.
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-4 mt-4">
          <Ionicons name="logo-apple" size={20} color="#829ab1" />
          <Ionicons name="logo-google" size={20} color="#829ab1" />
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-primary-400">Powered by</Text>
            <Text className="text-xs font-semibold text-primary-500">Stripe</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PaymentScreen() {
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      urlScheme="lexport"
      merchantIdentifier="merchant.com.lexport"
    >
      <PaymentContent />
    </StripeProvider>
  );
}
