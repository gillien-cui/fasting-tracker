import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';

type Props = { progress: number; size?: number; stroke?: number; children?: ReactNode };

/** Circular progress ring, filling clockwise from the top. */
export function Ring({ progress, size = 260, stroke = 16, children }: Props) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.track} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={theme.accent}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * p} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
