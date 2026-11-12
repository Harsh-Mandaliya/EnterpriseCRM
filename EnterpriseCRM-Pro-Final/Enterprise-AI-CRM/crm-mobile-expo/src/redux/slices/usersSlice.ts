import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as usersApi from '@/api/users.api';
import type { TeamUser } from '@/types';

interface UsersState {
  items: TeamUser[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_: void, { rejectWithValue }) => {
    try {
      return await usersApi.listUsers();
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't load your team",
      );
    }
  },
);

export const inviteUser = createAsyncThunk(
  'users/invite',
  async (
    input: Parameters<typeof usersApi.createUser>[0],
    { rejectWithValue },
  ) => {
    try {
      return await usersApi.createUser(input);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't add that teammate",
      );
    }
  },
);

export const removeUser = createAsyncThunk(
  'users/remove',
  async (id: string, { rejectWithValue }) => {
    try {
      await usersApi.deleteUser(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't remove that teammate",
      );
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchUsers.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchUsers.fulfilled,
        (state, action: PayloadAction<TeamUser[]>) => {
          state.status = 'loaded';
          state.items = action.payload;
        },
      )
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Failed to load team';
      })
      .addCase(
        inviteUser.fulfilled,
        (state, action: PayloadAction<TeamUser>) => {
          state.items.push(action.payload);
        },
      )
      .addCase(removeUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter(u => u.id !== action.payload);
      });
  },
});

export default usersSlice.reducer;
