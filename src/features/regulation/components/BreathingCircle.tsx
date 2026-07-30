import { useRiverColor } from "@/src/shared/theme/useRiverColor";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

interface BreathingCircleProps {
  label: string;
  seconds: number;
  targetScale: number;
  animate: boolean;
}


export function BreathingCircle({
  seconds,
  targetScale,
  animate,
}: BreathingCircleProps) {
  const scale = useRef(new Animated.Value(targetScale)).current;
  const fill = useRiverColor(500);

  useEffect(() => {
    if (animate) {
      Animated.timing(scale, {
        toValue: targetScale,
        duration: seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(targetScale);
    }
  }, [targetScale, seconds, animate, scale]);

  return (
    <View
      className="items-center justify-center"
      style={{ height: 280 }}
    >
      <Animated.View
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: fill,
          transform: [{ scale }],
          opacity: 0.85,
        }}
      />
    </View>
  );
}
