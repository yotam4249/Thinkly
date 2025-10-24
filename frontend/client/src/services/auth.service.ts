import api, { TokenManager } from "./api";
import type { User } from "../types/user.type";

type AuthResponse = {
  user: User;                
  accessToken: string;
  refreshToken: string;
};

export type Credentials = {
  username: string;
  password: string;
};

async function register(creds: Credentials): Promise<User> {
  const { data } = await api.post<AuthResponse>("/auth/register", creds);
  TokenManager.set(data.accessToken, data.refreshToken);
  return data.user;          
}

async function login(creds: Credentials): Promise<User> {
  const { data } = await api.post<AuthResponse>("/auth/login", creds);
  TokenManager.set(data.accessToken, data.refreshToken);
  return data.user;           
}

async function logout(): Promise<void> {
  const refresh = TokenManager.refresh ?? localStorage.getItem("refreshToken");
  try {
    if (refresh) await api.post("/auth/logout", { refreshToken: refresh });
  } finally {
    TokenManager.clear();
  }
}

const AuthService = { register, login, logout };
export default AuthService;
