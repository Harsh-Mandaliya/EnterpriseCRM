import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Team, TeamUser } from '@/types';
import type { TeamInput } from '@/api/teams.api';

/**
 * Create / edit form for a team. Managers must be MANAGER or ADMIN
 * (the server enforces this too).
 */
export function TeamForm({
  team,
  users,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  team: Team | null;
  users: TeamUser[];
  saving: boolean;
  error: string | null;
  onSubmit: (input: TeamInput) => void;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(makeStyles);

  const [name, setName] = useState(team?.name ?? '');
  const [territory, setTerritory] = useState(team?.territory ?? '');
  const [managerId, setManagerId] = useState<string | null>(team?.managerId ?? null);
  const [memberIds, setMemberIds] = useState<string[]>(team?.memberIds ?? []);
  const [submitted, setSubmitted] = useState(false);

  const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');
  const candidates = users.filter(u => u.role !== 'OWNER');
  const nameError = submitted && name.trim().length < 2 ? 'Use at least 2 characters' : undefined;

  function toggleMember(id: string) {
    setMemberIds(current => (current.includes(id) ? current.filter(m => m !== id) : [...current, id]));
  }

  function handleSubmit() {
    setSubmitted(true);
    if (name.trim().length < 2) return;
    onSubmit({
      name: name.trim(),
      territory: territory.trim() || null,
      managerId,
      memberIds,
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{team ? `Edit ${team.name}` : 'New team'}</Text>

      <TextField label="Team name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={80} error={nameError} />
      <TextField
        label="Territory (optional)"
        value={territory}
        onChangeText={setTerritory}
        autoCapitalize="words"
        maxLength={80}
        placeholder="e.g. North India"
      />

      <Text style={styles.label}>Manager</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip label="No manager" selected={managerId === null} onPress={() => setManagerId(null)} />
        {managers.map(user => (
          <Chip
            key={user.id}
            label={`${user.name} · ${user.role.toLowerCase()}`}
            selected={managerId === user.id}
            onPress={() => setManagerId(user.id)}
          />
        ))}
      </View>
      {managers.length === 0 ? (
        <Text style={styles.hint}>Give someone the Manager role in Team management first.</Text>
      ) : null}

      <Text style={styles.label}>Members ({memberIds.length})</Text>
      <View style={styles.chips}>
        {candidates.map(user => (
          <Chip
            key={user.id}
            label={`${user.name} · ${user.role.toLowerCase()}`}
            selected={memberIds.includes(user.id)}
            onPress={() => toggleMember(user.id)}
            multi
          />
        ))}
      </View>

      <Text style={styles.hint}>
        The manager sees leads, deals, customers and invoices owned by these members.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={saving} style={styles.action} />
        <Button label={team ? 'Save team' : 'Create team'} onPress={handleSubmit} loading={saving} style={styles.action} />
      </View>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  multi,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    title: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginBottom: theme.spacing.md },
    label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: theme.spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: theme.colors.surface,
      maxWidth: '100%',
    },
    chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
    chipText: { color: theme.colors.textSecondary, fontSize: 13 },
    chipTextSelected: { color: theme.colors.primary, fontWeight: '700' },
    hint: { color: theme.colors.textFaint, fontSize: 12, marginBottom: theme.spacing.md },
    error: { color: theme.colors.danger, fontSize: 13, marginBottom: theme.spacing.sm },
    actions: { flexDirection: 'row', gap: theme.spacing.sm },
    action: { flex: 1 },
  });
}
