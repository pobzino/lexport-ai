import { TextInput, View, Text } from "react-native";
import { cn } from "@/lib/utils";
import { forwardRef, useState } from "react";

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "name" | "off";
  error?: string;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      secureTextEntry,
      keyboardType = "default",
      autoCapitalize = "none",
      autoComplete = "off",
      error,
      disabled = false,
      className,
      multiline = false,
      numberOfLines = 1,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className={cn("w-full", className)}>
        {label && (
          <Text className="mb-2 text-sm font-semibold text-primary-700">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor="#829ab1"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "h-14 w-full rounded-2xl border-2 bg-white px-5 text-base text-primary-900",
            error
              ? "border-red-400"
              : isFocused
                ? "border-accent-400"
                : "border-primary-100",
            disabled && "bg-primary-50 opacity-50",
            multiline && "h-auto min-h-[120px] py-4"
          )}
        />
        {error && (
          <Text className="mt-2 text-sm font-medium text-red-500">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
