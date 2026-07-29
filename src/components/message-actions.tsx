// Menú de acciones sobre un mensaje propio (long-press): editar / borrar.
// Modal propio porque Alert con botones es no-op en web (lib/alert.ts).

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, Spacing } from '@/constants/theme';

export function MessageActions({
  visible,
  canEdit,
  onEdit,
  onDelete,
  onClose,
}: {
  visible: boolean;
  /** los mensajes de texto se editan; GIFs y stickers solo se borran */
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          {canEdit && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={onEdit}>
              <Text style={styles.actionLabel}>✏️ Editar</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={onDelete}>
            <Text style={[styles.actionLabel, styles.deleteLabel]}>🗑️ Borrar</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 18,
    padding: Spacing.two,
    gap: 2,
  },
  action: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    backgroundColor: 'rgba(139,108,255,0.15)',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  deleteLabel: {
    color: Rolder.pass,
  },
  cancelLabel: {
    color: Rolder.textSecondary,
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
});
