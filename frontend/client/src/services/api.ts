import axios, {
    type AxiosResponse,
    AxiosHeaders,
    type InternalAxiosRequestConfig,
    type AxiosRequestConfig,
  } from "axios";
  
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    withCredentials: true,
  });
  
  // ===== in-memory tokens =====
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  
  /** initialize once on app start (optional) */
  export function loadTokensFromStorage(): void {
    accessToken = localStorage.getItem("accessToken");
    refreshToken = localStorage.getItem("refreshToken");
  }
  
  /** internal helper to update both memory + storage */
  function setTokens(access: string | null, refresh: string | null): void {
    accessToken = access;
    refreshToken = refresh;
  
    if (access) localStorage.setItem("accessToken", access);
    else localStorage.removeItem("accessToken");
  
    if (refresh) localStorage.setItem("refreshToken", refresh);
    else localStorage.removeItem("refreshToken");
  }
  
  /** exported manager only for services layer */
  export const TokenManager = {
    get access() {
      return accessToken;
    },
    get refresh() {
      return refreshToken;
    },
    set(access: string | null, refresh: string | null) {
      setTokens(access, refresh);
    },
    clear() {
      setTokens(null, null);
    },
  };
  
  // ===== request: attach Authorization =====
  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      if (!config.headers) config.headers = new AxiosHeaders();
      (config.headers as AxiosHeaders).set("Authorization", `Bearer ${accessToken}`);
    }
    return config;
  });
  
  // ===== refresh-once flow =====
  let refreshingPromise: Promise<string | null> | null = null;
  
  async function refreshAccess(): Promise<string | null> {
    if (!refreshToken) return null;
    try {
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${import.meta.env.VITE_API_BASE}/auth/refresh`,
        { refreshToken }
      );
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  }
  
  // ===== response: on 401 try refresh once =====
  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err) => {
      const original = err.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      if (err.response?.status === 401 && original && !original._retry) {
        original._retry = true;
  
        refreshingPromise = refreshingPromise ?? refreshAccess();
        const newAccess = await refreshingPromise;
        refreshingPromise = null;
  
        if (newAccess) {
          if (!original.headers) original.headers = new AxiosHeaders();
          (original.headers as AxiosHeaders).set("Authorization", `Bearer ${newAccess}`);
          // Axios wants a plain AxiosRequestConfig for re-dispatch
          return api(original as AxiosRequestConfig);
        }
      }
      return Promise.reject(err);
    }
  );
  
  export default api;
  