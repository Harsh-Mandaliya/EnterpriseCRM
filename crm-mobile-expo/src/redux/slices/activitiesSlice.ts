import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

import * as activitiesApi from '@/api/activities.api';

import type { Activity } from '@/types';

/* ============================================================
   STATE
   ============================================================ */

interface ActivitiesState {
  items: Activity[];

  status: 'idle' | 'loading' | 'loaded' | 'error';

  error: string | null;
}

const initialState: ActivitiesState = {
  items: [],
  status: 'idle',
  error: null,
};

/* ============================================================
   FETCH ACTIVITIES
   ============================================================ */

export const fetchActivities = createAsyncThunk<
  Activity[],
  Parameters<typeof activitiesApi.listActivities>[0],
  {
    rejectValue: string;
  }
>(
  'activities/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await activitiesApi.listActivities(params);

      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't load tasks",
      );
    }
  },
);

/* ============================================================
   CREATE ACTIVITY
   ============================================================ */

export const addActivity = createAsyncThunk<
  Activity,
  Parameters<typeof activitiesApi.createActivity>[0],
  {
    rejectValue: string;
  }
>(
  'activities/add',
  async (input, { rejectWithValue }) => {
    try {
      const response =
        await activitiesApi.createActivity(input);

      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't create the task",
      );
    }
  },
);

/* ============================================================
   COMPLETE ACTIVITY
   ============================================================ */

export const markActivityComplete = createAsyncThunk<
  Activity,
  string,
  {
    rejectValue: string;
  }
>(
  'activities/complete',
  async (id, { rejectWithValue }) => {
    try {
      const response =
        await activitiesApi.completeActivity(id);

      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't update the task",
      );
    }
  },
);

/* ============================================================
   UPDATE ACTIVITY
   ============================================================ */

export const updateActivity = createAsyncThunk<
  Activity,
  {
    id: string;
    input: Parameters<typeof activitiesApi.updateActivity>[1];
  },
  {
    rejectValue: string;
  }
>(
  'activities/update',
  async ({ id, input }, { rejectWithValue }) => {
    try {
      const response =
        await activitiesApi.updateActivity(id, input);

      return response;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't update the task",
      );
    }
  },
);

/* ============================================================
   DELETE ACTIVITY
   ============================================================ */

export const deleteActivity = createAsyncThunk<
  string,
  string,
  {
    rejectValue: string;
  }
>(
  'activities/delete',
  async (id, { rejectWithValue }) => {
    try {
      await activitiesApi.deleteActivity(id);

      return id;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't delete the task",
      );
    }
  },
);

/* ============================================================
   SLICE
   ============================================================ */

const activitiesSlice = createSlice({
  name: 'activities',

  initialState,

  reducers: {},

  extraReducers: builder => {
    /* --------------------------------------------------------
       FETCH
       -------------------------------------------------------- */

    builder
      .addCase(fetchActivities.pending, state => {
        state.status = 'loading';
        state.error = null;
      })

      .addCase(
        fetchActivities.fulfilled,
        (
          state,
          action: PayloadAction<Activity[]>,
        ) => {
          state.status = 'loaded';

          state.items = action.payload;

          state.error = null;
        },
      )

      .addCase(
        fetchActivities.rejected,
        (state, action) => {
          state.status = 'error';

          state.error =
            action.payload ??
            'Failed to load tasks';
        },
      );

    /* --------------------------------------------------------
       CREATE
       -------------------------------------------------------- */

    builder
      .addCase(
        addActivity.pending,
        state => {
          state.error = null;
        },
      )

      .addCase(
        addActivity.fulfilled,
        (
          state,
          action: PayloadAction<Activity>,
        ) => {
          /*
           * Put newly created activity at the top.
           */
          state.items.unshift(action.payload);

          state.error = null;
        },
      )

      .addCase(
        addActivity.rejected,
        (state, action) => {
          state.error =
            action.payload ??
            'Failed to create task';
        },
      );

    /* --------------------------------------------------------
       COMPLETE
       -------------------------------------------------------- */

    builder
      .addCase(
        markActivityComplete.pending,
        state => {
          state.error = null;
        },
      )

      .addCase(
        markActivityComplete.fulfilled,
        (
          state,
          action: PayloadAction<Activity>,
        ) => {
          const index =
            state.items.findIndex(
              activity =>
                activity.id ===
                action.payload.id,
            );

          if (index !== -1) {
            /*
             * Replace the old PENDING activity
             * with the server response.
             *
             * The server response should contain:
             *
             * status: COMPLETED
             * completedById
             * completedBy
             * completedAt
             */
            state.items[index] =
              action.payload;
          }

          state.error = null;
        },
      )

      .addCase(
        markActivityComplete.rejected,
        (state, action) => {
          state.error =
            action.payload ??
            "Couldn't complete the task";
        },
      );

    /* --------------------------------------------------------
       UPDATE
       -------------------------------------------------------- */

    builder
      .addCase(
        updateActivity.pending,
        state => {
          state.error = null;
        },
      )

      .addCase(
        updateActivity.fulfilled,
        (
          state,
          action: PayloadAction<Activity>,
        ) => {
          const index =
            state.items.findIndex(
              activity =>
                activity.id ===
                action.payload.id,
            );

          if (index !== -1) {
            state.items[index] =
              action.payload;
          }

          state.error = null;
        },
      )

      .addCase(
        updateActivity.rejected,
        (state, action) => {
          state.error =
            action.payload ??
            "Couldn't update the task";
        },
      );

    /* --------------------------------------------------------
       DELETE
       -------------------------------------------------------- */

    builder
      .addCase(
        deleteActivity.pending,
        state => {
          state.error = null;
        },
      )

      .addCase(
        deleteActivity.fulfilled,
        (
          state,
          action: PayloadAction<string>,
        ) => {
          state.items =
            state.items.filter(
              activity =>
                activity.id !==
                action.payload,
            );

          state.error = null;
        },
      )

      .addCase(
        deleteActivity.rejected,
        (state, action) => {
          state.error =
            action.payload ??
            "Couldn't delete the task";
        },
      );
  },
});

export default activitiesSlice.reducer;