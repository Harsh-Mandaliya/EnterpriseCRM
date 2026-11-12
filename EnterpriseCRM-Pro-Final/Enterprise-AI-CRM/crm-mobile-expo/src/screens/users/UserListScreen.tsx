import React, { useMemo, useState } from 'react';

import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  AdminStackParamList,
} from '@/navigation/AdminNavigator';


import { createThemedStyles } from '@/theme/themeStore';
import { colors } from '@/theme/colors';
/* ============================================================
   TYPES
============================================================ */

type UserRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'EMPLOYEE';

type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
}


/* ============================================================
   NAVIGATION TYPE
============================================================ */

type NavigationProp =
  NativeStackNavigationProp<
    AdminStackParamList,
    'UserManagement'
  >;


/* ============================================================
   SAMPLE USERS
============================================================ */

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Harsh Mandaliya',
    email: 'harsh@example.com',
    phone: '+91 98765 43210',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Rahul Patel',
    email: 'rahul@example.com',
    phone: '+91 98765 12345',
    role: 'MANAGER',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Amit Shah',
    email: 'amit@example.com',
    phone: '+91 98765 67890',
    role: 'SALES',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Priya Patel',
    email: 'priya@example.com',
    phone: '+91 98765 11111',
    role: 'EMPLOYEE',
    status: 'INACTIVE',
  },
];


/* ============================================================
   USER LIST SCREEN
============================================================ */

export function UserListScreen() {

  const navigation =
    useNavigation<NavigationProp>();

  const [users, setUsers] =
    useState<User[]>(initialUsers);

  const [search, setSearch] =
    useState('');

  const [selectedRole, setSelectedRole] =
    useState<'ALL' | UserRole>('ALL');


  /* ==========================================================
     FILTER USERS
  ========================================================== */

  const filteredUsers = useMemo(() => {

    return users.filter(user => {

      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        user.name
          .toLowerCase()
          .includes(searchText) ||

        user.email
          .toLowerCase()
          .includes(searchText) ||

        user.phone
          .toLowerCase()
          .includes(searchText);

      const matchesRole =
        selectedRole === 'ALL' ||
        user.role === selectedRole;

      return (
        matchesSearch &&
        matchesRole
      );
    });

  }, [
    users,
    search,
    selectedRole,
  ]);


  /* ==========================================================
     DELETE USER
  ========================================================== */

  const handleDelete = (id: string) => {

    setUsers(currentUsers =>
      currentUsers.filter(
        user => user.id !== id,
      ),
    );
  };


  /* ==========================================================
     ADD USER
  ========================================================== */

  const handleAddUser = () => {

    // You can later replace this
    // with your UserFormScreen.

    console.log('Add user pressed');
  };


  /* ==========================================================
     ROLE COLOR
  ========================================================== */

  const getRoleStyle = (
    role: UserRole,
  ) => {

    switch (role) {

      case 'OWNER':
        return styles.ownerBadge;

      case 'ADMIN':
        return styles.adminBadge;

      case 'MANAGER':
        return styles.managerBadge;

      case 'SALES':
        return styles.salesBadge;

      case 'EMPLOYEE':
        return styles.employeeBadge;

      default:
        return styles.employeeBadge;
    }
  };


  /* ==========================================================
     USER CARD
  ========================================================== */

  const renderUser = ({
    item,
  }: {
    item: User;
  }) => {

    return (
      <View style={styles.card}>

        {/* USER HEADER */}

        <View style={styles.userHeader}>

          <View style={styles.avatar}>

            <Text style={styles.avatarText}>
              {item.name
                .charAt(0)
                .toUpperCase()}
            </Text>

          </View>

          <View style={styles.userInfo}>

            <Text style={styles.userName}>
              {item.name}
            </Text>

            <Text style={styles.userEmail}>
              {item.email}
            </Text>

          </View>

        </View>


        {/* USER DETAILS */}

        <View style={styles.details}>

          <Text style={styles.phone}>
            📞 {item.phone}
          </Text>

          <View style={styles.badgesRow}>

            <View
              style={[
                styles.roleBadge,
                getRoleStyle(item.role),
              ]}
            >

              <Text style={styles.badgeText}>
                {item.role}
              </Text>

            </View>


            <View
              style={[
                styles.statusBadge,
                item.status === 'ACTIVE'
                  ? styles.activeBadge
                  : styles.inactiveBadge,
              ]}
            >

              <Text style={styles.badgeText}>
                {item.status}
              </Text>

            </View>

          </View>

        </View>


        {/* ACTIONS */}

        <View style={styles.actions}>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              console.log(
                'View user:',
                item.id,
              );
            }}
          >

            <Text style={styles.viewButtonText}>
              View
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              console.log(
                'Edit user:',
                item.id,
              );
            }}
          >

            <Text style={styles.editButtonText}>
              Edit
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              handleDelete(item.id)
            }
          >

            <Text style={styles.deleteButtonText}>
              Delete
            </Text>

          </TouchableOpacity>

        </View>

      </View>
    );
  };


  /* ==========================================================
     SCREEN
  ========================================================== */

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <View>

          <Text style={styles.title}>
            User Management
          </Text>

          <Text style={styles.subtitle}>
            Manage system users and roles
          </Text>

        </View>


        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddUser}
        >

          <Text style={styles.addButtonText}>
            + Add User
          </Text>

        </TouchableOpacity>

      </View>


      {/* SEARCH */}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search users..."
        placeholderTextColor={colors.textFaint}
        style={styles.searchInput}
      />


      {/* ROLE FILTER */}

      <View style={styles.filterContainer}>

        {(
          [
            'ALL',
            'ADMIN',
            'MANAGER',
            'SALES',
            'EMPLOYEE',
          ] as const
        ).map(role => (

          <TouchableOpacity
            key={role}
            style={[
              styles.filterButton,
              selectedRole === role &&
                styles.selectedFilter,
            ]}
            onPress={() =>
              setSelectedRole(role)
            }
          >

            <Text
              style={[
                styles.filterText,
                selectedRole === role &&
                  styles.selectedFilterText,
              ]}
            >
              {role}
            </Text>

          </TouchableOpacity>

        ))}

      </View>


      {/* USER COUNT */}

      <Text style={styles.countText}>
        {filteredUsers.length} user
        {filteredUsers.length !== 1
          ? 's'
          : ''}
      </Text>


      {/* USER LIST */}

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }

        ListEmptyComponent={

          <View style={styles.emptyContainer}>

            <Text style={styles.emptyTitle}>
              No users found
            </Text>

            <Text style={styles.emptyText}>
              Try changing your search or filter.
            </Text>

          </View>
        }
      />

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },


  /* HEADER */

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },


  /* ADD BUTTON */

  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },

  addButtonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },


  /* SEARCH */

  searchInput: {
    marginHorizontal: 20,
    marginTop: 8,

    height: 48,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: '#D0D5DD',

    borderRadius: 10,

    paddingHorizontal: 15,

    fontSize: 15,

    color: colors.text,
  },


  /* FILTER */

  filterContainer: {
    flexDirection: 'row',

    paddingHorizontal: 20,

    marginTop: 14,

    gap: 8,

    flexWrap: 'wrap',
  },

  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 20,

    backgroundColor: '#EAECF0',
  },

  selectedFilter: {
    backgroundColor: colors.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  selectedFilterText: {
    color: colors.textInverse,
  },


  /* COUNT */

  countText: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,

    fontSize: 14,
    fontWeight: '600',

    color: colors.textSecondary,
  },


  /* LIST */

  listContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },


  /* USER CARD */

  card: {
    backgroundColor: colors.surface,

    borderRadius: 12,

    padding: 16,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.05,

    shadowRadius: 4,

    elevation: 2,
  },


  /* USER HEADER */

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: colors.primaryLight,

    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },

  userInfo: {
    flex: 1,
    marginLeft: 12,
  },

  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  userEmail: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },


  /* DETAILS */

  details: {
    marginTop: 14,
  },

  phone: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },

  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },


  /* ROLE COLORS */

  ownerBadge: {
    backgroundColor: colors.accent,
  },

  adminBadge: {
    backgroundColor: colors.primary,
  },

  managerBadge: {
    backgroundColor: '#0891B2',
  },

  salesBadge: {
    backgroundColor: colors.success,
  },

  employeeBadge: {
    backgroundColor: '#64748B',
  },


  /* STATUS */

  activeBadge: {
    backgroundColor: colors.success,
  },

  inactiveBadge: {
    backgroundColor: '#98A2B3',
  },


  /* ACTIONS */

  actions: {
    flexDirection: 'row',

    marginTop: 16,

    paddingTop: 12,

    borderTopWidth: 1,
    borderTopColor: colors.border,

    gap: 8,
  },

  viewButton: {
    flex: 1,

    alignItems: 'center',

    paddingVertical: 9,

    borderRadius: 7,

    backgroundColor: colors.primaryLight,
  },

  viewButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  editButton: {
    flex: 1,

    alignItems: 'center',

    paddingVertical: 9,

    borderRadius: 7,

    backgroundColor: colors.successSoft,
  },

  editButtonText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },

  deleteButton: {
    flex: 1,

    alignItems: 'center',

    paddingVertical: 9,

    borderRadius: 7,

    backgroundColor: colors.dangerSoft,
  },

  deleteButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },


  /* EMPTY */

  emptyContainer: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 60,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },

}));