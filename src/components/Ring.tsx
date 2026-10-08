import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../lib/theme';

type Props = { progress: number; size?: number; stroke?: number; children?: ReactNode };

/** Circular progress ring, filling clockwise from the top, with a knob at the end of the arc. */
export function Ring({ progress, size = 270, stroke = 26, children }: Props) {
  const theme = useTheme();
  const r = (size - stroke) / 2 - 6; // room for the knob
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  // The knob sits on the ring where the colored arc ends.
  const angle = p * 2 * Math.PI - Math.PI / 2;
  const knobX = size / 2 + r * Math.cos(angle);
  const knobY = size / 2 + r * Math.sin(angle);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" gradientUnits="userSpaceOnUse" x1={size} y1={0} x2={0} y2={size}>
            <Stop offset="0" stopColor={theme.ringStart} />
            <Stop offset="1" stopColor={theme.ringEnd} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.track} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ring)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * p} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {p > 0 && (
          <>
            <Circle
              cx={knobX}
              cy={knobY}
              r={stroke / 2 + 4}
              fill="url(#ring)"
              stroke={theme.background}
              strokeWidth={3}
            />
            <Circle cx={knobX} cy={knobY} r={stroke * 0.2} fill="#FFFFFF" />
          </>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
