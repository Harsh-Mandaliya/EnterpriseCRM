import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import * as teamsApi from '@/api/teams.api';
import type { TeamInput } from '@/api/teams.api';
import { listUsers } from '@/api/users.api';
import { Button } from '@/components/common/Button';
import { ScreenState } from '@/components/common/ScreenState';
import { useAppSelector } from '@/hooks/useRedux';
import { TeamForm } from '@/screens/teams/components/TeamForm';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Team, TeamUser } from '@/types';
import { confirmAction } from '@/utils/confirm';

/**
 * Teams & territories. Everyone can see the teams; OWNER and
 * ADMIN can create, edit and delete them (enforced by the API).
 */
export function TeamsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const role = useAppSelector(state => state.auth.user?.role);
  const canManage = role === 'OWNER' || role === 'ADMIN';

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Team | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [teamList, userList] = await Promise.all([teamsApi.listTeams(), listUsers()]);
      setTeams(teamList);
      setUsers(userList);
      setLoadError(null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not load teams.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSubmit(input: TeamInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing && editing !== 'new') {
        await teamsApi.updateTeam(editing.id, input);
      } else {
        await teamsApi.createTeam(input);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save the team.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: Team) {
    const ok = await confirmAction(
      'Delete team',
      `Delete “${team.name}”? Its manager will no longer see the members’ records. Nobody loses their own data.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await teamsApi.deleteTeam(team.id);
      await load();
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Could not delete the team.'));
    }
  }

  if (teams === null) {
    return loadError ? (
      <ScreenState kind="error" message={loadError} onRetry={load} />
    ) : (
      <ScreenState kind="loading" message="Loading teams" />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Managers see records owned by the members of the teams they lead. A manager who leads no team sees the
          whole company.
        </Text>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        {editing ? (
          <TeamForm
            key={editing === 'new' ? 'new' : editing.id}
            team={editing === 'new' ? null : editing}
            users={users}
            saving={saving}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={() => {
              setEditing(null);
              setFormError(null);
            }}
          />
        ) : canManage ? (
          <Button label="New team" onPress={() => setEditing('new')} style={styles.newButton} />
        ) : null}

        {teams.length === 0 && !editing ? (
          <ScreenState
            kind="empty"
            title="No teams yet"
            message={canManage ? 'Create a team to group sales reps under a manager.' : 'Your company has not set up teams.'}
          />
        ) : null}

        {teams.map(team => (
          <View key={team.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{team.name}</Text>
                {team.territory ? <Text style={styles.muted}>{team.territory}</Text> : null}
              </View>
            </View>

            <Text style={styles.line}>
              <Text style={styles.lineLabel}>Manager: </Text>
              {team.manager?.name ?? 'None'}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.lineLabel}>Members ({team.members.length}): </Text>
              {team.members.length > 0 ? team.members.map(m => m.name).join(', ') : 'None'}
            </Text>

            {canManage ? (
              <View style={styles.actions}>
                <Button label="Edit" variant="secondary" onPress={() => setEditing(team)} style={styles.action} />
                <Button label="Delete" variant="outline" onPress={() => handleDelete(team)} style={styles.action} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl * 2, width: '100%', maxWidth: 720, alignSelf: 'center' },
    intro: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: theme.spacing.md },
    newButton: { marginBottom: theme.spacing.md },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
    cardTitleWrap: { flex: 1 },
    cardTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    muted: { color: theme.colors.textMuted, fontSize: 12 },
    line: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
    lineLabel: { color: theme.colors.textMuted, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
    action: { flex: 1 },
    error: {
      color: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
  });
}
