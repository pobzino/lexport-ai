import { View, Text, ScrollView, Pressable, TextInput, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import { Card, CardContent, Button, SkeletonList, EmptyState } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import * as Haptics from "expo-haptics";

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  created_at: string;
  updated_at: string;
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-primary-100", text: "text-primary-700", label: "Draft" },
  pending_signature: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  partially_signed: { bg: "bg-accent-100", text: "text-accent-600", label: "Partial" },
  signed: { bg: "bg-success-100", text: "text-success-700", label: "Signed" },
  completed: { bg: "bg-success-100", text: "text-success-700", label: "Completed" },
  expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired" },
};

const TYPE_LABELS: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_oneway: "One-Way NDA",
  nda_one_way: "One-Way NDA",
  contractor_agreement: "Contractor",
  independent_contractor: "Contractor",
  consulting_agreement: "Consulting",
  safe_note: "SAFE Note",
  freelance_service: "Service",
  service_agreement: "Service",
};

const FILTERS = ["All", "Draft", "Pending", "Signed"];
const FILTER_MAP: Record<string, string> = {
  All: "",
  Draft: "draft",
  Pending: "pending_signature",
  Signed: "signed",
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

export default function ContractsScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchContracts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, type, jurisdiction, status, created_at, updated_at, payment_required, payment_amount, payment_currency, payment_status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (err) {
      console.error("Error fetching contracts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContracts();
  }, [fetchContracts]);

  // Filter contracts
  const filteredContracts = contracts.filter((contract) => {
    // Status filter
    const filterStatus = FILTER_MAP[activeFilter];
    if (filterStatus && contract.status !== filterStatus) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const typeLabel = TYPE_LABELS[contract.type] || contract.type;
      if (
        !contract.title.toLowerCase().includes(query) &&
        !typeLabel.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
        <View className="bg-white px-6 py-5">
          <View className="h-8 w-32 bg-gray-200 rounded-lg" />
        </View>
        <View className="px-6 py-4">
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between bg-white px-6 py-5 shadow-sm" style={{
        shadowColor: '#202e46',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <Text className="text-2xl font-bold text-primary-900">Contracts</Text>
        <Button
          size="sm"
          onPress={() => router.push("/contracts/new" as Href)}
          icon={<Ionicons name="add" size={18} color="white" />}
        >
          New
        </Button>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white border-b border-primary-100">
        <View className="flex-row items-center bg-primary-50 rounded-2xl px-4 py-3">
          <Ionicons name="search" size={18} color="#829ab1" />
          <TextInput
            placeholder="Search contracts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-primary-900"
            placeholderTextColor="#829ab1"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#829ab1" />
            </Pressable>
          )}
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

      {/* Contract List */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#529ec6" />
        }
      >
        {filteredContracts.length === 0 ? (
          <View className="items-center py-16">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <Ionicons name="document-text-outline" size={40} color="#829ab1" />
            </View>
            <Text className="mb-2 text-lg font-bold text-primary-900">
              {contracts.length === 0 ? "No contracts yet" : "No matching contracts"}
            </Text>
            <Text className="mb-6 text-center text-primary-500 px-8">
              {contracts.length === 0
                ? "Create your first contract to get started"
                : "Try adjusting your search or filters"}
            </Text>
            {contracts.length === 0 && (
              <Button
                onPress={() => router.push("/contracts/new" as Href)}
                icon={<Ionicons name="add" size={18} color="white" />}
              >
                New Contract
              </Button>
            )}
          </View>
        ) : (
          <View className="gap-3 pb-6">
            {filteredContracts.map((contract) => {
              const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft;
              const typeLabel = TYPE_LABELS[contract.type] || contract.type;

              return (
                <Card key={contract.id} onPress={() => router.push(`/contracts/${contract.id}` as Href)}>
                  <CardContent>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <View className={`rounded-full px-2.5 py-1 ${status.bg}`}>
                            <Text className={`text-xs font-semibold ${status.text}`}>
                              {status.label}
                            </Text>
                          </View>
                          <Text className="text-xs font-medium text-primary-400">{typeLabel}</Text>
                        </View>
                        <Text className="mt-2 font-semibold text-primary-900">
                          {contract.title}
                        </Text>
                        <Text className="mt-1 text-sm text-primary-500">
                          Updated {formatTimeAgo(contract.updated_at)}
                        </Text>
                        {contract.payment_required && contract.payment_amount && (
                          <View className="flex-row items-center mt-2">
                            <Ionicons name="cash-outline" size={14} color="#10b981" />
                            <Text className="ml-1 text-sm font-semibold text-success-500">
                              ${contract.payment_amount.toLocaleString()}
                            </Text>
                          </View>
                        )}
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
