// Menú de acciones sobre un mensaje propio (long-press): editar / borrar.
// Modal propio porque Alert con botones es no-op en web (lib/alert.ts).

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, Spacing } from '@/constants/theme';

const REACTIONS = ['👍', '❤️', '😂', '😮', '🎲', '🔥'];

export function MessageActions({
  visible,
  canCopy,
  canEdit,
  canDelete,
  onCopy,
  onEdit,
  onDelete,
  onReact,
  onReport,
  onClose,
}: {
  visible: boolean;
  /** texto y tiradas se pueden copiar (también los ajenos) */
  canCopy: boolean;
  /** los mensajes de texto PROPIOS se editan; GIFs y stickers solo se borran */
  canEdit: boolean;
  /** solo los propios se borran */
  canDelete: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** reacción rápida (si la pantalla las soporta) */
  onReact?: (emoji: string) => void;
  /** reportar un mensaje ajeno (migr. 00045) */
  onReport?: () => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          {onReact && (
            <View style={styles.reactionRow}>
              {REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={({ pressed }) => [styles.reaction, pressed && styles.pressed]}
                  onPress={() => onReact(emoji)}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {canCopy && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={onCopy}>
              <Text style={styles.actionLabel}>📋 Copiar</Text>
            </Pressable>
          )}
          {canEdit && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={onEdit}>
              <Text style={styles.actionLabel}>✏️ Editar</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={onDelete}>
              <Text style={[styles.actionLabel, styles.deleteLabel]}>🗑️ Borrar</Text>
            </Pressable>
          )}
          {onReport && (
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={onReport}>
              <Text style={styles.actionLabel}>🚩 Reportar</Text>
            </Pressable>
          )}
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
    backgroundColor: 'rgba(199,125,255,0.15)',
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
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  reaction: {
    borderRadius: 999,
    padding: 8,
  },
  reactionEmoji: {
    fontSize: 22,
  },
});
