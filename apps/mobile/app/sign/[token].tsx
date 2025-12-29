import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import SignatureScreen, { SignatureViewRef } from "react-native-signature-canvas";

interface SignatureRequest {
  id: string;
  signerName: string;
  signerEmail: string;
  signerRole?: string;
  status: string;
  expiresAt: string;
}

interface Clause {
  id: string;
  title: string;
  content: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  content: {
    preamble: string;
    recitals: string;
    clauses: Clause[];
    signatureBlock: string;
  };
  paymentRequired?: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lexport.ai";

export default function SignContractScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const signatureRef = useRef<SignatureViewRef>(null);

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signed, setSigned] = useState(false);

  // UI state
  const [step, setStep] = useState<"review" | "sign">("review");
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [hasReadContract, setHasReadContract] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");

  // Fetch signature request
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`${API_BASE}/api/sign/${token}`);

        if (!response.ok) {
          const data = await response.json();
          if (data.alreadySigned) {
            setAlreadySigned(true);
          }
          throw new Error(data.error || "Failed to load");
        }

        const data = await response.json();
        setSignatureRequest(data.signatureRequest);
        setContract(data.contract);
        setFullName(data.signatureRequest?.signerName || "");

        // Expand all clauses by default
        if (data.contract?.content?.clauses) {
          setExpandedClauses(new Set(data.contract.content.clauses.map((c: Clause) => c.id)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchData();
    }
  }, [token]);

  const toggleClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignatureData(null);
  };

  const handleSignatureEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleSignatureOK = (signature: string) => {
    setSignatureData(signature);
  };

  const handleSign = async () => {
    if (!signatureData) {
      Alert.alert("Error", "Please sign your name");
      return;
    }

    if (!agreedToTerms) {
      Alert.alert("Error", "Please agree to the terms");
      return;
    }

    if (!identityConfirmed) {
      Alert.alert("Error", "Please confirm your identity");
      return;
    }

    setSigning(true);

    try {
      const response = await fetch(`${API_BASE}/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData,
          signatureType: "draw",
          agreedToTerms: true,
          identityConfirmed: true,
          identityConfirmationText: `I confirm that I am ${signatureRequest?.signerName} and I am authorized to sign this document.`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign");
      }

      setSigned(true);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to sign");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#529ec6" />
        <Text className="mt-4 text-primary-600">Loading contract...</Text>
      </SafeAreaView>
    );
  }

  if (alreadySigned) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-6">
          <Ionicons name="checkmark-circle" size={48} color="#10b981" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">Already Signed</Text>
        <Text className="text-center text-primary-500">
          This contract has already been signed. No further action is required.
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !contract || !signatureRequest) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">Unable to Load</Text>
        <Text className="text-center text-primary-500">{error || "Contract not found"}</Text>
      </SafeAreaView>
    );
  }

  if (signed) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-success-100 mb-6">
          <Ionicons name="checkmark-circle" size={48} color="#10b981" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">Contract Signed!</Text>
        <Text className="text-center text-primary-500 mb-6">
          Thank you, {signatureRequest.signerName}. Your signature has been recorded.
        </Text>
        <Text className="text-sm text-primary-400 text-center">
          A copy will be sent to {signatureRequest.signerEmail}
        </Text>
      </SafeAreaView>
    );
  }

  if (step === "review") {
    return (
      <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
        {/* Header */}
        <View className="bg-white px-4 py-4 border-b border-primary-100">
          <Text className="text-lg font-bold text-primary-900">{contract.title}</Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-sm text-primary-500">Signing as </Text>
            <Text className="text-sm font-medium text-accent-500">{signatureRequest.signerName}</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
          {/* Preamble */}
          <View className="bg-white rounded-xl p-4 mb-4 border border-primary-100">
            <Text className="text-primary-700 leading-6">{contract.content.preamble}</Text>
          </View>

          {/* Recitals */}
          {contract.content.recitals && (
            <View className="bg-primary-50 rounded-xl p-4 mb-4 border border-primary-100">
              <Text className="text-xs font-semibold text-primary-400 uppercase mb-2">Recitals</Text>
              <Text className="text-primary-700 leading-6">{contract.content.recitals}</Text>
            </View>
          )}

          {/* Clauses */}
          <View className="mb-4">
            {contract.content.clauses.map((clause) => (
              <Pressable
                key={clause.id}
                onPress={() => toggleClause(clause.id)}
                className="bg-white rounded-xl mb-2 border border-primary-100 overflow-hidden"
              >
                <View className="flex-row items-center justify-between p-4">
                  <Text className="font-semibold text-primary-900 flex-1">{clause.title}</Text>
                  <Ionicons
                    name={expandedClauses.has(clause.id) ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#829ab1"
                  />
                </View>
                {expandedClauses.has(clause.id) && (
                  <View className="px-4 pb-4">
                    <Text className="text-primary-600 leading-6">{clause.content}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Payment Notice */}
          {contract.paymentRequired && (
            <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="card" size={20} color="#3b82f6" />
                <Text className="font-medium text-blue-900">Payment Required</Text>
              </View>
              <Text className="text-sm text-blue-700">
                A payment of ${contract.paymentAmount?.toLocaleString()} {contract.paymentCurrency?.toUpperCase()} will be collected after you sign.
              </Text>
            </View>
          )}

          {/* Continue to Sign */}
          <View className="pb-8">
            <Button
              onPress={() => {
                setHasReadContract(true);
                setStep("sign");
              }}
              icon={<Ionicons name="create" size={18} color="white" />}
            >
              Continue to Sign
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Sign step
  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center bg-white px-4 py-4 border-b border-primary-100">
        <Pressable onPress={() => setStep("review")} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#202e46" />
        </Pressable>
        <View className="ml-2">
          <Text className="text-lg font-bold text-primary-900">Sign Document</Text>
          <Text className="text-sm text-primary-500">{contract.title}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Your Name */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-primary-100">
          <Text className="text-sm font-medium text-primary-700 mb-2">Your Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full legal name"
            className="border border-primary-200 rounded-xl px-4 py-3 text-primary-900 text-lg"
            placeholderTextColor="#829ab1"
          />
        </View>

        {/* Signature Canvas */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-primary-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-medium text-primary-700">Draw Your Signature</Text>
            <Pressable onPress={handleClear} className="flex-row items-center gap-1">
              <Ionicons name="trash-outline" size={16} color="#829ab1" />
              <Text className="text-sm text-primary-500">Clear</Text>
            </Pressable>
          </View>
          <View className="border-2 border-dashed border-primary-200 rounded-xl overflow-hidden h-40 bg-white">
            <SignatureScreen
              ref={signatureRef}
              onEnd={handleSignatureEnd}
              onOK={handleSignatureOK}
              webStyle={`.m-signature-pad { box-shadow: none; border: none; }
                         .m-signature-pad--body { border: none; }
                         .m-signature-pad--footer { display: none; }`}
              backgroundColor="rgb(255, 255, 255)"
              penColor="#1e293b"
            />
          </View>
          {!signatureData && (
            <Text className="text-xs text-primary-400 mt-2">Use your finger to sign above</Text>
          )}
          {signatureData && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text className="text-xs text-success-600 ml-1">Signature captured</Text>
            </View>
          )}
        </View>

        {/* Confirmations */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-primary-100">
          <View className="flex-row items-center justify-between py-3 border-b border-primary-100">
            <Text className="text-sm text-primary-700 flex-1 pr-4">
              I confirm that I am {signatureRequest.signerName} and authorized to sign
            </Text>
            <Switch
              value={identityConfirmed}
              onValueChange={setIdentityConfirmed}
              trackColor={{ false: "#d9e2ec", true: "#10b981" }}
            />
          </View>
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-sm text-primary-700 flex-1 pr-4">
              I agree my electronic signature is legally binding
            </Text>
            <Switch
              value={agreedToTerms}
              onValueChange={setAgreedToTerms}
              trackColor={{ false: "#d9e2ec", true: "#10b981" }}
            />
          </View>
        </View>

        {/* Security Note */}
        <View className="flex-row items-start gap-2 mb-4 px-2">
          <Ionicons name="shield-checkmark" size={16} color="#829ab1" />
          <Text className="text-xs text-primary-500 flex-1">
            Your signature is protected with bank-level encryption and compliant with ESIGN, UETA, and UK eIDAS.
          </Text>
        </View>

        {/* Sign Button */}
        <View className="pb-8">
          <Button
            onPress={handleSign}
            disabled={signing || !signatureData || !agreedToTerms || !identityConfirmed}
            loading={signing}
            icon={<Ionicons name="checkmark-circle" size={18} color="white" />}
          >
            {signing ? "Signing..." : "Sign Document"}
          </Button>
          <Text className="text-xs text-primary-400 text-center mt-3">
            Expires {new Date(signatureRequest.expiresAt).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
