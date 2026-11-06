import { configureStore } from '@reduxjs/toolkit';

import authReducer from '@/redux/slices/authSlice';
import leadsReducer from '@/redux/slices/leadsSlice';
import opportunitiesReducer from '@/redux/slices/opportunitiesSlice';
import activitiesReducer from '@/redux/slices/activitiesSlice';
import usersReducer from '@/redux/slices/usersSlice';
import brandingReducer from '@/redux/slices/brandingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leads: leadsReducer,
    opportunities: opportunitiesReducer,
    activities: activitiesReducer,
    users: usersReducer,
    branding: brandingReducer,
  },
});

export type RootState =
  ReturnType<typeof store.getState>;

export type AppDispatch =
  typeof store.dispatch;