import { View, Text, Image } from "react-native";
import { Button } from "./Button";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";

interface EmptyStateProps {
    icon?: string;
    illustration?: "contracts" | "signatures" | "search";
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    actionIcon?: ReactNode;
}

export function EmptyState({
    icon,
    illustration,
    title,
    description,
    actionLabel,
    onAction,
    actionIcon,
}: EmptyStateProps) {
    return (
        <View className="items-center py-16 px-6">
            {/* Illustration/Icon */}
            <View className="mb-6">
                {illustration === "contracts" && (
                    <View className="h-32 w-32 items-center justify-center rounded-full bg-accent-50">
                        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-accent-100">
                            <Ionicons name="document-text" size={40} color="#529ec6" />
                        </View>
                    </View>
                )}
                {illustration === "signatures" && (
                    <View className="h-32 w-32 items-center justify-center rounded-full bg-success-50">
                        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-success-100">
                            <Ionicons name="create" size={40} color="#10b981" />
                        </View>
                    </View>
                )}
                {illustration === "search" && (
                    <View className="h-32 w-32 items-center justify-center rounded-full bg-primary-50">
                        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary-100">
                            <Ionicons name="search" size={40} color="#627d98" />
                        </View>
                    </View>
                )}
                {icon && !illustration && (
                    <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-100">
                        <Ionicons name={icon as any} size={48} color="#829ab1" />
                    </View>
                )}
            </View>

            {/* Text */}
            <Text className="text-xl font-bold text-primary-900 text-center mb-2">
                {title}
            </Text>
            <Text className="text-base text-primary-500 text-center max-w-[280px] mb-6">
                {description}
            </Text>

            {/* Action */}
            {actionLabel && onAction && (
                <Button onPress={onAction} icon={actionIcon}>
                    {actionLabel}
                </Button>
            )}
        </View>
    );
}
