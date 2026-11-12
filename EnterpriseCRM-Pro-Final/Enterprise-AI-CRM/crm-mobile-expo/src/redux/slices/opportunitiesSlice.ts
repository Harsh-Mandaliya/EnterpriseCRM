import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as opportunitiesApi from '@/api/opportunities.api';
import type { Opportunity, OpportunityStage } from '@/types';

interface OpportunitiesState {
  items: Opportunity[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

const initialState: OpportunitiesState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchOpportunities = createAsyncThunk(
  'opportunities/fetchAll',
  async (_: void, { rejectWithValue }) => {
    try {
      return await opportunitiesApi.listOpportunities();
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't load opportunities",
      );
    }
  },
);

export const changeOpportunityStage = createAsyncThunk(
  'opportunities/changeStage',
  async (
    { id, stage }: { id: string; stage: OpportunityStage },
    { rejectWithValue },
  ) => {
    try {
      return await opportunitiesApi.updateOpportunityStage(id, stage);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't move the deal",
      );
    }
  },
);

export const addOpportunity = createAsyncThunk(
  'opportunities/add',
  async (
    input: Parameters<typeof opportunitiesApi.createOpportunity>[0],
    { rejectWithValue },
  ) => {
    try {
      return await opportunitiesApi.createOpportunity(input);
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ?? "Couldn't create the deal",
      );
    }
  },
);

const opportunitiesSlice = createSlice({
  name: 'opportunities',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchOpportunities.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchOpportunities.fulfilled,
        (state, action: PayloadAction<Opportunity[]>) => {
          state.status = 'loaded';
          state.items = action.payload;
        },
      )
      .addCase(fetchOpportunities.rejected, (state, action) => {
        state.status = 'error';
        state.error =
          (action.payload as string) ?? 'Failed to load opportunities';
      })
      .addCase(
        changeOpportunityStage.fulfilled,
        (state, action: PayloadAction<Opportunity>) => {
          const index = state.items.findIndex(
            o => o.id === action.payload.id,
          );
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        },
      )
      .addCase(
        addOpportunity.fulfilled,
        (state, action: PayloadAction<Opportunity>) => {
          state.items.unshift(action.payload);
        },
      );
  },
});

export default opportunitiesSlice.reducer;
