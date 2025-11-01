import { createSlice } from "@reduxjs/toolkit";
import type { AuthState } from "../../types/store.type";
import type { User } from "../../types/user.type";
import { loginThunk, logoutThunk, registerThunk } from "../thunks/authThunk";

const initialState: AuthState = {
    user: null,
    status: 'idle',
    error: null,
  };


const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action:{payload: User | null}) =>{
            state.user = action.payload;
        },

    },
    extraReducers: (builder) =>{
        builder
        //LOGIN
            .addCase(loginThunk.pending, (state) =>{
                state.status = 'loading';
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state,action) =>{
                state.status = 'succeeded';
                state.user = action.payload;
            })
            .addCase(loginThunk.rejected, (state,action) =>{
                state.status = 'failed';
                state.error = action.payload ?? 'LOGIN FAILED';
            })
        //REGISTER
            .addCase(registerThunk.pending, (state) => {
                state.status = 'loading';
                state.error = null;
              })
              .addCase(registerThunk.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user = action.payload;
              })
              .addCase(registerThunk.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'REGISTER_FAILED';
              })
        
            // LOGOUT
              .addCase(logoutThunk.fulfilled, (state) => {
                state.status = 'succeeded';
                state.user = null;
              })
              .addCase(logoutThunk.rejected, (state, action) => {
                // גם אם השרת נכשל — מקומית ננקה מצב
                state.status = 'failed';
                state.user = null;
                state.error = action.payload ?? 'LOGOUT_FAILED';
              });
    }
});

export const selectAuthUser = (s: { auth: AuthState }) => s.auth.user;
export const selectAuthStatus = (s: { auth: AuthState }) => s.auth.status;
export const selectAuthError = (s: { auth: AuthState }) => s.auth.error;
export const selectIsAuthenticated = (s: { auth: AuthState }) => !!s.auth.user;

export default authSlice.reducer;