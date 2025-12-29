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
  default: "bg-success-500 active:bg-success-600 shadow-button",
  secondary: "bg-primary-100 active:bg-primary-200",
  outline: "border-2 border-primary-200 bg-transparent active:bg-primary-50",
  ghost: "bg-transparent active:bg-primary-50",
  destructive: "bg-red-500 active:bg-red-600",
};

const variantTextStyles = {
  default: "text-white",
  secondary: "text-primary-900",
  outline: "text-primary-900",
  ghost: "text-primary-900",
  destructive: "text-white",
};

const sizeStyles = {
  default: "h-14 px-8",
  sm: "h-11 px-5",
  lg: "h-16 px-10",
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
        "flex-row items-center justify-center rounded-2xl cursor-pointer select-none",
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && "opacity-50",
        className
      )}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "default" || variant === "destructive" ? "#fff" : "#202e46"}
          size="small"
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text
            className={cn(
              "font-bold tracking-tight",
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
