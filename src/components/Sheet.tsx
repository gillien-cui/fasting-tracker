import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';

type Props = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  /** Disables the confirm button when set. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
};

/** A bottom sheet with a title, content and Cancel / confirm buttons. */
export function Sheet({ visible, title, confirmLabel, confirmDisabled, onConfirm, onCancel, children }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {children}
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: theme.background }]}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={confirmDisabled}
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: theme.accent, opacity: confirmDisabled ? 0.4 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: theme.accentText }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingTop: 10, paddingBottom: 32, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700' },
});
