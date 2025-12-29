import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Href } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { generateContract, GenerateContractParams } from "@/lib/api";
import { useState, useEffect } from "react";

const JURISDICTIONS = [
  { id: "us_california", label: "California" },
  { id: "us_texas", label: "Texas" },
  { id: "us_new_york", label: "New York" },
  { id: "uk", label: "United Kingdom" },
];

const CONTRACT_TYPE_INFO: Record<string, {
  title: string;
  partyA: string;
  partyB: string;
  icon: string;
  color: string;
}> = {
  nda_mutual: { title: "Mutual NDA", partyA: "Disclosing Party", partyB: "Receiving Party", icon: "lock-closed", color: "#7c3aed" },
  nda_one_way: { title: "One-Way NDA", partyA: "Disclosing Party", partyB: "Receiving Party", icon: "key", color: "#2563eb" },
  contractor_agreement: { title: "Contractor Agreement", partyA: "Client", partyB: "Contractor", icon: "construct", color: "#059669" },
  independent_contractor: { title: "Contractor Agreement", partyA: "Client", partyB: "Contractor", icon: "construct", color: "#059669" },
  consulting_agreement: { title: "Consulting Agreement", partyA: "Client", partyB: "Consultant", icon: "briefcase", color: "#d97706" },
  safe_note: { title: "SAFE Note", partyA: "Company", partyB: "Investor", icon: "trending-up", color: "#0891b2" },
  service_agreement: { title: "Service Agreement", partyA: "Client", partyB: "Freelancer", icon: "document-text", color: "#6366f1" },
  freelance_service: { title: "Service Agreement", partyA: "Client", partyB: "Freelancer", icon: "document-text", color: "#6366f1" },
};

interface PartyInfo {
  name: string;
  email: string;
  company?: string;
  title?: string;
  address?: string;
}

interface FormState {
  // Common
  jurisdiction: string;
  effectiveDate: string;
  purpose: string;

  // Parties
  partyA: PartyInfo;
  partyB: PartyInfo;

  // NDA specific
  confidentialityPeriod: string;
  includeNonSolicit: boolean;
  includeNonCompete: boolean;

  // Contractor/Consulting specific
  servicesDescription: string;
  paymentAmount: string;
  paymentFrequency: string;
  includeIPAssignment: boolean;
  includeConfidentiality: boolean;

  // SAFE specific
  investmentAmount: string;
  valuationCap: string;
  discountRate: string;
  safeType: string;
  proRataRights: boolean;

  // Freelance specific
  projectName: string;
  projectDescription: string;
  deliverables: string;
  totalAmount: string;
  revisionRounds: string;
}

export default function GenerateContractScreen() {
  const { type, contractId } = useLocalSearchParams<{ type: string; contractId?: string }>();
  const contractType = type || "nda_mutual";
  const typeInfo = CONTRACT_TYPE_INFO[contractType] || CONTRACT_TYPE_INFO.nda_mutual;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    jurisdiction: "us_california",
    effectiveDate: new Date().toISOString().split("T")[0],
    purpose: "",
    partyA: { name: "", email: "", company: "" },
    partyB: { name: "", email: "", company: "" },
    confidentialityPeriod: "2",
    includeNonSolicit: false,
    includeNonCompete: false,
    servicesDescription: "",
    paymentAmount: "",
    paymentFrequency: "monthly",
    includeIPAssignment: true,
    includeConfidentiality: true,
    investmentAmount: "",
    valuationCap: "",
    discountRate: "20",
    safeType: "valuation_cap",
    proRataRights: false,
    projectName: "",
    projectDescription: "",
    deliverables: "",
    totalAmount: "",
    revisionRounds: "2",
  });

  // Pre-fill user info
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setForm(prev => ({
          ...prev,
          partyA: {
            ...prev.partyA,
            name: user.user_metadata?.name || user.user_metadata?.full_name || "",
            email: user.email || "",
          },
        }));
      }
    }
    fetchProfile();
  }, []);

  const updateForm = (updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const updatePartyA = (updates: Partial<PartyInfo>) => {
    setForm(prev => ({ ...prev, partyA: { ...prev.partyA, ...updates } }));
  };

  const updatePartyB = (updates: Partial<PartyInfo>) => {
    setForm(prev => ({ ...prev, partyB: { ...prev.partyB, ...updates } }));
  };

  const getTotalSteps = () => {
    if (contractType === "safe_note") return 3;
    if (contractType.includes("freelance") || contractType.includes("service")) return 4;
    return 3;
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.partyA.name || !form.partyA.email) {
        Alert.alert("Error", "Please fill in your details");
        return false;
      }
    }
    if (step === 2) {
      if (!form.partyB.name || !form.partyB.email) {
        Alert.alert("Error", "Please fill in the counterparty details");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, getTotalSteps()));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const buildMetadata = (): Record<string, unknown> => {
    const basePartyA = {
      name: form.partyA.name,
      email: form.partyA.email,
      role: typeInfo.partyA.toLowerCase().replace(/\s+/g, "_"),
      company: form.partyA.company,
      title: form.partyA.title,
      address: form.partyA.address,
    };

    const basePartyB = {
      name: form.partyB.name,
      email: form.partyB.email,
      role: typeInfo.partyB.toLowerCase().replace(/\s+/g, "_"),
      company: form.partyB.company,
      title: form.partyB.title,
      address: form.partyB.address,
    };

    if (contractType.includes("nda")) {
      return {
        contractType,
        disclosingParty: basePartyA,
        receivingParty: basePartyB,
        effectiveDate: form.effectiveDate,
        confidentialityPeriod: parseInt(form.confidentialityPeriod) || 2,
        purpose: form.purpose || "Business discussions and potential collaboration",
        jurisdiction: form.jurisdiction,
        includeNonSolicit: form.includeNonSolicit,
        includeNonCompete: form.includeNonCompete,
      };
    }

    if (contractType.includes("contractor") || contractType === "independent_contractor") {
      return {
        contractType: "independent_contractor",
        client: basePartyA,
        contractor: basePartyB,
        effectiveDate: form.effectiveDate,
        servicesDescription: form.servicesDescription || "Professional services as agreed",
        paymentAmount: parseFloat(form.paymentAmount) || 0,
        paymentFrequency: form.paymentFrequency,
        paymentTerms: 30,
        jurisdiction: form.jurisdiction,
        includeIPAssignment: form.includeIPAssignment,
        includeConfidentiality: form.includeConfidentiality,
        terminationNoticeDays: 14,
      };
    }

    if (contractType === "consulting_agreement") {
      return {
        contractType,
        client: basePartyA,
        consultant: basePartyB,
        effectiveDate: form.effectiveDate,
        consultingScope: form.servicesDescription || "Consulting services as agreed",
        hourlyRate: parseFloat(form.paymentAmount) || 0,
        paymentTerms: 30,
        jurisdiction: form.jurisdiction,
        includeIPAssignment: form.includeIPAssignment,
        includeConfidentiality: form.includeConfidentiality,
        includeNonCompete: form.includeNonCompete,
      };
    }

    if (contractType === "safe_note") {
      return {
        contractType,
        company: basePartyA,
        investor: basePartyB,
        investmentAmount: parseFloat(form.investmentAmount) || 0,
        valuationCap: form.valuationCap ? parseFloat(form.valuationCap) : undefined,
        discountRate: form.discountRate ? parseFloat(form.discountRate) : undefined,
        safeType: form.safeType,
        proRataRights: form.proRataRights,
        effectiveDate: form.effectiveDate,
        jurisdiction: form.jurisdiction,
      };
    }

    // Freelance / Service
    return {
      contractType: "freelance_service",
      client: basePartyA,
      freelancer: basePartyB,
      projectName: form.projectName || "Project",
      projectDescription: form.projectDescription || form.purpose || "Services as agreed",
      deliverables: [{
        description: form.deliverables || "Deliverables as specified",
        dueDate: form.effectiveDate,
      }],
      totalAmount: parseFloat(form.totalAmount) || 0,
      paymentSchedule: "completion",
      revisionRounds: parseInt(form.revisionRounds) || 2,
      effectiveDate: form.effectiveDate,
      jurisdiction: form.jurisdiction,
      includeIPAssignment: form.includeIPAssignment,
    };
  };

  const handleGenerate = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const metadata = buildMetadata();
      const params: GenerateContractParams = {
        contractType: metadata.contractType as string,
        metadata,
      };

      const result = await generateContract(params);

      if (result.success && result.contract) {
        Alert.alert(
          "Contract Generated!",
          "Your contract has been created with AI-generated content.",
          [
            {
              text: "View Contract",
              onPress: () => router.replace(`/contracts/${result.contract.id}` as Href),
            },
          ]
        );
      }
    } catch (err) {
      console.error("Generation error:", err);
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to generate contract");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-primary-900 mb-2">Your Details ({typeInfo.partyA})</Text>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Name *</Text>
        <TextInput
          value={form.partyA.name}
          onChangeText={(text) => updatePartyA({ name: text })}
          placeholder="Your full name"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Email *</Text>
        <TextInput
          value={form.partyA.email}
          onChangeText={(text) => updatePartyA({ email: text })}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Company (optional)</Text>
        <TextInput
          value={form.partyA.company}
          onChangeText={(text) => updatePartyA({ company: text })}
          placeholder="Company name"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-2">Jurisdiction *</Text>
        <View className="flex-row flex-wrap gap-2">
          {JURISDICTIONS.map((j) => (
            <Pressable
              key={j.id}
              onPress={() => updateForm({ jurisdiction: j.id })}
              className={`rounded-full px-4 py-2 ${
                form.jurisdiction === j.id ? "bg-accent-400" : "bg-white border border-primary-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  form.jurisdiction === j.id ? "text-white" : "text-primary-600"
                }`}
              >
                {j.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-primary-900 mb-2">Counterparty ({typeInfo.partyB})</Text>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Name *</Text>
        <TextInput
          value={form.partyB.name}
          onChangeText={(text) => updatePartyB({ name: text })}
          placeholder="Counterparty name"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Email *</Text>
        <TextInput
          value={form.partyB.email}
          onChangeText={(text) => updatePartyB({ email: text })}
          placeholder="counterparty@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-primary-700 mb-1">Company (optional)</Text>
        <TextInput
          value={form.partyB.company}
          onChangeText={(text) => updatePartyB({ company: text })}
          placeholder="Company name"
          className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
          placeholderTextColor="#829ab1"
        />
      </View>
    </View>
  );

  const renderContractSpecificFields = () => {
    if (contractType.includes("nda")) {
      return (
        <View className="gap-4">
          <Text className="text-lg font-semibold text-primary-900 mb-2">NDA Terms</Text>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-1">Purpose</Text>
            <TextInput
              value={form.purpose}
              onChangeText={(text) => updateForm({ purpose: text })}
              placeholder="e.g., Discussing potential partnership"
              multiline
              numberOfLines={3}
              className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900 min-h-[80px]"
              placeholderTextColor="#829ab1"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-1">Confidentiality Period (years)</Text>
            <TextInput
              value={form.confidentialityPeriod}
              onChangeText={(text) => updateForm({ confidentialityPeriod: text })}
              placeholder="2"
              keyboardType="number-pad"
              className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
              placeholderTextColor="#829ab1"
            />
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-medium text-primary-700">Include Non-Solicitation</Text>
            <Switch
              value={form.includeNonSolicit}
              onValueChange={(value) => updateForm({ includeNonSolicit: value })}
              trackColor={{ false: "#d9e2ec", true: "#10b981" }}
            />
          </View>

          {form.jurisdiction !== "us_california" && (
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-sm font-medium text-primary-700">Include Non-Compete</Text>
              <Switch
                value={form.includeNonCompete}
                onValueChange={(value) => updateForm({ includeNonCompete: value })}
                trackColor={{ false: "#d9e2ec", true: "#10b981" }}
              />
            </View>
          )}
        </View>
      );
    }

    if (contractType.includes("contractor") || contractType === "independent_contractor" || contractType === "consulting_agreement") {
      return (
        <View className="gap-4">
          <Text className="text-lg font-semibold text-primary-900 mb-2">Service Terms</Text>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-1">Services Description</Text>
            <TextInput
              value={form.servicesDescription}
              onChangeText={(text) => updateForm({ servicesDescription: text })}
              placeholder="Describe the services to be provided"
              multiline
              numberOfLines={4}
              className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900 min-h-[100px]"
              placeholderTextColor="#829ab1"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-1">Payment Amount ($)</Text>
            <TextInput
              value={form.paymentAmount}
              onChangeText={(text) => updateForm({ paymentAmount: text })}
              placeholder="5000"
              keyboardType="decimal-pad"
              className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
              placeholderTextColor="#829ab1"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-2">Payment Frequency</Text>
            <View className="flex-row flex-wrap gap-2">
              {["hourly", "monthly", "project", "milestone"].map((freq) => (
                <Pressable
                  key={freq}
                  onPress={() => updateForm({ paymentFrequency: freq })}
                  className={`rounded-full px-4 py-2 ${
                    form.paymentFrequency === freq ? "bg-accent-400" : "bg-white border border-primary-200"
                  }`}
                >
                  <Text className={`text-sm font-medium capitalize ${
                    form.paymentFrequency === freq ? "text-white" : "text-primary-600"
                  }`}>
                    {freq}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-medium text-primary-700">Include IP Assignment</Text>
            <Switch
              value={form.includeIPAssignment}
              onValueChange={(value) => updateForm({ includeIPAssignment: value })}
              trackColor={{ false: "#d9e2ec", true: "#10b981" }}
            />
          </View>
        </View>
      );
    }

    if (contractType === "safe_note") {
      return (
        <View className="gap-4">
          <Text className="text-lg font-semibold text-primary-900 mb-2">Investment Terms</Text>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-1">Investment Amount ($)</Text>
            <TextInput
              value={form.investmentAmount}
              onChangeText={(text) => updateForm({ investmentAmount: text })}
              placeholder="50000"
              keyboardType="decimal-pad"
              className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
              placeholderTextColor="#829ab1"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-primary-700 mb-2">SAFE Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { id: "valuation_cap", label: "Cap Only" },
                { id: "discount", label: "Discount Only" },
                { id: "cap_and_discount", label: "Cap + Discount" },
                { id: "mfn", label: "MFN" },
              ].map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => updateForm({ safeType: type.id })}
                  className={`rounded-full px-4 py-2 ${
                    form.safeType === type.id ? "bg-accent-400" : "bg-white border border-primary-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    form.safeType === type.id ? "text-white" : "text-primary-600"
                  }`}>
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {(form.safeType === "valuation_cap" || form.safeType === "cap_and_discount") && (
            <View>
              <Text className="text-sm font-medium text-primary-700 mb-1">Valuation Cap ($)</Text>
              <TextInput
                value={form.valuationCap}
                onChangeText={(text) => updateForm({ valuationCap: text })}
                placeholder="10000000"
                keyboardType="decimal-pad"
                className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
                placeholderTextColor="#829ab1"
              />
            </View>
          )}

          {(form.safeType === "discount" || form.safeType === "cap_and_discount") && (
            <View>
              <Text className="text-sm font-medium text-primary-700 mb-1">Discount Rate (%)</Text>
              <TextInput
                value={form.discountRate}
                onChangeText={(text) => updateForm({ discountRate: text })}
                placeholder="20"
                keyboardType="decimal-pad"
                className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
                placeholderTextColor="#829ab1"
              />
            </View>
          )}

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-medium text-primary-700">Pro Rata Rights</Text>
            <Switch
              value={form.proRataRights}
              onValueChange={(value) => updateForm({ proRataRights: value })}
              trackColor={{ false: "#d9e2ec", true: "#10b981" }}
            />
          </View>
        </View>
      );
    }

    // Freelance / Service
    return (
      <View className="gap-4">
        <Text className="text-lg font-semibold text-primary-900 mb-2">Project Details</Text>

        <View>
          <Text className="text-sm font-medium text-primary-700 mb-1">Project Name</Text>
          <TextInput
            value={form.projectName}
            onChangeText={(text) => updateForm({ projectName: text })}
            placeholder="Website Redesign"
            className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
            placeholderTextColor="#829ab1"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-primary-700 mb-1">Project Description</Text>
          <TextInput
            value={form.projectDescription}
            onChangeText={(text) => updateForm({ projectDescription: text })}
            placeholder="Describe the project scope"
            multiline
            numberOfLines={3}
            className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900 min-h-[80px]"
            placeholderTextColor="#829ab1"
            textAlignVertical="top"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-primary-700 mb-1">Deliverables</Text>
          <TextInput
            value={form.deliverables}
            onChangeText={(text) => updateForm({ deliverables: text })}
            placeholder="List the deliverables"
            multiline
            numberOfLines={3}
            className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900 min-h-[80px]"
            placeholderTextColor="#829ab1"
            textAlignVertical="top"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-primary-700 mb-1">Total Amount ($)</Text>
          <TextInput
            value={form.totalAmount}
            onChangeText={(text) => updateForm({ totalAmount: text })}
            placeholder="5000"
            keyboardType="decimal-pad"
            className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
            placeholderTextColor="#829ab1"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-primary-700 mb-1">Revision Rounds</Text>
          <TextInput
            value={form.revisionRounds}
            onChangeText={(text) => updateForm({ revisionRounds: text })}
            placeholder="2"
            keyboardType="number-pad"
            className="bg-white border border-primary-200 rounded-xl px-4 py-3 text-primary-900"
            placeholderTextColor="#829ab1"
          />
        </View>
      </View>
    );
  };

  const totalSteps = getTotalSteps();
  const isLastStep = step === totalSteps;

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-primary-100 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => step > 1 ? prevStep() : router.back()} className="p-2 -ml-2">
            <Ionicons name={step > 1 ? "arrow-back" : "close"} size={24} color="#202e46" />
          </Pressable>
          <View>
            <Text className="text-lg font-bold text-primary-900">Generate {typeInfo.title}</Text>
            <Text className="text-sm text-primary-500">Step {step} of {totalSteps}</Text>
          </View>
        </View>
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${typeInfo.color}20` }}
        >
          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
        </View>
      </View>

      {/* Progress Bar */}
      <View className="h-1 bg-primary-100">
        <View
          className="h-full bg-accent-400"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderContractSpecificFields()}
          {step === 4 && renderContractSpecificFields()}

          <View className="h-8" />
        </ScrollView>

        {/* Footer */}
        <View className="border-t border-primary-100 bg-white px-6 py-4">
          <Button
            onPress={isLastStep ? handleGenerate : nextStep}
            disabled={loading}
            icon={loading ? <ActivityIndicator size="small" color="white" /> : (
              isLastStep ? <Ionicons name="sparkles" size={18} color="white" /> :
              <Ionicons name="arrow-forward" size={18} color="white" />
            )}
          >
            {loading ? "Generating..." : isLastStep ? "Generate with AI" : "Continue"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
