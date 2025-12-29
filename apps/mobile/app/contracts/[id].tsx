import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{ id: string; title: string; content: string; order: number }>;
    signatureBlock: string;
  };
  metadata: Record<string, unknown> | null;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface SignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
  signed_at: string | null;
  expires_at: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft", icon: "document-outline" },
  pending_signature: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Signature", icon: "time-outline" },
  partially_signed: { bg: "bg-blue-100", text: "text-blue-700", label: "Partially Signed", icon: "checkmark" },
  signed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Fully Signed", icon: "checkmark-done" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed", icon: "checkmark-circle" },
  expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired", icon: "alert-circle" },
};

const TYPE_LABELS: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_oneway: "One-Way NDA",
  nda_one_way: "One-Way NDA",
  contractor_agreement: "Contractor Agreement",
  independent_contractor: "Contractor Agreement",
  consulting_agreement: "Consulting Agreement",
  safe_note: "SAFE Note",
  freelance_service: "Service Agreement",
  service_agreement: "Service Agreement",
};

const SIGNER_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  viewed: { bg: "bg-blue-100", text: "text-blue-700", label: "Viewed" },
  signed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Signed" },
  declined: { bg: "bg-red-100", text: "text-red-700", label: "Declined" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    try {
      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // Fetch signature requests
      const { data: signaturesData, error: signaturesError } = await supabase
        .from("signature_requests")
        .select("id, signer_name, signer_email, signer_role, status, signed_at, expires_at, created_at")
        .eq("contract_id", id)
        .order("created_at", { ascending: true });

      if (signaturesError) throw signaturesError;
      setSignatureRequests(signaturesData || []);
    } catch (err) {
      console.error("Error fetching contract:", err);
      Alert.alert("Error", "Failed to load contract");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContract();
  }, [fetchContract]);

  const handleSendReminder = async (requestId: string, signerName: string) => {
    Alert.alert(
      "Send Reminder",
      `Send a reminder to ${signerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setSendingReminder(requestId);
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/contracts/${id}/remind`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatureRequestId: requestId }),
              });

              if (!response.ok) throw new Error("Failed to send reminder");
              Alert.alert("Success", "Reminder sent successfully");
            } catch (err) {
              Alert.alert("Error", "Failed to send reminder");
            } finally {
              setSendingReminder(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenInWeb = () => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://lexport.ai";
    Linking.openURL(`${webUrl}/contracts/${id}/edit`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#529ec6" />
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
          <Text className="mt-4 text-lg font-semibold text-slate-900">Contract not found</Text>
          <Button className="mt-6" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft;
  const typeLabel = TYPE_LABELS[contract.type] || contract.type;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
              {contract.title}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <View className={`rounded-full px-2 py-0.5 ${status.bg}`}>
                <Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text>
              </View>
              <Text className="text-xs text-slate-400">{typeLabel}</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={handleOpenInWeb} className="p-2">
          <Ionicons name="open-outline" size={22} color="#529ec6" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Contract Info */}
        <View className="px-6 py-4">
          <Card>
            <CardContent>
              <View className="flex-row items-center gap-3 mb-4">
                <View className={`h-12 w-12 items-center justify-center rounded-full ${status.bg}`}>
                  <Ionicons name={status.icon as any} size={24} color={status.text.replace("text-", "#").replace("-700", "").replace("-600", "")} />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-900">{status.label}</Text>
                  <Text className="text-sm text-slate-500">
                    Updated {formatTimeAgo(contract.updated_at)}
                  </Text>
                </View>
              </View>

              <View className="border-t border-slate-100 pt-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-slate-500">Jurisdiction</Text>
                  <Text className="text-sm font-medium text-slate-900">{contract.jurisdiction}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-slate-500">Created</Text>
                  <Text className="text-sm font-medium text-slate-900">{formatDate(contract.created_at)}</Text>
                </View>
                {contract.payment_required && (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-slate-500">Payment</Text>
                    <Text className="text-sm font-medium text-emerald-600">
                      ${(contract.payment_amount || 0).toLocaleString()} {contract.payment_currency}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Signature Requests */}
        <View className="px-6 py-2">
          <Text className="text-lg font-semibold text-slate-900 mb-3">
            Signers ({signatureRequests.length})
          </Text>

          {signatureRequests.length === 0 ? (
            <Card>
              <CardContent>
                <View className="items-center py-6">
                  <Ionicons name="people-outline" size={32} color="#94a3b8" />
                  <Text className="mt-2 text-slate-500">No signers added yet</Text>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onPress={handleOpenInWeb}
                  >
                    Add Signers in Web App
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : (
            <View className="gap-3">
              {signatureRequests.map((request) => {
                const signerStatus = SIGNER_STATUS[request.status] || SIGNER_STATUS.pending;
                const isPending = request.status === "pending" || request.status === "viewed";

                return (
                  <Card key={request.id}>
                    <CardContent>
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-full ${
                            request.status === "signed"
                              ? "bg-emerald-100"
                              : request.status === "declined"
                              ? "bg-red-100"
                              : "bg-amber-100"
                          }`}
                        >
                          <Ionicons
                            name={
                              request.status === "signed"
                                ? "checkmark-circle"
                                : request.status === "declined"
                                ? "close-circle"
                                : "time"
                            }
                            size={20}
                            color={
                              request.status === "signed"
                                ? "#059669"
                                : request.status === "declined"
                                ? "#dc2626"
                                : "#d97706"
                            }
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <View className={`rounded-full px-2 py-0.5 ${signerStatus.bg}`}>
                              <Text className={`text-xs font-medium ${signerStatus.text}`}>
                                {signerStatus.label}
                              </Text>
                            </View>
                            {request.signer_role && (
                              <Text className="text-xs text-slate-400">{request.signer_role}</Text>
                            )}
                          </View>
                          <Text className="mt-1 font-medium text-slate-900">{request.signer_name}</Text>
                          <Text className="text-sm text-slate-500">{request.signer_email}</Text>
                          {request.signed_at && (
                            <Text className="mt-1 text-xs text-emerald-600">
                              Signed on {formatDate(request.signed_at)}
                            </Text>
                          )}
                          {isPending && (
                            <Text className="mt-1 text-xs text-slate-400">
                              Expires {formatDate(request.expires_at)}
                            </Text>
                          )}
                        </View>
                        {isPending && (
                          <Pressable
                            onPress={() => handleSendReminder(request.id, request.signer_name)}
                            disabled={sendingReminder === request.id}
                            className="p-2"
                          >
                            {sendingReminder === request.id ? (
                              <ActivityIndicator size="small" color="#529ec6" />
                            ) : (
                              <Ionicons name="notifications-outline" size={20} color="#529ec6" />
                            )}
                          </Pressable>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Contract Preview */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-slate-900 mb-3">Content Preview</Text>
          <Card>
            <CardContent>
              {contract.content?.preamble && (
                <View className="mb-4">
                  <Text className="text-xs font-medium text-slate-400 uppercase mb-1">Preamble</Text>
                  <Text className="text-sm text-slate-700" numberOfLines={3}>
                    {contract.content.preamble}
                  </Text>
                </View>
              )}

              {contract.content?.clauses && contract.content.clauses.length > 0 && (
                <View>
                  <Text className="text-xs font-medium text-slate-400 uppercase mb-2">
                    Clauses ({contract.content.clauses.length})
                  </Text>
                  {contract.content.clauses.slice(0, 3).map((clause, index) => (
                    <View key={clause.id || index} className="mb-2">
                      <Text className="text-sm font-medium text-slate-900">{clause.title}</Text>
                    </View>
                  ))}
                  {contract.content.clauses.length > 3 && (
                    <Text className="text-sm text-slate-400">
                      +{contract.content.clauses.length - 3} more clauses
                    </Text>
                  )}
                </View>
              )}

              <Pressable
                onPress={handleOpenInWeb}
                className="flex-row items-center justify-center mt-4 pt-4 border-t border-slate-100"
              >
                <Text className="text-sm font-medium text-primary-600 mr-1">View Full Contract</Text>
                <Ionicons name="arrow-forward" size={16} color="#529ec6" />
              </Pressable>
            </CardContent>
          </Card>
        </View>

        {/* Actions */}
        <View className="px-6 py-4 pb-8">
          <Button onPress={handleOpenInWeb} icon={<Ionicons name="create-outline" size={18} color="white" />}>
            Edit in Web App
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
