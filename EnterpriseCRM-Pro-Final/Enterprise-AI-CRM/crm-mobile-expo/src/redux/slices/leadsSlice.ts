import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as leadsApi from '@/api/leads.api';
import type { Lead, LeadStatus } from '@/types';

interface LeadsState {
  items: Lead[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

const initialState: LeadsState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchLeads = createAsyncThunk(
  'leads/fetchAll',
  async (params: { status?: LeadStatus } | undefined, { rejectWithValue }) => {
    try {
      return await leadsApi.listLeads(params);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't load leads",
      );
    }
  },
);

export const changeLeadStatus = createAsyncThunk(
  'leads/changeStatus',
  async (
    { id, status }: { id: string; status: LeadStatus },
    { rejectWithValue },
  ) => {
    try {
      return await leadsApi.updateLeadStatus(id, status);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't update the lead",
      );
    }
  },
);

export const addLead = createAsyncThunk(
  'leads/add',
  async (
    input: Parameters<typeof leadsApi.createLead>[0],
    { rejectWithValue },
  ) => {
    try {
      return await leadsApi.createLead(input);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't create the lead",
      );
    }
  },
);

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLeads.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchLeads.fulfilled,
        (state, action: PayloadAction<Lead[]>) => {
          state.status = 'loaded';
          state.items = action.payload;
        },
      )
      .addCase(fetchLeads.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Failed to load leads';
      })
      .addCase(
        changeLeadStatus.fulfilled,
        (state, action: PayloadAction<Lead>) => {
          const index = state.items.findIndex(l => l.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        },
      )
      .addCase(addLead.fulfilled, (state, action: PayloadAction<Lead>) => {
        state.items.unshift(action.payload);
      });
  },
});

export default leadsSlice.reducer;
