import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { confirmAction } from '@/utils/confirm';

import { me } from '@/api/auth.api';

import {
  useAppDispatch,
} from '@/hooks/useRedux';

import {
  logout,
} from '@/redux/slices/authSlice';

import {
  colors,
} from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type { Me } from '@/types';

import { Ionicons } from '@expo/vector-icons';

import type {
  MainStackParamList,
} from '@/navigation/OwnerNavigator';

import { createThemedStyles } from '@/theme/themeStore';
type Props =
  NativeStackScreenProps<
    MainStackParamList,
    'Profile'
  >;

/* ============================================================
   ICON COMPONENTS
============================================================ */

function UserIcon({
  size = 21,
}: {
  size?: number;
}) {
  return (
    <View
      style={[
        styles.simpleIcon,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={[
          styles.userHead,
          {
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size,
          },
        ]}
      />

      <View
        style={[
          styles.userBody,
          {
            width: size * 0.72,
            height: size * 0.35,
            borderRadius: size,
          },
        ]}
      />
    </View>
  );
}

function TeamIcon({
  size = 21,
}: {
  size?: number;
}) {
  return (
    <View
      style={[
        styles.teamIcon,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={[
          styles.teamPersonMain,
          {
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size,
            left: size * 0.33,
          },
        ]}
      />

      <View
        style={[
          styles.teamPersonSmall,
          {
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: size,
            left: size * 0.03,
          },
        ]}
      />

      <View
        style={[
          styles.teamBodyMain,
          {
            width: size * 0.65,
            height: size * 0.30,
            borderRadius: size,
            left: size * 0.18,
          },
        ]}
      />

      <View
        style={[
          styles.teamBodySmall,
          {
            width: size * 0.38,
            height: size * 0.22,
            borderRadius: size,
            left: 0,
          },
        ]}
      />
    </View>
  );
}

function BuildingIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <View
      style={[
        styles.buildingIcon,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={[
          styles.buildingBody,
          {
            width: size * 0.72,
            height: size * 0.78,
          },
        ]}
      >
        <View style={styles.buildingWindowRow}>
          <View style={styles.buildingWindow} />
          <View style={styles.buildingWindow} />
        </View>

        <View style={styles.buildingWindowRow}>
          <View style={styles.buildingWindow} />
          <View style={styles.buildingWindow} />
        </View>
      </View>
    </View>
  );
}

function CalendarIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <View
      style={[
        styles.calendarIcon,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={styles.calendarTop}
      />

      <View
        style={styles.calendarGrid}
      >
        <View style={styles.calendarDot} />
        <View style={styles.calendarDot} />
        <View style={styles.calendarDot} />
        <View style={styles.calendarDot} />
      </View>
    </View>
  );
}

function ChevronIcon() {
  return (
    <Text
      style={
        styles.chevron
      }
    >
      ›
    </Text>
  );
}

/* ============================================================
   ROLE COLOR
============================================================ */

function getRoleStyle(
  role?: string,
) {
  switch (role) {
    case 'OWNER':
      return {
        background:
          colors.primary + '12',
        text:
          colors.primary,
      };

    case 'ADMIN':
      return {
        background:
          colors.success + '12',
        text:
          colors.success,
      };

    case 'MANAGER':
      return {
        background:
          colors.status.qualified +
          '12',
        text:
          colors.status.qualified,
      };

    default:
      return {
        background:
          colors.background,
        text:
          colors.textMuted,
      };
  }
}

/* ============================================================
   PROFILE SCREEN
============================================================ */

export function ProfileScreen({
  navigation,
}: Props) {
  const {
    width,
  } = useWindowDimensions();

  const dispatch =
    useAppDispatch();

  const [
    profile,
    setProfile,
  ] = useState<Me | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const isSmallPhone =
    width < 360;

  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  const loadProfile =
    useCallback(
      async () => {
        try {
          const data =
            await me();

          setProfile(data);
        } catch {
          setProfile(null);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(
      async () => {
        setRefreshing(true);

        try {
          const data =
            await me();

          setProfile(data);
        } finally {
          setRefreshing(false);
        }
      },
      [],
    );

  /* ==========================================================
     LOGOUT
  ========================================================== */

  // Alert buttons are not supported by react-native-web, so the
  // confirmation goes through the cross-platform helper.
  async function handleLogout() {
    const confirmed = await confirmAction(
      'Log out',
      'Are you sure you want to log out?',
      'Log out',
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoggingOut(true);
      await dispatch(logout()).unwrap();
    } catch {
      /*
       * The Redux logout flow
       * handles token cleanup.
       */
    } finally {
      setLoggingOut(false);
    }
  }

  const canManageTeam =
    profile?.role === 'OWNER' ||
    profile?.role === 'ADMIN';

  const roleStyle =
    getRoleStyle(
      profile?.role,
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <ActivityIndicator
          size="large"
          color={
            colors.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <View
      style={
        styles.container
      }
    >

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              colors.primary
            }
            colors={[
              colors.primary,
            ]}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal:
              isSmallPhone
                ? 14
                : spacing.md,
          },
        ]}
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <View
          style={
            styles.pageHeader
          }
        >
          <View>
            <Text
              style={
                styles.pageTitle
              }
            >
              Profile
            </Text>

            <Text
              style={
                styles.pageSubtitle
              }
            >
              Manage your account
            </Text>
          </View>
        </View>

        {/* ====================================================
            PROFILE CARD
        ==================================================== */}

        <View
          style={
            styles.profileCard
          }
        >
          {/* ==================================================
              AVATAR
          ================================================== */}

          <View
            style={
              styles.avatar
            }
          >
            {profile?.name ? (
              <Text
                style={
                  styles.avatarText
                }
              >
                {profile.name
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            ) : (
              <UserIcon
                size={27}
              />
            )}
          </View>

          {/* ==================================================
              USER INFO
          ================================================== */}

          {profile ? (
            <>
              <Text
                style={
                  styles.name
                }
                numberOfLines={1}
              >
                {profile.name}
              </Text>

              <Text
                style={
                  styles.email
                }
                numberOfLines={1}
              >
                {profile.email}
              </Text>

              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor:
                      roleStyle.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        roleStyle.text,
                    },
                  ]}
                >
                  {profile.role}
                </Text>
              </View>
            </>
          ) : (
            <Text
              style={
                styles.errorText
              }
            >
              Couldn't load your profile.
            </Text>
          )}

          {/* ==================================================
              PROFILE DETAILS
          ================================================== */}

          {profile ? (
            <View
              style={
                styles.details
              }
            >
              {/* COMPANY */}

              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoIcon
                  }
                >
                  <BuildingIcon />
                </View>

                <View
                  style={
                    styles.infoContent
                  }
                >
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Company
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                    numberOfLines={2}
                  >
                    {profile.company
                      ?.name ??
                      '—'}
                  </Text>
                </View>
              </View>

              {/* MEMBER SINCE */}

              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoIcon
                  }
                >
                  <CalendarIcon />
                </View>

                <View
                  style={
                    styles.infoContent
                  }
                >
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Member since
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {profile.createdAt
                      ? new Date(
                          profile.createdAt,
                        ).toLocaleDateString(
                          'en-IN',
                          {
                            day: '2-digit',
                            month:
                              'short',
                            year:
                              'numeric',
                          },
                        )
                      : '—'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* ====================================================
            ACCOUNT SECTION
        ==================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Account
        </Text>

        {/* ====================================================
            PIPELINE & ANALYTICS
        ==================================================== */}

        {profile?.role !== 'EMPLOYEE' ? (
          <Pressable
            style={({ pressed }) => [
              styles.menuCard,
              pressed &&
                styles.menuPressed,
            ]}
            onPress={() =>
              navigation.navigate(
                'Pipeline',
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Sales pipeline"
          >
            <View
              style={
                styles.menuIcon
              }
            >
              <Ionicons
                name="git-branch-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View
              style={
                styles.menuContent
              }
            >
              <Text
                style={
                  styles.menuTitle
                }
              >
                Sales pipeline
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                Deals by stage, forecast and quick stage moves
              </Text>
            </View>

            <ChevronIcon />
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.menuCard,
            pressed &&
              styles.menuPressed,
          ]}
          onPress={() =>
            navigation.navigate(
              'Analytics',
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Analytics"
        >
          <View
            style={
              styles.menuIcon
            }
          >
            <Ionicons
              name="stats-chart-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View
            style={
              styles.menuContent
            }
          >
            <Text
              style={
                styles.menuTitle
              }
            >
              Analytics
            </Text>

            <Text
              style={
                styles.menuSubtitle
              }
            >
              Charts for your pipeline, leads, tasks and revenue
            </Text>
          </View>

          <ChevronIcon />
        </Pressable>


        {/* ====================================================
            THEME & BRANDING (all roles; editing company branding
            is limited to OWNER/ADMIN by the server)
        ==================================================== */}

        <Pressable
          style={({ pressed }) => [
            styles.menuCard,
            pressed &&
              styles.menuPressed,
          ]}
          onPress={() =>
            navigation.navigate(
              'ThemeSettings',
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Theme and branding"
        >
          <View
            style={
              styles.menuIcon
            }
          >
            <Ionicons
              name="color-palette-outline"
              size={21}
              color={colors.primary}
            />
          </View>

          <View
            style={
              styles.menuContent
            }
          >
            <Text
              style={
                styles.menuTitle
              }
            >
              Theme & branding
            </Text>

            <Text
              style={
                styles.menuSubtitle
              }
            >
              {canManageTeam
                ? 'Company look, role themes and your appearance'
                : 'Dark mode and your personal theme'}
            </Text>
          </View>

          <ChevronIcon />
        </Pressable>

        {/* ====================================================
            TEAMS & TERRITORIES (managers and above)
        ==================================================== */}

        {canManageTeam || profile?.role === 'MANAGER' ? (
          <Pressable
            style={({ pressed }) => [
              styles.menuCard,
              pressed &&
                styles.menuPressed,
            ]}
            onPress={() =>
              navigation.navigate(
                'Teams',
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Teams and territories"
          >
            <View
              style={
                styles.menuIcon
              }
            >
              <Ionicons
                name="people-circle-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View
              style={
                styles.menuContent
              }
            >
              <Text
                style={
                  styles.menuTitle
                }
              >
                Teams & territories
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                {canManageTeam
                  ? 'Group reps under managers'
                  : 'Teams you lead'}
              </Text>
            </View>

            <ChevronIcon />
          </Pressable>
        ) : null}

        {/* ====================================================
            MANAGE TEAM
        ==================================================== */}

        {canManageTeam ? (
          <Pressable
            style={({ pressed }) => [
              styles.menuCard,
              pressed &&
                styles.menuPressed,
            ]}
            onPress={() =>
              navigation.navigate(
                'UserManagement',
              )
            }
          >
            <View
              style={
                styles.menuIcon
              }
            >
              <TeamIcon
                size={21}
              />
            </View>

            <View
              style={
                styles.menuContent
              }
            >
              <Text
                style={
                  styles.menuTitle
                }
              >
                Manage team
              </Text>

              <Text
                style={
                  styles.menuSubtitle
                }
              >
                Add and manage company members
              </Text>
            </View>

            <ChevronIcon />
          </Pressable>
        ) : null}

        {/* ====================================================
            PROFILE INFORMATION
        ==================================================== */}

        <View
          style={
            styles.menuCard
          }
        >
          <View
            style={
              styles.menuIcon
            }
          >
            <UserIcon
              size={21}
            />
          </View>

          <View
            style={
              styles.menuContent
            }
          >
            <Text
              style={
                styles.menuTitle
              }
            >
              Account details
            </Text>

            <Text
              style={
                styles.menuSubtitle
              }
            >
              Your personal CRM information
            </Text>
          </View>
        </View>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <Pressable
          disabled={
            loggingOut
          }
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.logoutPressed,
            loggingOut &&
              styles.logoutDisabled,
          ]}
          onPress={
            handleLogout
          }
        >
          {loggingOut ? (
            <ActivityIndicator
              size="small"
              color={
                colors.danger
              }
            />
          ) : (
            <Text
              style={
                styles.logoutText
              }
            >
              Log out
            </Text>
          )}
        </Pressable>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <Text
          style={
            styles.footerText
          }
        >
          Enterprise AI CRM
        </Text>

        <Text
          style={
            styles.versionText
          }
        >
          Your workspace, your team, your data
        </Text>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles =
  createThemedStyles(() => StyleSheet.create({
    /* ========================================================
       BASE
    ======================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.background,
    },

    loadingText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop:
        spacing.sm,
    },

    content: {
      paddingTop: 12,
      paddingBottom:
        spacing.xl * 2,
    },

    /* ========================================================
       HEADER
    ======================================================== */

    pageHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    pageTitle: {
      ...typography.h1,
      color: colors.text,
      fontWeight: '700',
    },

    pageSubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },

    /* ========================================================
       PROFILE CARD
    ======================================================== */

    profileCard: {
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 14,
      alignItems: 'center',
    },

    avatar: {
      width: 64,
      height: 64,
      borderRadius: 21,
      backgroundColor:
        colors.primaryLight,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 9,
    },

    avatarText: {
      color: colors.primary,
      fontSize: 25,
      fontWeight: '700',
    },

    name: {
      ...typography.h2,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '700',
      maxWidth: '90%',
    },

    email: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 2,
      maxWidth: '90%',
    },

    roleBadge: {
      paddingHorizontal: 11,
      paddingVertical: 4,
      borderRadius:
        radius.full,
      marginTop: 8,
    },

    roleText: {
      ...typography.small,
      fontWeight: '700',
      fontSize: 11,
    },

    /* ========================================================
       DETAILS
    ======================================================== */

    details: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      marginTop: 15,
      paddingTop: 5,
    },

    infoRow: {
      minHeight: 54,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        colors.primaryLight,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    infoContent: {
      flex: 1,
      minWidth: 0,
    },

    infoLabel: {
      ...typography.small,
      color: colors.textMuted,
      fontSize: 11,
    },

    infoValue: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
      marginTop: 2,
    },

    /* ========================================================
       SECTION
    ======================================================== */

    sectionTitle: {
      ...typography.small,
      color: colors.textMuted,
      fontWeight: '700',
      textTransform:
        'uppercase',
      letterSpacing: 0.7,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 2,
    },

    /* ========================================================
       MENU
    ======================================================== */

    menuCard: {
      minHeight: 66,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 15,
      paddingHorizontal: 11,
      paddingVertical: 10,
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 8,
    },

    menuPressed: {
      opacity: 0.7,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        colors.primaryLight,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
    },

    menuContent: {
      flex: 1,
      minWidth: 0,
    },

    menuTitle: {
      ...typography.bodyBold,
      color: colors.text,
      fontSize: 14,
    },

    menuSubtitle: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 2,
    },

    chevron: {
      color: colors.textMuted,
      fontSize: 27,
      lineHeight: 28,
      marginLeft: 5,
    },

    /* ========================================================
       LOGOUT
    ======================================================== */

    logoutButton: {
      height: 48,
      borderRadius: 14,
      backgroundColor:
        colors.danger + '08',
      borderWidth: 1,
      borderColor:
        colors.danger + '22',
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 9,
    },

    logoutPressed: {
      opacity: 0.7,
    },

    logoutDisabled: {
      opacity: 0.5,
    },

    logoutText: {
      ...typography.bodyBold,
      color: colors.danger,
      fontSize: 14,
    },

    /* ========================================================
       FOOTER
    ======================================================== */

    footerText: {
      ...typography.small,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 22,
    },

    versionText: {
      ...typography.small,
      color: colors.textMuted,
      opacity: 0.7,
      textAlign: 'center',
      marginTop: 3,
    },

    /* ========================================================
       ERROR
    ======================================================== */

    errorText: {
      ...typography.body,
      color: colors.danger,
      textAlign: 'center',
    },

    /* ========================================================
       SIMPLE ICONS
    ======================================================== */

    simpleIcon: {
      alignItems: 'center',
      justifyContent:
        'flex-end',
      position: 'relative',
    },

    userHead: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      top: 0,
    },

    userBody: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      bottom: 0,
    },

    /* ========================================================
       TEAM ICON
    ======================================================== */

    teamIcon: {
      position: 'relative',
    },

    teamPersonMain: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      top: 0,
    },

    teamPersonSmall: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      top: 3,
    },

    teamBodyMain: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      bottom: 0,
    },

    teamBodySmall: {
      backgroundColor:
        colors.primary,
      position: 'absolute',
      bottom: 0,
    },

    /* ========================================================
       BUILDING ICON
    ======================================================== */

    buildingIcon: {
      alignItems: 'center',
      justifyContent:
        'flex-end',
    },

    buildingBody: {
      backgroundColor:
        colors.primary,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      paddingTop: 4,
      paddingHorizontal: 3,
    },

    buildingWindowRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-around',
      marginBottom: 3,
    },

    buildingWindow: {
      width: 3,
      height: 3,
      borderRadius: 1,
      backgroundColor:
        colors.primaryLight,
    },

    /* ========================================================
       CALENDAR ICON
    ======================================================== */

    calendarIcon: {
      borderWidth: 2,
      borderColor:
        colors.primary,
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
    },

    calendarTop: {
      height: 4,
      width: '100%',
      backgroundColor:
        colors.primary,
    },

    calendarGrid: {
      flex: 1,
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      padding: 3,
      gap: 2,
    },

    calendarDot: {
      width: 3,
      height: 3,
      borderRadius: 1,
      backgroundColor:
        colors.primary,
    },
  }));