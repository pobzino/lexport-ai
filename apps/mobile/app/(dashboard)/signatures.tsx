import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import { Card, CardContent, Button, SkeletonList } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import * as Haptics from "expo-haptics";

interface SignatureRequest {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
  token: string;
  signed_at: string | null;
  declined_at: string | null;
  viewed_at: string | null;
  expires_at: string;
  created_at: string;
  contract: {
    title: string;
    type: string;
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Awaiting" },
  viewed: { bg: "bg-accent-100", text: "text-accent-600", label: "Viewed" },
  signed: { bg: "bg-success-100", text: "text-success-700", label: "Signed" },
  declined: { bg: "bg-red-100", text: "text-red-700", label: "Declined" },
};

const FILTERS = ["All", "Pending", "Signed", "Declined"];
const FILTER_MAP: Record<string, string> = {
  All: "",
  Pending: "pending",
  Signed: "signed",
  Declined: "declined",
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function SignaturesScreen() {
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchSignatureRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get signature requests for contracts owned by this user
      const { data, error } = await supabase
        .from("signature_requests")
        .select(`
          id,
          contract_id,
          signer_name,
          signer_email,
          signer_role,
          status,
          token,
          signed_at,
          declined_at,
          viewed_at,
          expires_at,
          created_at,
          contract:contracts!inner (
            title,
            type,
            user_id
          )
        `)
        .eq("contract.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter and map the data
      const mappedData = (data || []).map((req: any) => ({
        ...req,
        contract: {
          title: req.contract?.title || "Unknown Contract",
          type: req.contract?.type || "unknown",
        },
      }));

      setRequests(mappedData);
    } catch (err) {
      console.error("Error fetching signature requests:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSignatureRequests();
  }, [fetchSignatureRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSignatureRequests();
  }, [fetchSignatureRequests]);

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    const filterStatus = FILTER_MAP[activeFilter];
    if (filterStatus && request.status !== filterStatus) return false;
    return true;
  });

  // Calculate stats
  const stats = {
    pending: requests.filter(r => r.status === "pending" || r.status === "viewed").length,
    signed: requests.filter(r => r.status === "signed").length,
    declined: requests.filter(r => r.status === "declined").length,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
        <View className="bg-white px-6 py-5">
          <View className="h-8 w-32 bg-gray-200 rounded-lg" />
        </View>
        <View className="px-6 py-4">
          <SkeletonList count={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 py-5 shadow-sm" style={{
        shadowColor: '#202e46',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <Text className="text-2xl font-bold text-primary-900">Signatures</Text>
        <Text className="text-primary-500">Track signature requests</Text>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3 px-6 py-4 bg-white border-b border-primary-100">
        <View className="flex-1 rounded-2xl bg-amber-50 p-4">
          <Text className="text-2xl font-bold text-amber-600">{stats.pending}</Text>
          <Text className="text-xs font-semibold text-amber-700">Pending</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-success-50 p-4">
          <Text className="text-2xl font-bold text-success-600">{stats.signed}</Text>
          <Text className="text-xs font-semibold text-success-700">Signed</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-red-50 p-4">
          <Text className="text-2xl font-bold text-red-600">{stats.declined}</Text>
          <Text className="text-xs font-semibold text-red-700">Declined</Text>
        </View>
      </View>

      {/* Filters */}
      <View className="flex-row gap-2 px-6 py-4">
        {FILTERS.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            className={`rounded-full px-5 py-2.5 ${activeFilter === filter ? "bg-accent-400" : "bg-white shadow-sm"
              }`}
            style={activeFilter !== filter ? {
              shadowColor: '#202e46',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            } : {}}
          >
            <Text
              className={`text-sm font-semibold ${activeFilter === filter ? "text-white" : "text-primary-600"
                }`}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#529ec6" />
        }
      >
        {filteredRequests.length === 0 ? (
          <View className="items-center py-16">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <Ionicons name="create-outline" size={40} color="#829ab1" />
            </View>
            <Text className="mb-2 text-lg font-bold text-primary-900">
              {requests.length === 0 ? "No signature requests yet" : "No matching requests"}
            </Text>
            <Text className="mb-6 text-center text-primary-500 px-8">
              {requests.length === 0
                ? "Send a contract for signature to get started"
                : "Try adjusting your filter"}
            </Text>
            {requests.length === 0 && (
              <Button
                onPress={() => router.push("/contracts")}
                icon={<Ionicons name="document-text" size={18} color="white" />}
              >
                View Contracts
              </Button>
            )}
          </View>
        ) : (
          <View className="gap-3 pb-6">
            {filteredRequests.map((request) => {
              const status = STATUS_STYLES[request.status] || STATUS_STYLES.pending;
              const isExpired = new Date(request.expires_at) < new Date() && request.status === "pending";

              return (
                <Card
                  key={request.id}
                  onPress={() => router.push(`/contracts/${request.contract_id}` as Href)}
                >
                  <CardContent>
                    <View className="flex-row items-start gap-4">
                      <View
                        className={`h-12 w-12 items-center justify-center rounded-2xl ${request.status === "signed"
                          ? "bg-success-100"
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
                          size={26}
                          color={
                            request.status === "signed"
                              ? "#10b981"
                              : request.status === "declined"
                                ? "#dc2626"
                                : "#f59e0b"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <View className={`rounded-full px-2.5 py-1 ${status.bg}`}>
                            <Text className={`text-xs font-semibold ${status.text}`}>
                              {isExpired ? "Expired" : status.label}
                            </Text>
                          </View>
                          {request.signer_role && (
                            <Text className="text-xs font-medium text-primary-400">
                              {request.signer_role}
                            </Text>
                          )}
                        </View>
                        <Text className="mt-2 font-bold text-primary-900">
                          {request.signer_name}
                        </Text>
                        <Text className="text-sm text-primary-500">
                          {request.signer_email}
                        </Text>
                        <Text className="mt-2 text-sm text-primary-400" numberOfLines={1}>
                          {request.contract.title}
                        </Text>
                        <Text className="mt-1 text-xs text-primary-400">
                          Sent {formatTimeAgo(request.created_at)}
                          {request.signed_at && ` • Signed ${formatDate(request.signed_at)}`}
                          {request.declined_at && ` • Declined ${formatDate(request.declined_at)}`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#829ab1" />
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
