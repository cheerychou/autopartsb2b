/** 管理端会话：token 存在即视为已登录（角色判定在后端 RBAC，无权端点返回 403）。 */
import { create } from "zustand";

import { api, errCode } from "@/lib/api";
import { clearToken, getToken, setRefreshToken, setToken } from "@/lib/token";

interface AdminAuth {
  loggedIn: boolean;
  username: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => void;
}

export const useAdminAuth = create<AdminAuth>((set) => ({
  // 初始即读 token（e2e 走查发现：bootstrap 在 useEffect 里晚于守卫首渲染，
  // 刷新任何页会被立即弹回 /login——恢复必须先于守卫首渲染）
  loggedIn: Boolean(getToken()),
  username: "",
  bootstrap: () => {
    if (getToken()) set({ loggedIn: true });
  },
  login: async (username, password) => {
    try {
      const resp = await api.post("/auth/token", { username, password });
      const body = resp.data as { access: string; refresh: string };
      setToken(body.access);
      setRefreshToken(body.refresh);
      set({ loggedIn: true, username });
    } catch (e) {
      if (errCode(e) === "NOT_ADMIN_ACCOUNT") throw new Error("notAdmin");
      throw new Error("credentials");
    }
  },
  logout: () => {
    clearToken(); // 内部已顺带清 refresh（token.ts）
    set({ loggedIn: false, username: "" });
  },
}));
