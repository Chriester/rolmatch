// Banner de votación activa en la cabecera del chat: bien visible, se
// despliega para votar ahí mismo (multivoto con barras) y enlaza a
// Organizar partida para el detalle.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import { setVote, type SessionPoll } from '@/lib/polls';
import { formatSessionDate } from '@/lib/sessions';

type ChatPollBannerProps = {
  groupId: string;
  poll: SessionPoll;
  viewerId: string;
  onChanged: (next: SessionPoll) => void;
};

export function ChatPollBanner({ groupId, poll, viewerId, onChanged }: ChatPollBannerProps) {
  const [open, setOpen] = useState(false);
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const top = Math.max(...poll.options.map((o) => o.votes), 1);

  const toggleVote = async (optionId: string, next: boolean) => {
    onChanged({
      ...poll,
      options: poll.options.map((o) =>
        o.id === optionId ? { ...o, mine: next, votes: o.votes + (next ? 1 : -1) } : o
      ),
    });
    try {
      await setVote(optionId, viewerId, next);
    } catch {
      // si falla, el próximo load del chat lo corrige
    }
  };

  return (
    <View style={styles.banner}>
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.title} numberOfLines={1}>
          🗳️ {poll.title ?? '¿Cuándo jugamos?'} · {poll.options.length} opciones · {totalVotes}{' '}
          votos
        </Text>
        <Text style={styles.chevron}>{open ? '︿' : '﹀'}</Text>
      </Pressable>

      {open && (
        <View style={styles.body}>
          {poll.options.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.option, option.mine && styles.optionMine]}
              onPress={() => toggleVote(option.id, !option.mine)}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {option.mine ? '✅ ' : ''}
                  {formatSessionDate(option.starts_at)}
                </Text>
                <Text style={styles.optionVotes}>{option.votes} 🎲</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(option.votes / top) * 100}%` }]} />
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/groups/[id]/schedule', params: { id: groupId } })
            }>
            <Text style={styles.link}>📅 Ver en Organizar partida ›</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(139,108,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.45)',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    flex: 1,
  },
  chevron: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.bold,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 7,
  },
  option: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 8,
    gap: 5,
  },
  optionMine: {
    borderColor: 'rgba(139,108,255,0.8)',
    backgroundColor: 'rgba(139,108,255,0.14)',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  optionVotes: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  track: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Rolder.violet,
  },
  link: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 2,
  },
});
