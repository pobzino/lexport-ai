import { View, Text, ActivityIndicator, Pressable, Dimensions, Share, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import Pdf from "react-native-pdf";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lexport.ai";

// Type workaround for expo-file-system version mismatch
const getCacheDir = () => (FileSystem as unknown as { cacheDirectory: string }).cacheDirectory;

export default function ContractPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchPdf() {
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        // Download PDF to local cache
        const pdfUrl = `${API_BASE}/api/contracts/${id}/pdf`;
        const localUri = `${getCacheDir()}contract-${id}.pdf`;

        const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (downloadResult.status !== 200) {
          throw new Error("Failed to download PDF");
        }

        setPdfUri(downloadResult.uri);
      } catch (err) {
        console.error("Error fetching PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPdf();
    }
  }, [id]);

  const handleShare = async () => {
    if (!pdfUri) return;

    setDownloading(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Contract PDF",
        });
      } else if (Platform.OS === "web") {
        // Web fallback
        window.open(pdfUri, "_blank");
      }
    } catch (err) {
      console.error("Error sharing PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#529ec6" />
        <Text className="mt-4 text-primary-600">Loading PDF...</Text>
      </SafeAreaView>
    );
  }

  if (error || !pdfUri) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
          <Ionicons name="document-text-outline" size={48} color="#dc2626" />
        </View>
        <Text className="text-2xl font-bold text-primary-900 mb-2">PDF Unavailable</Text>
        <Text className="text-center text-primary-500 mb-6">{error || "Unable to load PDF"}</Text>
        <Pressable
          onPress={() => router.back()}
          className="px-6 py-3 bg-primary-900 rounded-xl"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-900" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-primary-900">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Text className="text-white font-medium">{currentPage}</Text>
          <Text className="text-primary-400">/</Text>
          <Text className="text-primary-400">{totalPages}</Text>
        </View>
        <Pressable
          onPress={handleShare}
          disabled={downloading}
          className="p-2 -mr-2"
        >
          {downloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="share-outline" size={24} color="white" />
          )}
        </Pressable>
      </View>

      {/* PDF Viewer */}
      <View className="flex-1 bg-primary-800">
        <Pdf
          source={{ uri: pdfUri }}
          onLoadComplete={(numberOfPages) => {
            setTotalPages(numberOfPages);
          }}
          onPageChanged={(page) => {
            setCurrentPage(page);
          }}
          onError={(error) => {
            console.error("PDF error:", error);
            setError("Failed to render PDF");
          }}
          style={{
            flex: 1,
            width: Dimensions.get("window").width,
          }}
          enablePaging={true}
          horizontal={false}
          enableAnnotationRendering={false}
          trustAllCerts={false}
        />
      </View>
    </SafeAreaView>
  );
}
