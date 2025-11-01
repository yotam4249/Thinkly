/* eslint-disable @typescript-eslint/no-unused-vars */
// const AuthService = { register, login, logout };
// export default AuthService;
import api, { TokenManager } from "./api";
import type { Gender, User } from "../types/user.type";

// 👇 import the store and the action
import { store } from "../store/store";          // adjust path if different
import { setUser, resetAuth } from "../store/slices/authSlice";

type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Credentials = {
  username: string;
  password: string;
  dateOfBirth?: string;
  gender?: Gender;
};

async function register(creds: Credentials): Promise<User> {
  const { data } = await api.post<AuthResponse>("/auth/register", creds);
  // do not set tokens here — we decided registration keeps you logged out
  return data.user;
}

async function login(creds: Credentials): Promise<User> {
  const { data } = await api.post<AuthResponse>("/auth/login", creds);
  TokenManager.set(data.accessToken, data.refreshToken);
  // ensure Redux reflects logged-in user
  store.dispatch(setUser(data.user));
  return data.user;
}

async function logout(): Promise<void> {
  const refresh = TokenManager.refresh ?? localStorage.getItem("refreshToken");
  try {
    if (refresh) {
      await api.post("/auth/logout", { refreshToken: refresh });
    }
  } finally {
    // clear tokens first
    TokenManager.clear();
    // and now ensure Redux sees "logged out"
    // choose one — both are fine:
    store.dispatch(setUser(null));
    // or: store.dispatch(resetAuth());
  }
}

const AuthService = { register, login, logout };
export default AuthService;
