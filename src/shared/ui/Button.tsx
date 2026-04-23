import { cn } from "@/src/shared/lib/cn";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ActivityIndicator, Pressable, Text } from "react-native";

interface ButtonProps {
  onPress: () => void;
  children: string;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  variant = "primary",
  loading,
  disabled,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (reduceMotion) return;
    scale.value = withTiming(0.97, { duration: 90 });
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    scale.value = withTiming(1, { duration: 160 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={animatedStyle}
      className={cn(
        "rounded-2xl px-6 py-4 items-center justify-center min-h-[56px]",
        variant === "primary" && "bg-river-500 active:bg-river-700",
        variant === "secondary" && "bg-river-100 active:bg-river-300",
        variant === "ghost" && "bg-transparent",
        isDisabled && "opacity-50"
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "white" : "#2E5F60"} />
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
    </AnimatedPressable>
  );
}
