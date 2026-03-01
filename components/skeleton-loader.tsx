import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonBoxProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          transform: [{ translateX }],
          width: 120,
        }}
      />
    </View>
  );
}

interface SkeletonLineProps {
  width?: number | string;
  style?: ViewStyle;
}

export function SkeletonLine({ width = '100%', style }: SkeletonLineProps) {
  return <SkeletonBox width={width} height={14} borderRadius={7} style={style} />;
}

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size = 40, style }: SkeletonCircleProps) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />;
}
