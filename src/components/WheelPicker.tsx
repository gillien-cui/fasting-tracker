import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../lib/theme';

export const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE = 5;

type Props = {
  items: string[];
  /** Index selected when the wheel first appears. */
  initialIndex: number;
  onChange: (index: number) => void;
  label: string;
  flex?: number;
};

/** A scroll wheel that snaps to one item; the item in the middle band is the selection. */
export function WheelPicker({ items, initialIndex, onChange, label, flex = 1 }: Props) {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);
  const [selected, setSelected] = useState(initialIndex);
  const placed = useRef(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT)));
    if (i !== selected) {
      setSelected(i);
      onChange(i);
    }
  };

  return (
    <View style={[styles.wrap, { flex }]} accessibilityLabel={`${label}: ${items[selected]}`}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          ref.current?.scrollTo({ y: initialIndex * WHEEL_ITEM_HEIGHT, animated: false });
        }}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
      >
        {items.map((item, i) => (
          <Pressable
            key={`${i}-${item}`}
            onPress={() => ref.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated: true })}
            style={styles.item}
          >
            <Text
              numberOfLines={1}
              style={[styles.text, i === selected ? { color: theme.text, fontWeight: '700' } : { color: theme.muted }]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Lays wheels side by side over one shared selection band. */
export function Wheels({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.wheels}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: theme.accentSoft }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wheels: { flexDirection: 'row', gap: 4 },
  wrap: { height: WHEEL_ITEM_HEIGHT * VISIBLE },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
  },
  item: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 19, fontVariant: ['tabular-nums'] },
});
