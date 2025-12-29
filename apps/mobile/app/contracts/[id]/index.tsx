import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, Alert, RefreshControl, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { sendContractForSignature, deleteContract, analyzeContractRisk, sendReminder } from "@/lib/api";

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

interface RiskItem {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  clause?: string;
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

  // Actions state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAddSignerModal, setShowAddSignerModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);

  // Add signer form state
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerRole, setSignerRole] = useState("");

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
              await sendReminder(id!, requestId);
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

  const handleViewPdf = () => {
    router.push(`/contracts/${id}/pdf`);
  };

  const handleEdit = () => {
    router.push(`/contracts/${id}/edit`);
  };

  const handleReview = () => {
    router.push(`/contracts/${id}/review`);
  };

  const handlePayment = () => {
    router.push(`/pay/${id}`);
  };

  const handleAnalyzeRisk = async () => {
    setShowActionsMenu(false);
    setAnalyzingRisk(true);
    setShowRiskModal(true);
    try {
      const result = await analyzeContractRisk(id!);
      setRisks(result.risks || []);
    } catch (err) {
      console.error("Risk analysis error:", err);
      Alert.alert("Error", "Failed to analyze contract risks");
      setShowRiskModal(false);
    } finally {
      setAnalyzingRisk(false);
    }
  };

  const handleDeleteContract = () => {
    setShowActionsMenu(false);
    Alert.alert(
      "Delete Contract",
      "Are you sure you want to delete this contract? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteContract(id!);
              Alert.alert("Success", "Contract deleted", [
                { text: "OK", onPress: () => router.replace("/contracts") },
              ]);
            } catch (err) {
              Alert.alert("Error", "Failed to delete contract");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAddSigner = () => {
    setShowActionsMenu(false);
    setShowAddSignerModal(true);
  };

  const handleSubmitSigner = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      Alert.alert("Error", "Please enter signer name and email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      await sendContractForSignature(id!, [
        {
          name: signerName.trim(),
          email: signerEmail.trim(),
          role: signerRole.trim() || "Signer",
        },
      ]);
      Alert.alert("Success", "Signature request sent!");
      setShowAddSignerModal(false);
      setSignerName("");
      setSignerEmail("");
      setSignerRole("");
      fetchContract(); // Refresh to show new signer
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send signature request");
    } finally {
      setSending(false);
    }
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
  const isFullySigned = contract.status === "signed" || contract.status === "completed";
  const isDraft = contract.status === "draft";
  const hasPendingSigners = signatureRequests.some((r) => r.status === "pending" || r.status === "viewed");

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center gap-3 flex-1">
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
        <Pressable onPress={() => setShowActionsMenu(true)} className="p-2">
          <Ionicons name="ellipsis-vertical" size={22} color="#1e293b" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View className="flex-row px-6 py-4 gap-3">
          <Pressable
            onPress={handleViewPdf}
            className="flex-1 bg-white border border-slate-200 rounded-xl py-3 items-center"
          >
            <Ionicons name="document-text-outline" size={24} color="#529ec6" />
            <Text className="text-sm font-medium text-slate-700 mt-1">View PDF</Text>
          </Pressable>

          {isDraft && (
            <Pressable
              onPress={handleEdit}
              className="flex-1 bg-white border border-slate-200 rounded-xl py-3 items-center"
            >
              <Ionicons name="create-outline" size={24} color="#529ec6" />
              <Text className="text-sm font-medium text-slate-700 mt-1">Edit</Text>
            </Pressable>
          )}

          {isDraft && (
            <Pressable
              onPress={handleAddSigner}
              className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
            >
              <Ionicons name="send-outline" size={24} color="white" />
              <Text className="text-sm font-medium text-white mt-1">Send</Text>
            </Pressable>
          )}

          {isFullySigned && (
            <Pressable
              onPress={() => {
                const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://lexport.ai";
                Linking.openURL(`${webUrl}/api/contracts/${id}/certificate`);
              }}
              className="flex-1 bg-emerald-600 rounded-xl py-3 items-center"
            >
              <Ionicons name="ribbon-outline" size={24} color="white" />
              <Text className="text-sm font-medium text-white mt-1">Certificate</Text>
            </Pressable>
          )}

          {contract.payment_required && contract.payment_status !== "paid" && (
            <Pressable
              onPress={handlePayment}
              className="flex-1 bg-amber-500 rounded-xl py-3 items-center"
            >
              <Ionicons name="card-outline" size={24} color="white" />
              <Text className="text-sm font-medium text-white mt-1">Pay Now</Text>
            </Pressable>
          )}
        </View>

        {/* Contract Info */}
        <View className="px-6 py-2">
          <Card>
            <CardContent>
              <View className="flex-row items-center gap-3 mb-4">
                <View className={`h-12 w-12 items-center justify-center rounded-full ${status.bg}`}>
                  <Ionicons name={status.icon as keyof typeof Ionicons.glyphMap} size={24} color="#529ec6" />
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
                  <>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm text-slate-500">Amount</Text>
                      <Text className="text-sm font-medium text-emerald-600">
                        ${(contract.payment_amount || 0).toLocaleString()} {contract.payment_currency?.toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-500">Payment Status</Text>
                      <View className={`rounded-full px-2 py-0.5 ${
                        contract.payment_status === "paid" ? "bg-emerald-100" : "bg-amber-100"
                      }`}>
                        <Text className={`text-xs font-medium ${
                          contract.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"
                        }`}>
                          {contract.payment_status === "paid" ? "Paid" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Signature Requests */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-slate-900">
              Signers ({signatureRequests.length})
            </Text>
            {signatureRequests.length > 0 && !isFullySigned && (
              <Pressable
                onPress={handleAddSigner}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="add-circle-outline" size={18} color="#529ec6" />
                <Text className="text-sm font-medium text-primary-600">Add</Text>
              </Pressable>
            )}
          </View>

          {signatureRequests.length === 0 ? (
            <Card>
              <CardContent>
                <View className="items-center py-6">
                  <Ionicons name="people-outline" size={32} color="#94a3b8" />
                  <Text className="mt-2 text-slate-500">No signers added yet</Text>
                  <Button
                    size="sm"
                    className="mt-4"
                    onPress={handleAddSigner}
                    icon={<Ionicons name="person-add-outline" size={16} color="white" />}
                  >
                    Add Signer
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
                onPress={handleViewPdf}
                className="flex-row items-center justify-center mt-4 pt-4 border-t border-slate-100"
              >
                <Text className="text-sm font-medium text-primary-600 mr-1">View Full Contract</Text>
                <Ionicons name="arrow-forward" size={16} color="#529ec6" />
              </Pressable>
            </CardContent>
          </Card>
        </View>

        {/* Bottom Actions */}
        <View className="px-6 py-4 pb-8 gap-3">
          {isDraft && (
            <Button onPress={handleEdit} icon={<Ionicons name="create-outline" size={18} color="white" />}>
              Edit Contract
            </Button>
          )}
          <Button onPress={handleOpenInWeb} variant="outline" icon={<Ionicons name="open-outline" size={18} color="#1e293b" />}>
            Open in Web App
          </Button>
        </View>
      </ScrollView>

      {/* Actions Menu Modal */}
      <Modal
        visible={showActionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowActionsMenu(false)}
        >
          <View className="bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3" />
            <View className="pb-8 px-4">
              <Text className="text-lg font-semibold text-slate-900 mb-4 px-2">Actions</Text>

              <Pressable
                onPress={handleViewPdf}
                className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
              >
                <Ionicons name="document-text-outline" size={24} color="#529ec6" />
                <Text className="text-base text-slate-900">View PDF</Text>
              </Pressable>

              <Pressable
                onPress={handleAnalyzeRisk}
                className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
              >
                <Ionicons name="shield-checkmark-outline" size={24} color="#529ec6" />
                <Text className="text-base text-slate-900">Analyze Risks</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowActionsMenu(false);
                  handleReview();
                }}
                className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#529ec6" />
                <Text className="text-base text-slate-900">Review & Comments</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowActionsMenu(false);
                  handleEdit();
                }}
                className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
              >
                <Ionicons name="create-outline" size={24} color="#529ec6" />
                <Text className="text-base text-slate-900">Edit Contract</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowActionsMenu(false);
                  handleOpenInWeb();
                }}
                className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
              >
                <Ionicons name="open-outline" size={24} color="#529ec6" />
                <Text className="text-base text-slate-900">Open in Web App</Text>
              </Pressable>

              {!isFullySigned && (
                <Pressable
                  onPress={handleAddSigner}
                  className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
                >
                  <Ionicons name="person-add-outline" size={24} color="#529ec6" />
                  <Text className="text-base text-slate-900">Send for Signature</Text>
                </Pressable>
              )}

              {isFullySigned && (
                <Pressable
                  onPress={() => {
                    setShowActionsMenu(false);
                    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://lexport.ai";
                    Linking.openURL(`${webUrl}/api/contracts/${id}/certificate`);
                  }}
                  className="flex-row items-center gap-4 py-4 px-2 border-b border-slate-100"
                >
                  <Ionicons name="ribbon-outline" size={24} color="#10b981" />
                  <Text className="text-base text-slate-900">Download Certificate</Text>
                </Pressable>
              )}

              <Pressable
                onPress={handleDeleteContract}
                className="flex-row items-center gap-4 py-4 px-2"
              >
                <Ionicons name="trash-outline" size={24} color="#dc2626" />
                <Text className="text-base text-red-600">Delete Contract</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Add Signer Modal */}
      <Modal
        visible={showAddSignerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSignerModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3" />
            <View className="px-6 pb-8">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-slate-900">Add Signer</Text>
                <Pressable onPress={() => setShowAddSignerModal(false)} className="p-2">
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Full Name *</Text>
                  <TextInput
                    value={signerName}
                    onChangeText={setSignerName}
                    placeholder="John Smith"
                    className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Email *</Text>
                  <TextInput
                    value={signerEmail}
                    onChangeText={setSignerEmail}
                    placeholder="john@example.com"
                    className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-slate-700 mb-2">Role (Optional)</Text>
                  <TextInput
                    value={signerRole}
                    onChangeText={setSignerRole}
                    placeholder="e.g., Contractor, Client"
                    className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                  />
                </View>

                <Button
                  onPress={handleSubmitSigner}
                  loading={sending}
                  disabled={sending || !signerName.trim() || !signerEmail.trim()}
                  icon={<Ionicons name="send" size={18} color="white" />}
                >
                  {sending ? "Sending..." : "Send Signature Request"}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Risk Analysis Modal */}
      <Modal
        visible={showRiskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRiskModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3" />
            <View className="px-6 pb-8">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-slate-900">Risk Analysis</Text>
                <Pressable onPress={() => setShowRiskModal(false)} className="p-2">
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              {analyzingRisk ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color="#529ec6" />
                  <Text className="mt-4 text-slate-600">Analyzing contract...</Text>
                </View>
              ) : risks.length === 0 ? (
                <View className="items-center py-12">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                    <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                  </View>
                  <Text className="text-lg font-semibold text-slate-900">No Risks Found</Text>
                  <Text className="text-center text-slate-500 mt-2">
                    This contract appears to be well-structured with no significant concerns.
                  </Text>
                </View>
              ) : (
                <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                  {risks.map((risk, index) => (
                    <View
                      key={index}
                      className={`mb-4 p-4 rounded-xl ${
                        risk.severity === "critical"
                          ? "bg-red-50 border border-red-200"
                          : risk.severity === "warning"
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-blue-50 border border-blue-200"
                      }`}
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons
                          name={
                            risk.severity === "critical"
                              ? "alert-circle"
                              : risk.severity === "warning"
                              ? "warning"
                              : "information-circle"
                          }
                          size={20}
                          color={
                            risk.severity === "critical"
                              ? "#dc2626"
                              : risk.severity === "warning"
                              ? "#d97706"
                              : "#2563eb"
                          }
                        />
                        <Text
                          className={`font-semibold ${
                            risk.severity === "critical"
                              ? "text-red-700"
                              : risk.severity === "warning"
                              ? "text-amber-700"
                              : "text-blue-700"
                          }`}
                        >
                          {risk.title}
                        </Text>
                      </View>
                      <Text className="text-sm text-slate-700">{risk.description}</Text>
                      {risk.clause && (
                        <Text className="text-xs text-slate-500 mt-2 italic">
                          Related: {risk.clause}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading overlay for delete */}
      {deleting && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#529ec6" />
            <Text className="mt-4 text-slate-600">Deleting contract...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
