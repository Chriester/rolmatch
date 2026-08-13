// AvatarStack (rediseño de mesas, entregable §3): pila solapada de avatares
// con el GM marcado en oro y los huecos libres como círculo punteado «+N».
// Compacta la parrilla de plazas sin perder quién está dentro de un vistazo.
// Tocar un avatar navega a su perfil; lo operativo (echar, valorar, invitar
// por asiento) vive en la vista detallada que la pantalla decida ofrecer.

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

export type StackPerson = {
  id: string;
  alias: string | null;
  avatarUrl: string | null;
  isGm?: boolean;
};

type AvatarStackProps = {
  people: StackPerson[];
  /** huecos libres: se pintan como un solo círculo punteado «+N» */
  freeSeats?: number;
  onPressPerson?: (person: StackPerson) => void;
  size?: number;
};

export function AvatarStack({ people, freeSeats = 0, onPressPerson, size = 40 }: AvatarStackProps) {
  const overlap = -Math.round(size * 0.28);
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  return (
    <View style={styles.row}>
      {people.map((person, index) => (
        <Pressable
          key={person.id}
          disabled={onPressPerson === undefined}
          accessibilityLabel={`${person.alias ?? 'Miembro'}${person.isGm ? ', GM' : ''}`}
          onPress={() => onPressPerson?.(person)}
          style={[index > 0 && { marginLeft: overlap }, { zIndex: people.length - index }]}>
          {person.avatarUrl ? (
            <Image
              source={{ uri: person.avatarUrl }}
              style={[avatarStyle, styles.avatar, person.isGm && styles.avatarGm]}
            />
          ) : (
            <View
              style={[avatarStyle, styles.avatar, styles.fallback, person.isGm && styles.avatarGm]}>
              <Text style={{ fontSize: size * 0.45 }}>{person.isGm ? '🧙‍♂️' : '🧝'}</Text>
            </View>
          )}
        </Pressable>
      ))}
      {freeSeats > 0 && (
        <View
          style={[avatarStyle, styles.free, people.length > 0 && { marginLeft: overlap }]}
          accessibilityLabel={`${freeSeats} ${freeSeats === 1 ? 'plaza libre' : 'plazas libres'}`}>
          <Text style={styles.freeLabel}>+{freeSeats}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 2,
    borderColor: Rolder.surface,
  },
  avatarGm: {
    borderColor: Rolder.gold,
  },
  fallback: {
    backgroundColor: 'rgba(199,125,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  free: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(199,125,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  freeLabel: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
});
