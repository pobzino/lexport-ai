import { Pressable, Text, ActivityIndicator, View } from "react-native";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
  icon?: ReactNode;
}

const variantStyles = {
  default: "bg-primary-600 active:bg-primary-700",
  secondary: "bg-slate-100 active:bg-slate-200",
  outline: "border border-slate-300 bg-transparent active:bg-slate-100",
  ghost: "bg-transparent active:bg-slate-100",
  destructive: "bg-red-600 active:bg-red-700",
};

const variantTextStyles = {
  default: "text-white",
  secondary: "text-slate-900",
  outline: "text-slate-900",
  ghost: "text-slate-900",
  destructive: "text-white",
};

const sizeStyles = {
  default: "h-12 px-6",
  sm: "h-10 px-4",
  lg: "h-14 px-8",
};

const sizeTextStyles = {
  default: "text-base",
  sm: "text-sm",
  lg: "text-lg",
};

export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = "default",
  size = "default",
  className,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      role="button"
      accessibilityRole="button"
      tabIndex={isDisabled ? -1 : 0}
      className={cn(
        "flex-row items-center justify-center rounded-xl cursor-pointer select-none",
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && "opacity-50",
        className
      )}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "default" || variant === "destructive" ? "#fff" : "#1e293b"}
          size="small"
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className={cn(
              "font-semibold",
              variantTextStyles[variant],
              sizeTextStyles[size]
            )}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
