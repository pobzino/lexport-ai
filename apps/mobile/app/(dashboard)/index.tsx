import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
  payment_required: boolean;
  payment_amount: number | null;
}

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
    title: "Consulting",
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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  pending_signature: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  signed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Signed" },
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.user_metadata?.name?.split(" ")[0] ||
                    user?.email?.split("@")[0] ||
                    "there";

  const fetchContracts = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, type, status, updated_at, payment_required, payment_amount")
        .eq("user_id", currentUser.id)
        .order("updated_at", { ascending: false })
        .limit(5);

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

  // Calculate stats from real data
  const stats = {
    draft: contracts.filter(c => c.status === "draft").length,
    pending: contracts.filter(c => c.status === "pending_signature").length,
    signed: contracts.filter(c => c.status === "signed").length,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#529ec6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View>
            <Text className="text-2xl font-bold text-slate-900">
              Hi, {firstName}!
            </Text>
            <Text className="text-slate-500">
              What would you like to create today?
            </Text>
          </View>
          <Pressable
            onPress={signOut}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          >
            <Ionicons name="log-out-outline" size={20} color="#64748b" />
          </Pressable>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 px-6 py-2">
          <View className="flex-1 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-2xl font-bold text-slate-600">{stats.draft}</Text>
            <Text className="text-sm text-slate-500">Draft</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-2xl font-bold text-amber-600">{stats.pending}</Text>
            <Text className="text-sm text-slate-500">Pending</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white p-4 shadow-sm">
            <Text className="text-2xl font-bold text-emerald-600">{stats.signed}</Text>
            <Text className="text-sm text-slate-500">Signed</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="mb-4 text-lg font-semibold text-slate-900">
            Create New Contract
          </Text>
          <View className="gap-3">
            {CONTRACT_TYPES.map((type) => (
              <Card
                key={type.id}
                onPress={() => router.push(`/contracts/new?type=${type.id}` as Href)}
              >
                <CardContent>
                  <View className="flex-row items-center gap-4">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${type.color}15` }}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={24}
                        color={type.color}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-slate-900">
                        {type.title}
                      </Text>
                      <Text className="text-sm text-slate-500">
                        {type.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#94a3b8"
                    />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </View>

        {/* Recent Contracts */}
        <View className="px-6 py-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-slate-900">
              Recent Contracts
            </Text>
            {contracts.length > 0 && (
              <Pressable onPress={() => router.push("/contracts")}>
                <Text className="font-medium text-primary-600">View all</Text>
              </Pressable>
            )}
          </View>

          {contracts.length === 0 ? (
            <Card>
              <CardContent>
                <View className="items-center py-8">
                  <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Ionicons name="document-text-outline" size={32} color="#94a3b8" />
                  </View>
                  <Text className="mb-2 font-semibold text-slate-900">
                    No contracts yet
                  </Text>
                  <Text className="mb-4 text-center text-sm text-slate-500">
                    Create your first contract to get started
                  </Text>
                  <Button
                    size="sm"
                    onPress={() => router.push("/contracts/new" as Href)}
                    icon={<Ionicons name="add" size={18} color="white" />}
                  >
                    New Contract
                  </Button>
                </View>
              </CardContent>
            </Card>
          ) : (
            <View className="gap-3">
              {contracts.map((contract) => {
                const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft;
                const typeLabel = TYPE_LABELS[contract.type] || contract.type;

                return (
                  <Card key={contract.id} onPress={() => router.push(`/contracts/${contract.id}` as Href)}>
                    <CardContent>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <View className={`rounded-full px-2 py-0.5 ${status.bg}`}>
                              <Text className={`text-xs font-medium ${status.text}`}>
                                {status.label}
                              </Text>
                            </View>
                            <Text className="text-xs text-slate-400">{typeLabel}</Text>
                          </View>
                          <Text className="mt-1 font-medium text-slate-900" numberOfLines={1}>
                            {contract.title}
                          </Text>
                          <Text className="text-sm text-slate-500">
                            {formatTimeAgo(contract.updated_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
