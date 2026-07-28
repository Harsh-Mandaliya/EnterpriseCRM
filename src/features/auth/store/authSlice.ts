import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  accessToken: null,
};

const slice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user;
      state.accessToken =
        action.payload.accessToken;
    },

    logout(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const {
  loginSuccess,
  logout,
} = slice.actions;

export default slice.reducer;