/** 买家会话状态（三形态门控的客户端镜像；真相源在后端 resolve_buyer）。 */
import { create } from "zustand";

import { api, errCode } from "@/lib/api";
import { clearToken, getToken, setRefreshToken, setToken } from "@/lib/token";

export type BuyerKind = "guest" | "individual" | "corporate";

interface AuthSession {
  kind: BuyerKind;
  username: string;
  verificationStatus: string | null;
  canSeePrice: boolean;
  canOrder: boolean;
}

interface AuthState extends AuthSession {
  loggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: {
    username: string;
    password: string;
    phone: string;
    buyerType: "individual" | "corporate";
    companyNameRu: string;
    inn: string;
  }) => Promise<string | null>; // 返回 error_code 或 null
  logout: () => void;
  bootstrap: () => void;
}

function sessionFromLogin(data: {
  buyer_kind: BuyerKind;
  can_see_price: boolean;
  can_order: boolean;
  verification_status?: string;
}): AuthSession {
  return {
    kind: data.buyer_kind,
    username: "",
    verificationStatus: data.verification_status ?? null,
    canSeePrice: data.can_see_price,
    canOrder: data.can_order,
  };
}

export const useAuth = create<AuthState>((set) => ({
  // 初始即读 token（与 admin 同款竞态修复：路由守卫首渲染早于 bootstrap effect，
  // 初始 false 会把已登录用户弹回 /login——e2e corporate-flow 实证）
  loggedIn: Boolean(getToken()),
  kind: "guest",
  username: "",
  verificationStatus: null,
  canSeePrice: false,
  canOrder: false,

  bootstrap: () => {
    if (getToken()) {
      // token 有效性与形态由后端各端点 meta 判定；此处仅恢复"已登录"态
      set({ loggedIn: true });
    }
  },

  login: async (username, password) => {
    const resp = await api.post("/auth/login", { username, password });
    const body = resp.data as {
      data: {
        access: string;
        refresh: string;
        buyer_kind: BuyerKind;
        can_see_price: boolean;
        can_order: boolean;
        verification_status: string;
      };
    };
    setToken(body.data.access);
    setRefreshToken(body.data.refresh);
    set({ loggedIn: true, ...sessionFromLogin(body.data), username });
  },

  register: async (input) => {
    try {
      const resp = await api.post("/auth/register", {
        username: input.username,
        password: input.password,
        phone: input.phone,
        buyer_type: input.buyerType,
        company_name_ru: input.companyNameRu,
        inn: input.inn,
      });
      const body = resp.data as {
        data: { access: string; refresh: string; buyer_kind: BuyerKind; verification_status: string };
      };
      setToken(body.data.access);
      setRefreshToken(body.data.refresh);
      set({
        loggedIn: true,
        kind: body.data.buyer_kind,
        username: input.username,
        verificationStatus: body.data.verification_status,
        canSeePrice: true,
        canOrder: body.data.buyer_kind === "individual",
      });
      return null;
    } catch (e) {
      return errCode(e) ?? "generic";
    }
  },

  logout: () => {
    clearToken(); // 内部已顺带清 refresh（token.ts）
    set({
      loggedIn: false,
      kind: "guest",
      username: "",
      verificationStatus: null,
      canSeePrice: false,
      canOrder: false,
    });
  },
}));
