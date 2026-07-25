// Pickers del composer del chat: emojis (insertar en el texto), stickers
// roleros (emoji grande, envío directo; media_url queda listo para packs
// de arte propios) y buscador de GIFs de KLIPY (el relevo de Tenor, que
// Google cerró el 30-06-2026; API del equipo original de Tenor, tier
// gratuito, clave en partner.klipy.com). Sin clave, la pestaña GIF no
// aparece.

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

const KLIPY_KEY = process.env.EXPO_PUBLIC_KLIPY_API_KEY;

export const gifSearchAvailable = Boolean(KLIPY_KEY);

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

type GifResult = { id: string; url: string; preview: string };

// Respuesta de KLIPY: data.data[].file.{hd|md|sm|xs}.{gif|webp|jpg}.url
type KlipyFileVariant = { url: string } | undefined;
type KlipyItem = {
  id: number | string;
  file: Record<string, Record<string, KlipyFileVariant> | undefined> & {
    gif?: KlipyFileVariant;
  };
};

async function searchGifs(query: string): Promise<GifResult[]> {
  const params = new URLSearchParams({
    q: query,
    per_page: '16',
    rating: 'pg',
    locale: 'es_ES',
  });
  const res = await fetch(
    `https://api.klipy.com/api/v1/${KLIPY_KEY}/gifs/search?${params}`
  );
  if (!res.ok) throw new Error(`KLIPY ${res.status}`);
  const json = (await res.json()) as { data?: { data?: KlipyItem[] } };
  return (json.data?.data ?? [])
    .map((item) => {
      const size = (s: string, f: string) => {
        const bySize = item.file?.[s];
        return bySize && typeof bySize === 'object' ? (bySize as Record<string, KlipyFileVariant>)[f]?.url : undefined;
      };
      const url = size('hd', 'gif') ?? size('md', 'gif') ?? item.file?.gif?.url ?? '';
      const preview = size('sm', 'gif') ?? size('xs', 'gif') ?? url;
      return { id: String(item.id), url, preview };
    })
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
  const [gifs, setGifs] = useState<GifResult[] | undefined>(undefined);
  const [gifError, setGifError] = useState(false);

  // Búsqueda con debounce; sin texto, trae tendencias de rol
  useEffect(() => {
    if (tab !== 'gif' || !gifSearchAvailable) return;
    const t = setTimeout(() => {
      setGifError(false);
      setGifs(undefined);
      searchGifs(query.trim() || 'dice roll critical')
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
        placeholder="Buscar GIFs…"
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
