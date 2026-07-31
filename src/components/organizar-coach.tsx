// Guía de primeros pasos de «Organizar partida»: aparece la primera vez
// que se entra a la pantalla (flag por dispositivo) y se puede reabrir con
// el botón «?». Pasos distintos para GM y jugador.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { OutlineButton, PrimaryButton } from '@/components/ui';
import { Rolder, RolderFonts } from '@/constants/theme';

type CoachStep = { emoji: string; title: string; body: string };

const GM_STEPS: CoachStep[] = [
  {
    emoji: '📅',
    title: 'Propón fechas',
    body: 'Toca «Proponer fechas de partida», marca en el calendario los días que te encajen y ponles hora. Con el botón ＋ puedes añadir varias horas a un mismo día.',
  },
  {
    emoji: '🗳️',
    title: 'Que vote la mesa',
    body: '«Empezar votación» publica las fechas: tus jugadores votan desde aquí o desde el banner del chat. ¿Lo tenéis ya claro? «Fijar sin votación» y listo.',
  },
  {
    emoji: '💡',
    title: 'Escucha propuestas',
    body: 'Tus jugadores pueden proponerte una fecha extra. Te aparecerá en esta pantalla para añadirla a la votación o descartarla.',
  },
  {
    emoji: '✅',
    title: 'Cierra y a jugar',
    body: 'Con «Elegir esta y cerrar» la fecha ganadora queda fijada como partida. La mesa recibe el aviso y recordatorios automáticos antes de la sesión.',
  },
];

const PLAYER_STEPS: CoachStep[] = [
  {
    emoji: '🗳️',
    title: 'Vota tus fechas',
    body: 'El GM propone fechas y tú marcas TODAS las que te vengan bien (puedes votar varias), desde aquí o desde el banner del chat de la mesa.',
  },
  {
    emoji: '💡',
    title: '¿Ninguna te cuadra?',
    body: 'Propón una fecha extra al GM desde la votación. Verás si la añade o no, y si la añade podrá votarla toda la mesa.',
  },
  {
    emoji: '✋',
    title: 'Confirma tu asistencia',
    body: 'Cuando el GM fije la partida, marca «✋ Voy» o «🙅 No voy». Recibirás recordatorios automáticos antes de empezar.',
  },
];

type OrganizarCoachProps = {
  visible: boolean;
  isOwner: boolean;
  onClose: () => void;
};

export function OrganizarCoach({ visible, isOwner, onClose }: OrganizarCoachProps) {
  const [step, setStep] = useState(0);
  const steps = isOwner ? GM_STEPS : PLAYER_STEPS;
  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

  const close = () => {
    setStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>
            {isOwner ? 'Cómo organizar una partida' : 'Cómo se decide la fecha'}
          </Text>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.nav}>
            {step > 0 ? (
              <OutlineButton
                label="Anterior"
                tone="white"
                onPress={() => setStep((s) => s - 1)}
                style={styles.navSmall}
              />
            ) : (
              <OutlineButton label="Saltar" tone="white" onPress={close} style={styles.navSmall} />
            )}
            <PrimaryButton
              label={isLast ? '¡Entendido!' : 'Siguiente'}
              onPress={() => (isLast ? close() : setStep((s) => s + 1))}
              style={styles.navBig}
            />
          </View>

          <Pressable onPress={close} style={styles.closeCorner} accessibilityLabel="Cerrar guía">
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    gap: 10,
    alignItems: 'center',
  },
  kicker: {
    color: Rolder.violetSoft,
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  emoji: {
    fontSize: 46,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    lineHeight: 21,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: Rolder.violet,
  },
  nav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  navSmall: {
    flex: 1,
  },
  navBig: {
    flex: 2,
  },
  closeCorner: {
    position: 'absolute',
    top: 10,
    right: 12,
    padding: 6,
  },
  closeGlyph: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
});
