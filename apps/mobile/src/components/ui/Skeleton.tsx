import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    className?: string;
}

export function Skeleton({
    width = "100%",
    height = 20,
    borderRadius = 8,
    className,
}: SkeletonProps) {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 1000 }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(opacity.value, [0.3, 1], [0.3, 0.7]),
    }));

    return (
        <Animated.View
            style={[
                {
                    width: typeof width === "number" ? width : undefined,
                    height,
                    borderRadius,
                    backgroundColor: "#d1d5db",
                },
                animatedStyle,
            ]}
            className={cn(typeof width === "string" && "w-full", className)}
        />
    );
}

// Pre-built skeleton variations
export function SkeletonCard() {
    return (
        <View className="rounded-3xl bg-white p-5 gap-3" style={{
            shadowColor: '#202e46',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
        }}>
            <View className="flex-row items-center gap-3">
                <Skeleton width={48} height={48} borderRadius={16} />
                <View className="flex-1 gap-2">
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={12} />
                </View>
            </View>
            <Skeleton height={14} />
            <Skeleton width="80%" height={14} />
        </View>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <View className="gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );
}
