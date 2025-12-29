import React, { useCallback, useMemo, forwardRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheetComponent, {
    BottomSheetBackdrop,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    snapPoints?: string[];
}

export const BottomSheet = forwardRef<BottomSheetComponent, BottomSheetProps>(
    ({ isOpen, onClose, title, children, snapPoints = ["50%", "80%"] }, ref) => {
        const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

        const handleSheetChanges = useCallback(
            (index: number) => {
                if (index === -1) {
                    onClose();
                }
            },
            [onClose]
        );

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.5}
                />
            ),
            []
        );

        const handleClose = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
        };

        if (!isOpen) return null;

        return (
            <BottomSheetComponent
                ref={ref}
                index={0}
                snapPoints={snapPointsMemo}
                onChange={handleSheetChanges}
                backdropComponent={renderBackdrop}
                enablePanDownToClose
                handleIndicatorStyle={{
                    backgroundColor: "#cbd5e1",
                    width: 40,
                }}
                backgroundStyle={{
                    backgroundColor: "#ffffff",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    shadowColor: "#202e46",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 16,
                }}
            >
                <BottomSheetView style={styles.content}>
                    {title && (
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                            <Pressable onPress={handleClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </Pressable>
                        </View>
                    )}
                    {children}
                </BottomSheetView>
            </BottomSheetComponent>
        );
    }
);

BottomSheet.displayName = "BottomSheet";

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingTop: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#202e46",
    },
    closeButton: {
        padding: 4,
    },
});
