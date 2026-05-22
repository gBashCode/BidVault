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

// Server Action: Login (signs JWT with standard secret, sets httpOnly cookie)
export const loginAction = createServerFn({ method: "POST" })
  .inputValidator(userPayloadSchema)
  .handler(async ({ data }) => {
    // Generate simple JWT matching standard header/payload signature using standard library
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        id: data.id,
        orgId: data.orgId,
        role: data.role,
        email: data.email || `${data.id.slice(0, 5)}@sealedbid.com`,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
      })
    ).toString("base64url");

    // In local development, we sign using a simple HMAC-SHA256 representation matching fastify's secret
    const crypto = await import("crypto");
    const secret = process.env.JWT_SECRET || "sealedbid-dev-secret-change-in-production";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    const token = `${header}.${payload}.${signature}`;

    // Set cookie on response headers using Set-Cookie
    return {
      headers: {
        "Set-Cookie": `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600; SameSite=Lax`,
      },
      user: data,
    };
  });

// Server Action: Logout (clears httpOnly cookie)
export const logoutAction = createServerFn({ method: "POST" }).handler(async () => {
  return {
    headers: {
      "Set-Cookie": "token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
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
