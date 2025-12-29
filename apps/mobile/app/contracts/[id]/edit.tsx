import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Card, CardContent, Button } from "@/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback, useRef } from "react";

interface Clause {
  id: string;
  title: string;
  content: string;
  type?: string;
  order: number;
}

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  content: ContractContent;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export default function ContractEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Editable state
  const [title, setTitle] = useState("");
  const [preamble, setPreamble] = useState("");
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);

  // Track original values for change detection
  const originalValues = useRef<{ title: string; preamble: string; clauses: Clause[] }>({
    title: "",
    preamble: "",
    clauses: [],
  });

  const fetchContract = useCallback(async () => {
    try {
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (contractError) throw contractError;

      setContract(contractData);
      setTitle(contractData.title);
      setPreamble(contractData.content?.preamble || "");
      setClauses(contractData.content?.clauses || []);

      // Store original values
      originalValues.current = {
        title: contractData.title,
        preamble: contractData.content?.preamble || "",
        clauses: JSON.parse(JSON.stringify(contractData.content?.clauses || [])),
      };
    } catch (err) {
      console.error("Error fetching contract:", err);
      Alert.alert("Error", "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  // Check for changes
  useEffect(() => {
    if (!contract) return;

    const titleChanged = title !== originalValues.current.title;
    const preambleChanged = preamble !== originalValues.current.preamble;
    const clausesChanged = JSON.stringify(clauses) !== JSON.stringify(originalValues.current.clauses);

    setHasChanges(titleChanged || preambleChanged || clausesChanged);
  }, [title, preamble, clauses, contract]);

  const handleSave = async () => {
    if (!contract) return;

    setSaving(true);
    try {
      const updatedContent: ContractContent = {
        ...contract.content,
        preamble,
        clauses: clauses.map((c, index) => ({ ...c, order: index })),
      };

      const { error } = await supabase
        .from("contracts")
        .update({
          title,
          content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update original values
      originalValues.current = {
        title,
        preamble,
        clauses: JSON.parse(JSON.stringify(clauses)),
      };
      setHasChanges(false);

      Alert.alert("Success", "Contract saved successfully");
    } catch (err) {
      console.error("Error saving contract:", err);
      Alert.alert("Error", "Failed to save contract");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => router.back() },
          { text: "Save & Exit", onPress: async () => {
            await handleSave();
            router.back();
          }},
        ]
      );
    } else {
      router.back();
    }
  };

  const handleClauseChange = (clauseId: string, field: "title" | "content", value: string) => {
    setClauses((prev) =>
      prev.map((c) => (c.id === clauseId ? { ...c, [field]: value } : c))
    );
  };

  const handleAddClause = () => {
    const newClause: Clause = {
      id: `clause-${Date.now()}`,
      title: "New Clause",
      content: "Enter clause content here...",
      type: "custom",
      order: clauses.length,
    };
    setClauses((prev) => [...prev, newClause]);
    setExpandedClause(newClause.id);
    setEditingClauseId(newClause.id);
  };

  const handleDeleteClause = (clauseId: string) => {
    Alert.alert(
      "Delete Clause",
      "Are you sure you want to delete this clause?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setClauses((prev) => prev.filter((c) => c.id !== clauseId));
            if (expandedClause === clauseId) setExpandedClause(null);
            if (editingClauseId === clauseId) setEditingClauseId(null);
          },
        },
      ]
    );
  };

  const handleMoveClause = (clauseId: string, direction: "up" | "down") => {
    setClauses((prev) => {
      const index = prev.findIndex((c) => c.id === clauseId);
      if (index === -1) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newClauses = [...prev];
      [newClauses[index], newClauses[newIndex]] = [newClauses[newIndex], newClauses[index]];
      return newClauses;
    });
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

  const isLocked = contract.status !== "draft";

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">Edit Contract</Text>
          <Button
            size="sm"
            onPress={handleSave}
            disabled={!hasChanges || saving || isLocked}
            loading={saving}
          >
            {saving ? "..." : "Save"}
          </Button>
        </View>

        {/* Locked Warning */}
        {isLocked && (
          <View className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex-row items-center gap-3">
            <Ionicons name="lock-closed" size={20} color="#d97706" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-amber-800">Contract Locked</Text>
              <Text className="text-xs text-amber-600">
                This contract has been sent for signature and cannot be edited.
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Section */}
          <View className="px-4 py-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">Contract Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900"
              placeholder="Enter contract title"
              placeholderTextColor="#94a3b8"
              editable={!isLocked}
            />
          </View>

          {/* Preamble Section */}
          <View className="px-4 py-2">
            <Text className="text-sm font-medium text-slate-700 mb-2">Preamble</Text>
            <TextInput
              value={preamble}
              onChangeText={setPreamble}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[100]"
              placeholder="Enter preamble..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              editable={!isLocked}
            />
          </View>

          {/* Clauses Section */}
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-slate-900">
                Clauses ({clauses.length})
              </Text>
              {!isLocked && (
                <Pressable
                  onPress={handleAddClause}
                  className="flex-row items-center gap-1 bg-primary-50 rounded-lg px-3 py-1.5"
                >
                  <Ionicons name="add" size={18} color="#529ec6" />
                  <Text className="text-sm font-medium text-primary-600">Add</Text>
                </Pressable>
              )}
            </View>

            {clauses.length === 0 ? (
              <Card>
                <CardContent>
                  <View className="items-center py-8">
                    <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
                    <Text className="mt-3 text-slate-500">No clauses yet</Text>
                    {!isLocked && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onPress={handleAddClause}
                        icon={<Ionicons name="add" size={16} color="white" />}
                      >
                        Add First Clause
                      </Button>
                    )}
                  </View>
                </CardContent>
              </Card>
            ) : (
              <View className="gap-3">
                {clauses.map((clause, index) => {
                  const isExpanded = expandedClause === clause.id;
                  const isEditing = editingClauseId === clause.id;

                  return (
                    <Card key={clause.id}>
                      <CardContent>
                        {/* Clause Header */}
                        <Pressable
                          onPress={() => setExpandedClause(isExpanded ? null : clause.id)}
                          className="flex-row items-center gap-3"
                        >
                          <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                            <Text className="text-sm font-bold text-slate-600">{index + 1}</Text>
                          </View>

                          <View className="flex-1">
                            {isEditing && !isLocked ? (
                              <TextInput
                                value={clause.title}
                                onChangeText={(text) => handleClauseChange(clause.id, "title", text)}
                                className="font-semibold text-slate-900 -my-1"
                                onBlur={() => setEditingClauseId(null)}
                                autoFocus
                              />
                            ) : (
                              <Pressable
                                onPress={() => !isLocked && setEditingClauseId(clause.id)}
                                className="flex-row items-center gap-2"
                              >
                                <Text className="font-semibold text-slate-900 flex-1" numberOfLines={1}>
                                  {clause.title}
                                </Text>
                                {!isLocked && (
                                  <Ionicons name="pencil-outline" size={14} color="#94a3b8" />
                                )}
                              </Pressable>
                            )}
                            {clause.type && (
                              <Text className="text-xs text-slate-400 mt-0.5">{clause.type}</Text>
                            )}
                          </View>

                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#94a3b8"
                          />
                        </Pressable>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <View className="mt-4 pt-4 border-t border-slate-100">
                            <TextInput
                              value={clause.content}
                              onChangeText={(text) => handleClauseChange(clause.id, "content", text)}
                              className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 min-h-[120]"
                              placeholder="Enter clause content..."
                              placeholderTextColor="#94a3b8"
                              multiline
                              textAlignVertical="top"
                              editable={!isLocked}
                            />

                            {/* Clause Actions */}
                            {!isLocked && (
                              <View className="flex-row items-center justify-between mt-4">
                                <View className="flex-row gap-2">
                                  <Pressable
                                    onPress={() => handleMoveClause(clause.id, "up")}
                                    disabled={index === 0}
                                    className={`p-2 rounded-lg ${index === 0 ? "bg-slate-100" : "bg-slate-200"}`}
                                  >
                                    <Ionicons
                                      name="arrow-up"
                                      size={18}
                                      color={index === 0 ? "#d1d5db" : "#64748b"}
                                    />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleMoveClause(clause.id, "down")}
                                    disabled={index === clauses.length - 1}
                                    className={`p-2 rounded-lg ${index === clauses.length - 1 ? "bg-slate-100" : "bg-slate-200"}`}
                                  >
                                    <Ionicons
                                      name="arrow-down"
                                      size={18}
                                      color={index === clauses.length - 1 ? "#d1d5db" : "#64748b"}
                                    />
                                  </Pressable>
                                </View>
                                <Pressable
                                  onPress={() => handleDeleteClause(clause.id)}
                                  className="p-2 bg-red-50 rounded-lg"
                                >
                                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                                </Pressable>
                              </View>
                            )}
                          </View>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          {/* Bottom Padding */}
          <View className="h-24" />
        </ScrollView>

        {/* Floating Save Button */}
        {hasChanges && !isLocked && (
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
            <Button
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              icon={<Ionicons name="checkmark" size={18} color="white" />}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
