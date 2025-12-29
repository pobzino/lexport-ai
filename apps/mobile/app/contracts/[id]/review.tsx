import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";
import { getContractComments, addContractComment, resolveComment, deleteComment, ContractComment } from "@/lib/api";

interface Clause {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Contract {
  id: string;
  title: string;
  content: {
    clauses: Clause[];
  };
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ContractReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("id, title, content")
        .eq("id", id)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // Fetch comments
      try {
        const result = await getContractComments(id!);
        setComments(result.comments || []);
      } catch (err) {
        console.log("No comments or error fetching:", err);
        setComments([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      Alert.alert("Error", "Failed to load review data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    setSubmitting(true);
    try {
      const result = await addContractComment(id!, {
        clauseId: selectedClause?.id,
        content: newComment.trim(),
      });

      setComments((prev) => [result.comment, ...prev]);
      setNewComment("");
      setSelectedClause(null);
      setShowAddComment(false);
      Alert.alert("Success", "Comment added");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      await resolveComment(id!, commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status: "resolved" as const } : c))
      );
    } catch (err) {
      Alert.alert("Error", "Failed to resolve comment");
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(id!, commentId);
              setComments((prev) => prev.filter((c) => c.id !== commentId));
            } catch (err) {
              Alert.alert("Error", "Failed to delete comment");
            }
          },
        },
      ]
    );
  };

  const filteredComments = comments.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const openCount = comments.filter((c) => c.status === "open").length;
  const resolvedCount = comments.filter((c) => c.status === "resolved").length;

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

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <View className="flex-row items-center gap-3 flex-1">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">Review</Text>
            <Text className="text-sm text-slate-500" numberOfLines={1}>{contract.title}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowAddComment(true)}
          className="p-2 bg-primary-600 rounded-xl"
        >
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-4 py-3 gap-2 bg-white border-b border-slate-100">
        <Pressable
          onPress={() => setFilter("all")}
          className={`px-4 py-2 rounded-full ${filter === "all" ? "bg-slate-900" : "bg-slate-100"}`}
        >
          <Text className={`text-sm font-medium ${filter === "all" ? "text-white" : "text-slate-600"}`}>
            All ({comments.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("open")}
          className={`px-4 py-2 rounded-full ${filter === "open" ? "bg-amber-500" : "bg-slate-100"}`}
        >
          <Text className={`text-sm font-medium ${filter === "open" ? "text-white" : "text-slate-600"}`}>
            Open ({openCount})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setFilter("resolved")}
          className={`px-4 py-2 rounded-full ${filter === "resolved" ? "bg-emerald-500" : "bg-slate-100"}`}
        >
          <Text className={`text-sm font-medium ${filter === "resolved" ? "text-white" : "text-slate-600"}`}>
            Resolved ({resolvedCount})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredComments.length === 0 ? (
          <View className="items-center py-16 px-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
            </View>
            <Text className="text-lg font-semibold text-slate-900">No Comments</Text>
            <Text className="text-center text-slate-500 mt-2">
              {filter === "all"
                ? "Add a comment to start the review process."
                : `No ${filter} comments found.`}
            </Text>
            {filter === "all" && (
              <Button
                className="mt-6"
                onPress={() => setShowAddComment(true)}
                icon={<Ionicons name="add" size={18} color="white" />}
              >
                Add Comment
              </Button>
            )}
          </View>
        ) : (
          <View className="px-4 py-4 gap-3">
            {filteredComments.map((comment) => {
              const isOwn = comment.user_id === currentUserId;
              const clause = contract.content?.clauses?.find((c) => c.id === comment.clause_id);

              return (
                <Card key={comment.id}>
                  <CardContent>
                    {/* Comment Header */}
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          comment.status === "resolved" ? "bg-emerald-100" : "bg-primary-100"
                        }`}
                      >
                        <Ionicons
                          name={comment.status === "resolved" ? "checkmark-circle" : "chatbubble"}
                          size={20}
                          color={comment.status === "resolved" ? "#10b981" : "#529ec6"}
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-medium text-slate-900">
                            {comment.user?.name || comment.user?.email || "User"}
                          </Text>
                          <View
                            className={`px-2 py-0.5 rounded-full ${
                              comment.status === "resolved" ? "bg-emerald-100" : "bg-amber-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                comment.status === "resolved" ? "text-emerald-700" : "text-amber-700"
                              }`}
                            >
                              {comment.status === "resolved" ? "Resolved" : "Open"}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-slate-400 mt-0.5">
                          {formatTimeAgo(comment.created_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Referenced Clause */}
                    {clause && (
                      <View className="mt-3 p-2 bg-slate-50 rounded-lg border-l-2 border-primary-400">
                        <Text className="text-xs font-medium text-slate-500">
                          Re: {clause.title}
                        </Text>
                      </View>
                    )}

                    {/* Selected Text */}
                    {comment.selection_text && (
                      <View className="mt-3 p-2 bg-amber-50 rounded-lg border-l-2 border-amber-400">
                        <Text className="text-sm text-amber-800 italic" numberOfLines={2}>
                          "{comment.selection_text}"
                        </Text>
                      </View>
                    )}

                    {/* Comment Content */}
                    <Text className="text-slate-700 mt-3">{comment.content}</Text>

                    {/* Actions */}
                    <View className="flex-row items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                      {comment.status === "open" && (
                        <Pressable
                          onPress={() => handleResolve(comment.id)}
                          className="flex-row items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-lg"
                        >
                          <Ionicons name="checkmark" size={16} color="#10b981" />
                          <Text className="text-sm font-medium text-emerald-600">Resolve</Text>
                        </Pressable>
                      )}
                      {isOwn && (
                        <Pressable
                          onPress={() => handleDelete(comment.id)}
                          className="flex-row items-center gap-1 px-3 py-1.5 bg-red-50 rounded-lg"
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                          <Text className="text-sm font-medium text-red-600">Delete</Text>
                        </Pressable>
                      )}
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

      {/* Add Comment Modal */}
      <Modal
        visible={showAddComment}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddComment(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3" />
            <View className="px-6 pb-8">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-slate-900">Add Comment</Text>
                <Pressable onPress={() => setShowAddComment(false)} className="p-2">
                  <Ionicons name="close" size={24} color="#64748b" />
                </Pressable>
              </View>

              {/* Clause Selector */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                  Reference Clause (Optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2">
                  <View className="flex-row gap-2 px-2">
                    <Pressable
                      onPress={() => setSelectedClause(null)}
                      className={`px-3 py-2 rounded-lg border ${
                        !selectedClause ? "bg-primary-50 border-primary-300" : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          !selectedClause ? "text-primary-700 font-medium" : "text-slate-600"
                        }`}
                      >
                        General
                      </Text>
                    </Pressable>
                    {contract.content?.clauses?.map((clause) => (
                      <Pressable
                        key={clause.id}
                        onPress={() => setSelectedClause(clause)}
                        className={`px-3 py-2 rounded-lg border max-w-[150] ${
                          selectedClause?.id === clause.id
                            ? "bg-primary-50 border-primary-300"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selectedClause?.id === clause.id
                              ? "text-primary-700 font-medium"
                              : "text-slate-600"
                          }`}
                          numberOfLines={1}
                        >
                          {clause.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Comment Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">Your Comment</Text>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Add your comment or suggestion..."
                  className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[120]"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              <Button
                onPress={handleAddComment}
                loading={submitting}
                disabled={submitting || !newComment.trim()}
                icon={<Ionicons name="send" size={18} color="white" />}
              >
                {submitting ? "Adding..." : "Add Comment"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <Pressable
        onPress={() => setShowAddComment(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary-600 shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
