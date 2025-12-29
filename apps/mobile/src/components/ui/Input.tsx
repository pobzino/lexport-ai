import { TextInput, View, Text } from "react-native";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

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
    return (
      <View className={cn("w-full", className)}>
        {label && (
          <Text className="mb-2 text-sm font-medium text-slate-700">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          className={cn(
            "h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900",
            error ? "border-red-500" : "border-slate-300",
            disabled && "bg-slate-100 opacity-50",
            multiline && "h-auto min-h-[100px] py-3"
          )}
        />
        {error && (
          <Text className="mt-1 text-sm text-red-500">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = "Input";
