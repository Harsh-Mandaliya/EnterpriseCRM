import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';

import {
  useAppDispatch,
  useAppSelector,
} from '@/hooks/useRedux';

import {
  fetchUsers,
  inviteUser,
  removeUser,
} from '@/redux/slices/usersSlice';

import {
  TextField,
} from '@/components/common/TextField';

import {
  Button,
} from '@/components/common/Button';

import {
  colors,
} from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  Role,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
import { confirmAction } from '@/utils/confirm';
/* ============================================================
   ROLES
============================================================ */

const ROLES: Role[] = [
  'ADMIN',
  'MANAGER',
  'SALES',
  'EMPLOYEE',
];

/* ============================================================
   ROLE HELPERS
============================================================ */

function getRoleColor(role: Role | string) {
  switch (role) {
    case 'OWNER':
      return {
        background: colors.primary + '12',
        text: colors.primary,
      };

    case 'ADMIN':
      return {
        background: colors.success + '12',
        text: colors.success,
      };

    case 'MANAGER':
      return {
        background: colors.status.qualified + '12',
        text: colors.status.qualified,
      };

    case 'SALES':
      return {
        background: colors.status.contacted + '12',
        text: colors.status.contacted,
      };

    case 'EMPLOYEE':
      return {
        background: colors.background,
        text: colors.textMuted,
      };

    default:
      return {
        background: colors.background,
        text: colors.textMuted,
      };
  }
}

/* ============================================================
   SEARCH ICON
============================================================ */

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

/* ============================================================
   CLOSE ICON
============================================================ */

function CloseIcon() {
  return (
    <View style={styles.closeIcon}>
      <View
        style={[
          styles.closeLine,
          styles.closeLineOne,
        ]}
      />
      <View
        style={[
          styles.closeLine,
          styles.closeLineTwo,
        ]}
      />
    </View>
  );
}

/* ============================================================
   EYE ICON
============================================================ */

function EyeIcon({
  hidden,
}: {
  hidden: boolean;
}) {
  return (
    <View style={styles.eyeIcon}>
      <View style={styles.eyeShape}>
        <View style={styles.eyeDot} />
      </View>

      {hidden ? (
        <View style={styles.eyeSlash} />
      ) : null}
    </View>
  );
}

/* ============================================================
   USER MANAGEMENT SCREEN
============================================================ */

export function UserManagementScreen() {
  const dispatch = useAppDispatch();

  const {
    items,
    status,
    error,
  } = useAppSelector(
    state => state.users,
  );

  const {
    width,
  } = useWindowDimensions();

  /* ==========================================================
     FORM STATE
  ========================================================== */

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    role,
    setRole,
  ] = useState<Role>('SALES');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

  const isSmallPhone =
    width < 360;

  const horizontalPadding =
    isSmallPhone
      ? 14
      : spacing.md;

  /* ==========================================================
     LOAD USERS
  ========================================================== */

  const loadUsers =
    useCallback(
      async () => {
        try {
          await dispatch(
            fetchUsers(),
          ).unwrap();
        } catch {
          // Redux owns the error state.
        }
      },
      [dispatch],
    );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await dispatch(
        fetchUsers(),
      ).unwrap();
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return items;
      }

      return items.filter(
        user =>
          user.name
            .toLowerCase()
            .includes(query) ||
          user.email
            .toLowerCase()
            .includes(query) ||
          user.role
            .toLowerCase()
            .includes(query),
      );
    }, [items, search]);

  /* ==========================================================
     RESET FORM
  ========================================================== */

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('SALES');
    setFormError(null);
    setShowPassword(false);
  }

  /* ==========================================================
     OPEN MODAL
  ========================================================== */

  function openModal() {
    resetForm();
    setModalVisible(true);
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  function closeModal() {
    if (submitting) {
      return;
    }

    resetForm();
    setModalVisible(false);
  }

  /* ==========================================================
     VALIDATION
  ========================================================== */

  function validateForm() {
    const cleanName =
      name.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (cleanName.length < 2) {
      return 'Enter a valid name.';
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail,
      )
    ) {
      return 'Enter a valid email address.';
    }

    if (password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (!/[A-Z]/.test(password)) {
      return 'Password needs at least one uppercase letter.';
    }

    if (!/[0-9]/.test(password)) {
      return 'Password needs at least one number.';
    }

    return null;
  }

  /* ==========================================================
     ADD TEAM MEMBER
  ========================================================== */

  async function handleInvite() {
    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError,
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await dispatch(
        inviteUser({
          name: name.trim(),
          email: email
            .trim()
            .toLowerCase(),
          password,
          role,
        }),
      ).unwrap();

      resetForm();
      setModalVisible(false);

      /*
       * Refresh after creating the user
       * so the list is always current.
       */
      await dispatch(
        fetchUsers(),
      ).unwrap();
    } catch (err: unknown) {
      setFormError(
        typeof err === 'string'
          ? err
          : "Couldn't add that teammate.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ==========================================================
     REMOVE USER
  ========================================================== */

  async function handleRemove(
    id: string,
    memberName: string,
  ) {
    const confirmed = await confirmAction(
      'Remove teammate',
      `Remove ${memberName} from your team? They will lose access immediately.`,
      'Remove',
    );

    if (!confirmed) {
      return;
    }

    try {
      await dispatch(
        removeUser(id),
      ).unwrap();
    } catch {
      Alert.alert(
        'Unable to remove',
        'We could not remove this teammate. Please try again.',
      );
    }
  }

  /* ==========================================================
     RENDER USER
  ========================================================== */

  function renderUser({
    item,
  }: {
    item: (typeof items)[number];
  }) {
    const roleStyle =
      getRoleColor(
        item.role,
      );

    const initial =
      item.name
        .charAt(0)
        .toUpperCase();

    return (
      <View style={styles.userCard}>
        {/* ==================================================
            AVATAR
        ================================================== */}

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initial}
          </Text>
        </View>

        {/* ==================================================
            USER INFORMATION
        ================================================== */}

        <View style={styles.userContent}>
          <Text
            style={styles.userName}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={styles.userEmail}
            numberOfLines={1}
          >
            {item.email}
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
              {item.role}
            </Text>
          </View>
        </View>

        {/* ==================================================
            REMOVE
        ================================================== */}

        {item.role !== 'OWNER' ? (
          <Pressable
            onPress={() =>
              handleRemove(
                item.id,
                item.name,
              )
            }
            hitSlop={8}
            style={({ pressed }) => [
              styles.removeButton,
              pressed &&
                styles.removePressed,
            ]}
          >
            <Text
              style={
                styles.removeText
              }
            >
              Remove
            </Text>
          </Pressable>
        ) : (
          <View
            style={
              styles.ownerBadge
            }
          >
            <Text
              style={
                styles.ownerText
              }
            >
              Owner
            </Text>
          </View>
        )}
      </View>
    );
  }

  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <View
      style={
        styles.container
      }
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
      >
        <View style={styles.headerText}>
          <Text
            style={
              styles.title
            }
          >
            Team
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Manage your company members
          </Text>
        </View>

        <Pressable
          onPress={openModal}
          style={({ pressed }) => [
            styles.addButton,
            pressed &&
              styles.addButtonPressed,
          ]}
        >
          <Text
            style={
              styles.addButtonPlus
            }
          >
            +
          </Text>

          {!isSmallPhone ? (
            <Text
              style={
                styles.addButtonText
              }
            >
              Add
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <View
        style={[
          styles.searchContainer,
          {
            marginHorizontal:
              horizontalPadding,
          },
        ]}
      >
        <SearchIcon />

        <TextInput
          style={
            styles.searchInput
          }
          value={search}
          onChangeText={
            setSearch
          }
          placeholder="Search team members"
          placeholderTextColor={
            colors.textMuted
          }
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() =>
              setSearch('')
            }
            hitSlop={8}
          >
            <CloseIcon />
          </Pressable>
        ) : null}
      </View>

      {/* ======================================================
          TEAM COUNT
      ====================================================== */}

      <View
        style={[
          styles.countRow,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
      >
        <Text
          style={
            styles.countText
          }
        >
          {items.length}{' '}
          {items.length === 1
            ? 'member'
            : 'members'}
        </Text>

        {search.length > 0 ? (
          <Text
            style={
              styles.resultText
            }
          >
            {filteredUsers.length}{' '}
            results
          </Text>
        ) : null}
      </View>

      {/* ======================================================
          LIST
      ====================================================== */}

      {status === 'loading' &&
      items.length === 0 ? (
        <View
          style={
            styles.loadingContainer
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
            Loading team...
          </Text>
        </View>
      ) : error &&
        items.length === 0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            Couldn't load team
          </Text>

          <Text
            style={
              styles.emptySubtitle
            }
          >
            {error}
          </Text>

          <Pressable
            onPress={loadUsers}
            style={
              styles.retryButton
            }
          >
            <Text
              style={
                styles.retryText
              }
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={
            filteredUsers
          }
          keyExtractor={
            item => item.id
          }
          renderItem={
            renderUser
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal:
                horizontalPadding,
            },
            filteredUsers.length ===
              0 &&
              styles.emptyList,
          ]}
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
          ListEmptyComponent={
            <View
              style={
                styles.emptyContainer
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                No team members found
              </Text>

              <Text
                style={
                  styles.emptySubtitle
                }
              >
                Try a different search or add a new teammate.
              </Text>
            </View>
          }
        />
      )}

      {/* ======================================================
          ADD TEAM MEMBER MODAL
      ====================================================== */}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            {/* ==================================================
                MODAL HEADER
            ================================================== */}

            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Add teammate
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Create a new CRM account
                </Text>
              </View>

              <Pressable
                onPress={
                  closeModal
                }
                disabled={
                  submitting
                }
                style={
                  styles.closeButton
                }
              >
                <CloseIcon />
              </Pressable>
            </View>

            {/* ==================================================
                NAME
            ================================================== */}

            <TextField
              label="Name"
              value={name}
              onChangeText={
                value => {
                  setName(value);

                  if (
                    formError
                  ) {
                    setFormError(
                      null,
                    );
                  }
                }
              }
              placeholder="Jane Doe"
              editable={
                !submitting
              }
            />

            {/* ==================================================
                EMAIL
            ================================================== */}

            <TextField
              label="Email"
              value={email}
              onChangeText={
                value => {
                  setEmail(value);

                  if (
                    formError
                  ) {
                    setFormError(
                      null,
                    );
                  }
                }
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="jane@company.com"
              editable={
                !submitting
              }
            />

            {/* ==================================================
                PASSWORD
            ================================================== */}

            <View
              style={
                styles.passwordContainer
              }
            >
              <Text
                style={
                  styles.passwordLabel
                }
              >
                Temporary password
              </Text>

              <View
                style={
                  styles.passwordInputWrapper
                }
              >
                <TextInput
                  style={
                    styles.passwordInput
                  }
                  value={
                    password
                  }
                  onChangeText={
                    value => {
                      setPassword(
                        value,
                      );

                      if (
                        formError
                      ) {
                        setFormError(
                          null,
                        );
                      }
                    }
                  }
                  placeholder="At least 8 characters"
                  placeholderTextColor={
                    colors.textMuted
                  }
                  secureTextEntry={
                    !showPassword
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={
                    !submitting
                  }
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(
                      previous =>
                        !previous,
                    )
                  }
                  hitSlop={8}
                  style={
                    styles.eyeButton
                  }
                >
                  <EyeIcon
                    hidden={
                      !showPassword
                    }
                  />
                </Pressable>
              </View>
            </View>

            {/* ==================================================
                ROLE
            ================================================== */}

            <View
              style={
                styles.roleSection
              }
            >
              <Text
                style={
                  styles.roleLabel
                }
              >
                Role
              </Text>

              <View
                style={
                  styles.roleGrid
                }
              >
                {ROLES.map(
                  itemRole => {
                    const selected =
                      role ===
                      itemRole;

                    const roleStyle =
                      getRoleColor(
                        itemRole,
                      );

                    return (
                      <Pressable
                        key={
                          itemRole
                        }
                        disabled={
                          submitting
                        }
                        onPress={() =>
                          setRole(
                            itemRole,
                          )
                        }
                        style={[
                          styles.roleOption,
                          selected &&
                            {
                              backgroundColor:
                                roleStyle.background,
                              borderColor:
                                roleStyle.text,
                            },
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            selected &&
                              {
                                borderColor:
                                  roleStyle.text,
                              },
                          ]}
                        >
                          {selected ? (
                            <View
                              style={[
                                styles.radioActive,
                                {
                                  backgroundColor:
                                    roleStyle.text,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.roleOptionText,
                            selected &&
                              {
                                color:
                                  roleStyle.text,
                              },
                          ]}
                        >
                          {
                            itemRole
                          }
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>

            {/* ==================================================
                FORM ERROR
            ================================================== */}

            {formError ? (
              <View
                style={
                  styles.formErrorBox
                }
              >
                <Text
                  style={
                    styles.formErrorText
                  }
                >
                  {formError}
                </Text>
              </View>
            ) : null}

            {/* ==================================================
                BUTTONS
            ================================================== */}

            <View
              style={
                styles.modalButtons
              }
            >
              <Button
                label="Cancel"
                variant="secondary"
                onPress={
                  closeModal
                }
                disabled={
                  submitting
                }
                style={
                  styles.modalButton
                }
              />

              <Button
                label="Add teammate"
                onPress={
                  handleInvite
                }
                loading={
                  submitting
                }
                style={
                  styles.modalButton
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================
          FLOATING ACTION BUTTON
      ====================================================== */}

      <Pressable
        onPress={
          openModal
        }
        style={({ pressed }) => [
          styles.fab,
          pressed &&
            styles.fabPressed,
        ]}
      >
        <Text
          style={
            styles.fabText
          }
        >
          +
        </Text>
      </Pressable>
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

    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingTop: 14,
      paddingBottom: 12,
    },

    headerText: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    title: {
      ...typography.h1,
      color: colors.text,
      fontWeight: '700',
    },

    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },

    addButton: {
      minWidth: 48,
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 11,
      backgroundColor:
        colors.primary,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      elevation: 2,
    },

    addButtonPressed: {
      opacity: 0.8,
      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    addButtonPlus: {
      color: colors.textInverse,
      fontSize: 23,
      lineHeight: 24,
      fontWeight: '400',
    },

    addButtonText: {
      color: colors.textInverse,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },

    /* ========================================================
       SEARCH
    ======================================================== */

    searchContainer: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 12,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 14,
      paddingHorizontal: 9,
      paddingVertical: 0,
    },

    searchIcon: {
      width: 19,
      height: 19,
      position: 'relative',
    },

    searchCircle: {
      position: 'absolute',
      left: 1,
      top: 1,
      width: 12,
      height: 12,
      borderWidth: 1.8,
      borderColor:
        colors.textMuted,
      borderRadius: 8,
    },

    searchHandle: {
      position: 'absolute',
      width: 7,
      height: 1.8,
      backgroundColor:
        colors.textMuted,
      transform: [
        {
          rotate: '45deg',
        },
      ],
      left: 11,
      top: 13,
      borderRadius: 2,
    },

    closeIcon: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent:
        'center',
      position: 'relative',
    },

    closeLine: {
      position: 'absolute',
      width: 14,
      height: 1.8,
      backgroundColor:
        colors.textMuted,
      borderRadius: 2,
    },

    closeLineOne: {
      transform: [
        {
          rotate: '45deg',
        },
      ],
    },

    closeLineTwo: {
      transform: [
        {
          rotate: '-45deg',
        },
      ],
    },

    /* ========================================================
       COUNT
    ======================================================== */

    countRow: {
      height: 42,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    countText: {
      ...typography.small,
      color: colors.textMuted,
      fontWeight: '600',
    },

    resultText: {
      ...typography.small,
      color: colors.primary,
      fontWeight: '600',
    },

    /* ========================================================
       LIST
    ======================================================== */

    list: {
      paddingBottom:
        spacing.xl * 3,
    },

    emptyList: {
      flexGrow: 1,
    },

    /* ========================================================
       USER CARD
    ======================================================== */

    userCard: {
      minHeight: 78,
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

    avatar: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        colors.primaryLight,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 10,
      flexShrink: 0,
    },

    avatarText: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: '700',
    },

    userContent: {
      flex: 1,
      minWidth: 0,
    },

    userName: {
      ...typography.bodyBold,
      color: colors.text,
      fontSize: 14,
    },

    userEmail: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 2,
    },

    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      marginTop: 5,
    },

    roleText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '700',
    },

    removeButton: {
      marginLeft: 7,
      paddingHorizontal: 4,
      paddingVertical: 7,
      flexShrink: 0,
    },

    removePressed: {
      opacity: 0.5,
    },

    removeText: {
      fontSize: 11,
      color: colors.danger,
      fontWeight: '600',
    },

    ownerBadge: {
      marginLeft: 7,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.primaryLight,
    },

    ownerText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: '700',
    },

    /* ========================================================
       LOADING
    ======================================================== */

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingBottom: 70,
    },

    loadingText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },

    /* ========================================================
       EMPTY
    ======================================================== */

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 30,
      paddingBottom: 70,
    },

    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
    },

    emptySubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 5,
      lineHeight: 19,
    },

    retryButton: {
      marginTop: 14,
      paddingHorizontal: 17,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor:
        colors.primaryLight,
    },

    retryText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },

    /* ========================================================
       MODAL
    ======================================================== */

    modalOverlay: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        'rgba(15, 23, 42, 0.45)',
    },

    modalCard: {
      backgroundColor:
        colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 20,
      maxHeight: '92%',
    },

    modalHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 16,
    },

    modalTitle: {
      ...typography.h2,
      color: colors.text,
      fontWeight: '700',
    },

    modalSubtitle: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 2,
    },

    closeButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        colors.background,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    /* ========================================================
       PASSWORD
    ======================================================== */

    passwordContainer: {
      marginBottom: 15,
    },

    passwordLabel: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '500',
      marginBottom: 7,
    },

    passwordInputWrapper: {
      height: 52,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius: 13,
      backgroundColor:
        colors.surface,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingLeft: 13,
    },

    passwordInput: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 0,
    },

    eyeButton: {
      width: 43,
      height: 50,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    eyeIcon: {
      width: 21,
      height: 17,
      position: 'relative',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    eyeShape: {
      width: 19,
      height: 12,
      borderWidth: 1.6,
      borderColor:
        colors.textMuted,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    eyeDot: {
      width: 4,
      height: 4,
      borderRadius: 3,
      backgroundColor:
        colors.textMuted,
    },

    eyeSlash: {
      position: 'absolute',
      width: 24,
      height: 1.5,
      backgroundColor:
        colors.textMuted,
      transform: [
        {
          rotate: '45deg',
        },
      ],
    },

    /* ========================================================
       ROLE
    ======================================================== */

    roleSection: {
      marginBottom: 13,
    },

    roleLabel: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '500',
      marginBottom: 7,
    },

    roleGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 7,
    },

    roleOption: {
      minHeight: 39,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    radio: {
      width: 15,
      height: 15,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor:
        colors.borderStrong,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 6,
    },

    radioActive: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    roleOptionText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },

    /* ========================================================
       FORM ERROR
    ======================================================== */

    formErrorBox: {
      backgroundColor:
        colors.danger + '08',
      borderWidth: 1,
      borderColor:
        colors.danger + '25',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 12,
    },

    formErrorText: {
      fontSize: 12,
      color: colors.danger,
      lineHeight: 17,
    },

    /* ========================================================
       MODAL BUTTONS
    ======================================================== */

    modalButtons: {
      flexDirection:
        'row',
      gap: 8,
      marginTop: 3,
    },

    modalButton: {
      flex: 1,
    },

    /* ========================================================
       FAB
    ======================================================== */

    fab: {
      position: 'absolute',
      right: 18,
      bottom: 20,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor:
        colors.primary,
      alignItems: 'center',
      justifyContent:
        'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
    },

    fabPressed: {
      opacity: 0.85,
      transform: [
        {
          scale: 0.94,
        },
      ],
    },

    fabText: {
      color: colors.textInverse,
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '300',
    },
  }));