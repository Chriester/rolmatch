// Pickers del composer del chat: emojis (insertar en el texto), stickers
// roleros (emoji grande, envío directo; media_url queda listo para packs
// de arte propios) y buscador de GIFs de Tenor (API gratuita de Google;
// sin clave, la pestaña GIF no aparece).

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

export type PickerTab = 'emoji' | 'sticker' | 'gif';

const TENOR_KEY = process.env.EXPO_PUBLIC_TENOR_API_KEY;

export const gifSearchAvailable = Boolean(TENOR_KEY);

// Emojis frecuentes de chat + sabor rolero
const EMOJIS = [
  '😀', '😂', '🤣', '😅', '😊', '😍', '🤔', '😱', '😭', '🥳',
  '👍', '👎', '👏', '🙏', '💪', '🔥', '❤️', '💀', '🎉', '✨',
  '🎲', '⚔️', '🛡️', '🧙‍♂️', '🧝‍♀️', '🐉', '🏰', '📜', '🕯️', '🍺',
  '🗡️', '🏹', '🪄', '🧪', '🗝️', '👑', '🌙', '⚡', '☠️', '🃏',
];

// Pack base de stickers: emojis roleros a lo grande. Cuando haya arte
// propio, cada sticker pasará a llevar media_url en vez de body.
const STICKERS = ['🎲', '🐉', '🧙‍♂️', '⚔️', '🛡️', '💀', '🍺', '🏰', '🧝‍♀️', '📜', '🔥', '👑'];

type TenorGif = { id: string; url: string; preview: string };

async function searchTenor(query: string): Promise<TenorGif[]> {
  const params = new URLSearchParams({
    q: query,
    key: TENOR_KEY ?? '',
    limit: '16',
    media_filter: 'gif,tinygif',
    contentfilter: 'medium',
    locale: 'es_ES',
  });
  const res = await fetch(`https://tenor.googleapis.com/v2/search?${params}`);
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const json = (await res.json()) as {
    results: { id: string; media_formats: Record<string, { url: string }> }[];
  };
  return (json.results ?? [])
    .map((r) => ({
      id: r.id,
      url: r.media_formats.gif?.url ?? r.media_formats.tinygif?.url ?? '',
      preview: r.media_formats.tinygif?.url ?? r.media_formats.gif?.url ?? '',
    }))
    .filter((g) => g.url !== '');
}

type ChatMediaPickersProps = {
  tab: PickerTab;
  onEmoji: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onGif: (url: string) => void;
};

export function ChatMediaPickers({ tab, onEmoji, onSticker, onGif }: ChatMediaPickersProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[] | undefined>(undefined);
  const [gifError, setGifError] = useState(false);

  // Búsqueda con debounce; sin texto, trae tendencias de rol
  useEffect(() => {
    if (tab !== 'gif' || !gifSearchAvailable) return;
    const t = setTimeout(() => {
      setGifError(false);
      setGifs(undefined);
      searchTenor(query.trim() || 'dice roll critical')
        .then(setGifs)
        .catch(() => {
          setGifs([]);
          setGifError(true);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [tab, query]);

  if (tab === 'emoji') {
    return (
      <ScrollView horizontal={false} style={styles.panel} contentContainerStyle={styles.grid}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            onPress={() => onEmoji(e)}>
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (tab === 'sticker') {
    return (
      <ScrollView style={styles.panel} contentContainerStyle={styles.grid}>
        {STICKERS.map((s) => (
          <Pressable
            key={s}
            style={({ pressed }) => [styles.stickerCell, pressed && styles.pressed]}
            onPress={() => onSticker(s)}>
            <Text style={styles.sticker}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.panel}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar en Tenor…"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
      {gifs === undefined ? (
        <ActivityIndicator style={styles.gifLoading} />
      ) : gifError ? (
        <Text style={styles.gifEmpty}>No se pudo buscar. Prueba otra vez.</Text>
      ) : gifs.length === 0 ? (
        <Text style={styles.gifEmpty}>Sin resultados.</Text>
      ) : (
        <ScrollView horizontal contentContainerStyle={styles.gifRow}>
          {gifs.map((g) => (
            <Pressable
              key={g.id}
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => onGif(g.url)}>
              <Image source={{ uri: g.preview }} style={styles.gif} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: 168,
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  cell: {
    width: '10%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  stickerCell: {
    width: '16.6%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticker: {
    fontSize: 40,
  },
  search: {
    margin: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: '#fff',
    fontSize: 13,
    fontFamily: RolderFonts.regular,
  },
  gifRow: {
    gap: 8,
    padding: 8,
    paddingTop: 4,
  },
  gif: {
    width: 140,
    height: 105,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  gifLoading: {
    marginVertical: 30,
  },
  gifEmpty: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginVertical: 30,
  },
  pressed: {
    opacity: 0.7,
  },
});
