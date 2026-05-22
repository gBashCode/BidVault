import { createServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { z } from "zod";

// Standard payload interface matching Fastify JWT schema
export interface UserPayload {
  id: string;
  orgId: string;
  role: "ORG_ADMIN" | "PROCUREMENT_MANAGER" | "AUDITOR" | "VENDOR";
  email?: string;
}

const userPayloadSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  role: z.enum(["ORG_ADMIN", "PROCUREMENT_MANAGER", "AUDITOR", "VENDOR"]),
  email: z.string().optional(),
});

// Server Action: Login (proxies to fastify backend)
export const loginAction = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string() }))
  .handler(async ({ data }) => {
    try {
      const res = await axios.post("http://localhost:4000/v1/auth/login", data, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const cookies = res.headers["set-cookie"];
      if (cookies && cookies.length > 0) {
        const { setResponseHeader } = await import("@tanstack/react-start/server");
        setResponseHeader("Set-Cookie", cookies[0]);
      }
      return { success: true, user: res.data };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  });

export const signupAction = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    password: z.string(),
    companyName: z.string(),
    role: z.enum(["VENDOR", "PROCUREMENT_MANAGER"])
  }))
  .handler(async ({ data }) => {
    try {
      const res = await axios.post("http://localhost:4000/v1/auth/signup", data, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      const cookies = res.headers["set-cookie"];
      if (cookies && cookies.length > 0) {
        const { setResponseHeader } = await import("@tanstack/react-start/server");
        setResponseHeader("Set-Cookie", cookies[0]);
      }
      return { success: true, user: res.data };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Signup failed");
    }
  });

// Server Action: Logout (clears httpOnly cookie)
export const logoutAction = createServerFn({ method: "POST" }).handler(async () => {
  const cookieValue = "token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Set-Cookie", cookieValue);

  return {
    headers: {
      "Set-Cookie": cookieValue,
    },
    success: true,
  };
});

// Server Action: Refresh session
export const refreshAction = createServerFn({ method: "POST" }).handler(async () => {
  return { success: true };
});

// Client-side authentication hooks
export function useUser() {
  const { data: user, isLoading } = useQuery<UserPayload | null>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      try {
        const res = await axios.get("/api/auth/me");
        return res.data;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60 * 1000, // 1 minute fresh
  });

  return { user, isLoading };
}

export function useRole() {
  const { user } = useUser();
  return user?.role || null;
}

export function useOrg() {
  const { user } = useUser();
  return user?.orgId || null;
}
