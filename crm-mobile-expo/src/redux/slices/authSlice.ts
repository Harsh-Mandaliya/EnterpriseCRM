import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

import * as authApi from '@/api/auth.api';

import {
  saveTokens,
  clearTokens,
  getRefreshToken,
  hasStoredSession,
  forgetOtherCompanyCode,
} from '@/storage/secureStorage';

import type { Me } from '@/types';

/* ============================================================
   AUTH STATE
============================================================ */

interface AuthState {
  status:
    | 'idle'
    | 'loading'
    | 'authenticated'
    | 'unauthenticated';

  isSubmitting: boolean;

  error: string | null;

  user: Me | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: AuthState = {
  status: 'idle',
  isSubmitting: false,
  error: null,
  user: null,
};

/* ============================================================
   HYDRATE SESSION
============================================================ */

export const hydrateSession = createAsyncThunk(
  'auth/hydrate',

  async () => {
    /*
     * First check whether local tokens exist.
     */

    const hasSession =
      await hasStoredSession();

    if (!hasSession) {
      return null;
    }

    try {
      /*
       * Get the real authenticated user.
       *
       * This is important because RootNavigator
       * needs user.role.
       */

      const user =
        await authApi.me();

      await forgetOtherCompanyCode(user?.company?.slug).catch(() => false);

      return user;
    } catch (error) {
      /*
       * Access + refresh session is no longer valid.
       */

      await clearTokens();

      return null;
    }
  },
);

/* ============================================================
   LOGIN
============================================================ */

export const login = createAsyncThunk(
  'auth/login',

  async (
    input: {
      email: string;
      password: string;
      companyCode?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      /*
       * 1. Login
       */

      const tokens =
        await authApi.login(
          input.email,
          input.password,
          input.companyCode,
        );

      /*
       * 2. Store tokens
       */

      await saveTokens(tokens);

      /*
       * 3. Get logged-in user
       */

      const user =
        await authApi.me();

      await forgetOtherCompanyCode(user?.company?.slug).catch(() => false);

      return user;
    } catch (err: any) {
      /*
       * If login/me fails, make sure
       * we don't leave an invalid session
       * on the device.
       */

      await clearTokens();

      return rejectWithValue(
        err?.response?.data?.error ??
          'Login failed',
      );
    }
  },
);

/* ============================================================
   REGISTER
============================================================ */

export const register = createAsyncThunk(
  'auth/register',

  async (
    input: {
      companyName: string;
      ownerName: string;
      email: string;
      password: string;
    },
    { rejectWithValue },
  ) => {
    try {
      /*
       * 1. Register company + owner
       */

      const tokens =
        await authApi.register(input);

      /*
       * 2. Store tokens
       */

      await saveTokens(tokens);

      /*
       * 3. Get newly-created owner
       */

      const user =
        await authApi.me();

      await forgetOtherCompanyCode(user?.company?.slug).catch(() => false);

      return user;
    } catch (err: any) {
      /*
       * Don't leave a partial/invalid
       * authentication session.
       */

      await clearTokens();

      return rejectWithValue(
        err?.response?.data?.error ??
          'Registration failed',
      );
    }
  },
);

/* ============================================================
   LOGOUT
============================================================ */

export const logout = createAsyncThunk(
  'auth/logout',

  async () => {
    const refreshToken =
      await getRefreshToken();

    if (refreshToken) {
      /*
       * Server-side logout is best effort.
       */

      await authApi
        .logout(refreshToken)
        .catch(() => undefined);
    }

    /*
     * Local logout must always happen.
     */

    await clearTokens();
  },
);

/* ============================================================
   SLICE
============================================================ */

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    /* --------------------------------------------------------
       CLEAR ERROR
    -------------------------------------------------------- */

    clearError(state) {
      state.error = null;
    },

    /* --------------------------------------------------------
       SET USER
    -------------------------------------------------------- */

    setUser(
      state,
      action: PayloadAction<Me>,
    ) {
      state.user = action.payload;
    },
  },

  extraReducers: builder => {
    builder

      /* ======================================================
         HYDRATE
      ====================================================== */

      .addCase(
        hydrateSession.pending,
        state => {
          state.status = 'loading';
          state.error = null;
        },
      )

      .addCase(
        hydrateSession.fulfilled,
        (
          state,
          action: PayloadAction<Me | null>,
        ) => {
          if (action.payload) {
            state.status =
              'authenticated';

            state.user =
              action.payload;
          } else {
            state.status =
              'unauthenticated';

            state.user = null;
          }
        },
      )

      .addCase(
        hydrateSession.rejected,
        state => {
          state.status =
            'unauthenticated';

          state.user = null;

          state.error =
            'Session expired';
        },
      )

      /* ======================================================
         LOGIN
      ====================================================== */

      .addCase(
        login.pending,
        state => {
          state.isSubmitting = true;
          state.error = null;
        },
      )

      .addCase(
        login.fulfilled,
        (
          state,
          action: PayloadAction<Me>,
        ) => {
          state.isSubmitting = false;

          state.status =
            'authenticated';

          state.user =
            action.payload;

          state.error = null;
        },
      )

      .addCase(
        login.rejected,
        (
          state,
          action,
        ) => {
          state.isSubmitting = false;

          state.status =
            'unauthenticated';

          state.user = null;

          state.error =
            (action.payload as string) ??
            'Login failed';
        },
      )

      /* ======================================================
         REGISTER
      ====================================================== */

      .addCase(
        register.pending,
        state => {
          state.isSubmitting = true;
          state.error = null;
        },
      )

      .addCase(
        register.fulfilled,
        (
          state,
          action: PayloadAction<Me>,
        ) => {
          state.isSubmitting = false;

          state.status =
            'authenticated';

          state.user =
            action.payload;

          state.error = null;
        },
      )

      .addCase(
        register.rejected,
        (
          state,
          action,
        ) => {
          state.isSubmitting = false;

          state.status =
            'unauthenticated';

          state.user = null;

          state.error =
            (action.payload as string) ??
            'Registration failed';
        },
      )

      /* ======================================================
         LOGOUT
      ====================================================== */

      .addCase(
        logout.fulfilled,
        state => {
          state.status =
            'unauthenticated';

          state.user = null;

          state.error = null;

          state.isSubmitting = false;
        },
      );
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  clearError,
  setUser,
} = authSlice.actions;

/* ============================================================
   REDUCER
============================================================ */

export default authSlice.reducer;