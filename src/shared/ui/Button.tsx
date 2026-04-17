import { cn } from "@/src/shared/lib/cn";
import { ActivityIndicator, Pressable, Text } from "react-native";

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  onPress,
  children,
  variant = "primary",
  loading,
  disabled,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        "rounded-2xl px-6 py-4 items-center justify-center min-h-[56px]",
        variant === "primary" && "bg-river-500 active:bg-river-700",
        variant === "secondary" && "bg-river-100 active:bg-river-300",
        variant === "ghost" && "bg-transparent",
        isDisabled && "opacity-50"
      )}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text
          className={cn(
            "text-base font-semibold",
            variant === "primary" && "text-white",
            variant === "secondary" && "text-river-900",
            variant === "ghost" && "text-river-700"
          )}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}