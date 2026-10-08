import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { durationMinutes, formatDuration, formatGoal, isMet, type Fast } from '../lib/fasts';
import { useTheme } from '../lib/theme';

const COLORS = ['#48BB78', '#F6AD55', '#63B3ED', '#F687B3', '#ECC94B', '#9F7AEA'];
const PIECES = 40;
const useNativeDriver = Platform.OS !== 'web';

type Piece = { x: number; size: number; color: string; delay: number; spin: number; drift: number };

/** Shown when a fast ends: confetti and "Goal met!" when it met its goal, a quiet "Saved" otherwise. */
export function Celebration({ fast, onDone }: { fast: Fast; onDone: () => void }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const met = isMet(fast);
  const [fall] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [pieces] = useState<Piece[]>(() =>
    Array.from({ length: met ? PIECES : 0 }, (_, i) => ({
      x: Math.random(),
      size: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.25,
      spin: (Math.random() - 0.5) * 4,
      drift: (Math.random() - 0.5) * 80,
    })),
  );

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver }).start();
    Animated.timing(fall, { toValue: 1, duration: 2200, easing: Easing.in(Easing.quad), useNativeDriver }).start();
    const id = setTimeout(onDone, met ? 2800 : 1800);
    return () => clearTimeout(id);
  }, [fall, pop, met, onDone]);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityLabel="Dismiss">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {pieces.map((p, i) => {
          const progress = fall.interpolate({
            inputRange: [0, p.delay, 1],
            outputRange: [0, 0, 1],
          });
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: p.x * width,
                top: -20,
                width: p.size,
                height: p.size * 1.6,
                borderRadius: 2,
                backgroundColor: p.color,
                transform: [
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0rad', `${p.spin * Math.PI}rad`],
                    }),
                  },
                ],
              }}
            />
          );
        })}
      </View>
      <View pointerEvents="none" style={styles.center}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: met ? theme.good : theme.border },
            { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
        >
          {met && <Text style={styles.emoji}>🎉</Text>}
          <Text style={[styles.title, { color: met ? theme.good : theme.text }]}>{met ? 'Goal met!' : 'Saved'}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {formatDuration(durationMinutes(fast))} fasted · goal {formatGoal(fast.goalMinutes)}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 30,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emoji: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '800' },
  body: { fontSize: 15 },
});
