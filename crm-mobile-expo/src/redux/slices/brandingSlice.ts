import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import * as companyApi from '@/api/company.api';
import { getApiErrorMessage } from '@/api/client';
import {
  hydrateSession,
  login,
  logout,
  register,
} from '@/redux/slices/authSlice';
import {
  getPreference,
  removePreference,
  setPreference,
} from '@/storage/secureStorage';

import type {
  BrandingResponse,
  BrandingUpdate,
  CompanyProfileUpdate,
  Me,
  PublicBranding,
  UserThemePreferences,
} from '@/types';

/* ============================================================
   STATE
   ------------------------------------------------------------
   data       branding for the signed-in user (from /auth/me or
              /company/branding). Cleared on logout so the next
              account never sees the previous company's look.
   preLogin   branding looked up by company code on the login
              screen (public, presentation-only).
============================================================ */

export interface BrandingState {
  data: BrandingResponse | null;
  preLogin: PublicBranding | null;
  isSaving: boolean;
  isLoadingPublic: boolean;
  error: string | null;
  /** Success message shown after a save (survives the theme re-mount). */
  notice: string | null;
}

const initialState: BrandingState = {
  data: null,
  preLogin: null,
  isSaving: false,
  isLoadingPublic: false,
  error: null,
  notice: null,
};

const PRE_LOGIN_KEY = 'prelogin_branding';

/* ============================================================
   THUNKS
============================================================ */

export const fetchBranding = createAsyncThunk(
  'branding/fetch',
  async (_: void, { rejectWithValue }) => {
    try {
      return await companyApi.getBranding();
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const saveCompanyBranding = createAsyncThunk(
  'branding/saveCompany',
  async (update: BrandingUpdate, { rejectWithValue }) => {
    try {
      return await companyApi.updateBranding(update);
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const saveCompanyProfile = createAsyncThunk(
  'branding/saveProfile',
  async (update: CompanyProfileUpdate, { rejectWithValue }) => {
    try {
      return await companyApi.updateCompanyProfile(update);
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

export const saveMyThemePreferences = createAsyncThunk(
  'branding/savePreferences',
  async (update: Partial<UserThemePreferences>, { rejectWithValue }) => {
    try {
      return await companyApi.updateMyThemePreferences(update);
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

/** Login screen: load a company's look by its company code. */
export const loadPublicBranding = createAsyncThunk(
  'branding/loadPublic',
  async (companyCode: string, { rejectWithValue }) => {
    try {
      const branding = await companyApi.getPublicBranding(companyCode);
      await setPreference(PRE_LOGIN_KEY, branding);
      return branding;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  },
);

/** App start: restore the last company code's look. */
export const restorePublicBranding = createAsyncThunk(
  'branding/restorePublic',
  async () => getPreference<PublicBranding>(PRE_LOGIN_KEY),
);

export const clearPublicBranding = createAsyncThunk(
  'branding/clearPublic',
  async () => {
    await removePreference(PRE_LOGIN_KEY);
  },
);

/* ============================================================
   SLICE
============================================================ */

function fromMe(payload: Me | null | undefined): BrandingResponse | null {
  return payload?.branding ?? null;
}

const brandingSlice = createSlice({
  name: 'branding',
  initialState,
  reducers: {
    clearBrandingError(state) {
      state.error = null;
    },
    clearBrandingNotice(state) {
      state.notice = null;
    },
    setBranding(state, action: PayloadAction<BrandingResponse | null>) {
      state.data = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      /* Branding arrives with /auth/me on every sign-in. */
      .addCase(hydrateSession.fulfilled, (state, action) => {
        state.data = fromMe(action.payload);
      })
      .addCase(login.fulfilled, (state, action) => {
        state.data = fromMe(action.payload);
      })
      .addCase(register.fulfilled, (state, action) => {
        state.data = fromMe(action.payload);
      })
      .addCase(logout.pending, state => {
        state.data = null;
      })
      .addCase(logout.fulfilled, state => {
        state.data = null;
      })

      .addCase(fetchBranding.fulfilled, (state, action) => {
        state.data = action.payload;
      })

      .addCase(loadPublicBranding.pending, state => {
        state.isLoadingPublic = true;
        state.error = null;
      })
      .addCase(loadPublicBranding.fulfilled, (state, action) => {
        state.isLoadingPublic = false;
        state.preLogin = action.payload;
      })
      .addCase(loadPublicBranding.rejected, (state, action) => {
        state.isLoadingPublic = false;
        state.error = String(action.payload ?? 'Company code not found');
      })
      .addCase(restorePublicBranding.fulfilled, (state, action) => {
        state.preLogin = action.payload;
      })
      .addCase(clearPublicBranding.fulfilled, state => {
        state.preLogin = null;
      });

    const notices = new Map<string, string>([
      [saveCompanyBranding.fulfilled.type, 'Company branding saved for everyone.'],
      [saveCompanyProfile.fulfilled.type, 'Company profile saved.'],
      [saveMyThemePreferences.fulfilled.type, 'Your appearance was saved.'],
    ]);

    for (const thunk of [saveCompanyBranding, saveCompanyProfile, saveMyThemePreferences]) {
      builder
        .addCase(thunk.pending, state => {
          state.isSaving = true;
          state.error = null;
          state.notice = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.isSaving = false;
          state.data = action.payload;
          state.notice = notices.get(action.type) ?? null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.isSaving = false;
          state.error = String(action.payload ?? 'Could not save changes');
        });
    }
  },
});

export const { clearBrandingError, clearBrandingNotice, setBranding } = brandingSlice.actions;

export default brandingSlice.reducer;
