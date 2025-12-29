import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Href } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

const CONTRACT_TYPES = [
  {
    id: "nda_mutual",
    title: "Mutual NDA",
    description: "Both parties keep info confidential",
    icon: "lock-closed",
    color: "#7c3aed",
  },
  {
    id: "nda_one_way",
    title: "One-Way NDA",
    description: "One party discloses to the other",
    icon: "key",
    color: "#2563eb",
  },
  {
    id: "contractor_agreement",
    title: "Contractor Agreement",
    description: "Hire independent contractors",
    icon: "construct",
    color: "#059669",
  },
  {
    id: "consulting_agreement",
    title: "Consulting Agreement",
    description: "Engage professional consultants",
    icon: "briefcase",
    color: "#d97706",
  },
  {
    id: "safe_note",
    title: "SAFE Note",
    description: "Simple investment agreement",
    icon: "trending-up",
    color: "#0891b2",
  },
  {
    id: "service_agreement",
    title: "Service Agreement",
    description: "Freelance service contracts",
    icon: "document-text",
    color: "#6366f1",
  },
];

const JURISDICTIONS = [
  { id: "CA", label: "California, USA" },
  { id: "TX", label: "Texas, USA" },
  { id: "NY", label: "New York, USA" },
  { id: "UK", label: "United Kingdom" },
];

interface FormData {
  // Common fields
  title: string;
  jurisdiction: string;
  // Party A (usually the user's company)
  partyAName: string;
  partyAEmail: string;
  // Party B (the counterparty)
  partyBName: string;
  partyBEmail: string;
  // Purpose/Description
  purpose: string;
}

export default function NewContractScreen() {
  const { type: preselectedType } = useLocalSearchParams<{ type?: string }>();

  const [step, setStep] = useState<"type" | "details">(preselectedType ? "details" : "type");
  const [selectedType, setSelectedType] = useState(preselectedType || "");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    jurisdiction: "CA",
    partyAName: "",
    partyAEmail: "",
    partyBName: "",
    partyBEmail: "",
    purpose: "",
  });

  // Fetch user profile to pre-fill party A
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({
          ...prev,
          partyAName: user.user_metadata?.name || "",
          partyAEmail: user.email || "",
        }));
      }
    }
    fetchProfile();
  }, []);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setStep("details");

    // Set default title based on type
    const typeInfo = CONTRACT_TYPES.find(t => t.id === typeId);
    if (typeInfo && !formData.title) {
      setFormData(prev => ({
        ...prev,
        title: `${typeInfo.title} - ${new Date().toLocaleDateString()}`,
      }));
    }
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a contract title");
      return;
    }
    if (!formData.partyBName.trim() || !formData.partyBEmail.trim()) {
      Alert.alert("Error", "Please enter the counterparty details");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create contract with basic data
      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          title: formData.title,
          type: selectedType,
          jurisdiction: formData.jurisdiction,
          status: "draft",
          user_id: user.id,
          content: {
            preamble: "",
            recitals: "",
            clauses: [],
            signatureBlock: "",
          },
          metadata: {
            party_a: {
              name: formData.partyAName,
              email: formData.partyAEmail,
            },
            party_b: {
              name: formData.partyBName,
              email: formData.partyBEmail,
            },
            purpose: formData.purpose,
            created_from: "mobile_app",
          },
          payment_required: false,
          payment_currency: "USD",
          payment_status: "pending",
          reminder_enabled: true,
          reminder_interval_days: 3,
          require_sequential_signing: false,
          payment_structure: "full",
          deposit_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        "Contract Created!",
        "Your contract draft has been created. Would you like to generate the full contract content using AI?",
        [
          {
            text: "Later",
            style: "cancel",
            onPress: () => router.replace(`/contracts/${contract.id}` as Href),
          },
          {
            text: "Generate Now",
            onPress: () => {
              // Navigate to contract detail and open web for AI generation
              router.replace(`/contracts/${contract.id}` as Href);
            },
          },
        ]
      );
    } catch (err) {
      console.error("Error creating contract:", err);
      Alert.alert("Error", "Failed to create contract. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = CONTRACT_TYPES.find(t => t.id === selectedType);

  if (step === "type") {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="close" size={24} color="#1e293b" />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">New Contract</Text>
        </View>

        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          <Text className="text-slate-500 mb-4">Select a contract type to get started</Text>

          <View className="gap-3">
            {CONTRACT_TYPES.map((type) => (
              <Card key={type.id} onPress={() => handleSelectType(type.id)}>
                <CardContent>
                  <View className="flex-row items-center gap-4">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${type.color}15` }}
                    >
                      <Ionicons name={type.icon as any} size={24} color={type.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-slate-900">{type.title}</Text>
                      <Text className="text-sm text-slate-500">{type.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setStep("type")} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <View>
            <Text className="text-lg font-bold text-slate-900">Contract Details</Text>
            <Text className="text-sm text-slate-500">{selectedTypeInfo?.title}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
          {/* Contract Title */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-1">Contract Title *</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., NDA with Acme Corp"
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Jurisdiction */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">Jurisdiction *</Text>
            <View className="flex-row flex-wrap gap-2">
              {JURISDICTIONS.map((j) => (
                <Pressable
                  key={j.id}
                  onPress={() => setFormData(prev => ({ ...prev, jurisdiction: j.id }))}
                  className={`rounded-full px-4 py-2 ${
                    formData.jurisdiction === j.id ? "bg-primary-600" : "bg-white border border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.jurisdiction === j.id ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {j.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Your Details (Party A) */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-900 mb-3">Your Details</Text>
            <View className="gap-3">
              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Your Name / Company *</Text>
                <TextInput
                  value={formData.partyAName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, partyAName: text }))}
                  placeholder="Your name or company name"
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Your Email *</Text>
                <TextInput
                  value={formData.partyAEmail}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, partyAEmail: text }))}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* Counterparty Details (Party B) */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-900 mb-3">Counterparty Details</Text>
            <View className="gap-3">
              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Name / Company *</Text>
                <TextInput
                  value={formData.partyBName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, partyBName: text }))}
                  placeholder="Counterparty name or company"
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Email *</Text>
                <TextInput
                  value={formData.partyBEmail}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, partyBEmail: text }))}
                  placeholder="counterparty@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* Purpose */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-slate-700 mb-1">Purpose (optional)</Text>
            <TextInput
              value={formData.purpose}
              onChangeText={(text) => setFormData(prev => ({ ...prev, purpose: text }))}
              placeholder="Brief description of the contract purpose"
              multiline
              numberOfLines={3}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 min-h-[80px]"
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
          </View>

          {/* Create Button */}
          <View className="pb-8">
            <Button
              onPress={handleCreate}
              disabled={loading}
              icon={loading ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="document-text" size={18} color="white" />}
            >
              {loading ? "Creating..." : "Create Draft"}
            </Button>
            <Text className="text-xs text-slate-400 text-center mt-3">
              You can generate AI content after creating the draft
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
