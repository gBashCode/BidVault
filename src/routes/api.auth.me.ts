import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookieHeader = request.headers.get("cookie") || "";
        const tokenCookie = cookieHeader
          .split(";")
          .find((c) => c.trim().startsWith("token="));

        if (!tokenCookie) {
          return new Response(JSON.stringify(null), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = tokenCookie.split("=")[1];
        try {
          const [, payloadB64] = token.split(".");
          const payloadString = Buffer.from(payloadB64, "base64url").toString("utf-8");
          const payload = JSON.parse(payloadString);
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify(null), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
