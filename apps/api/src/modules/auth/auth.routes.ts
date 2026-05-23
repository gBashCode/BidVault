import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@sealedbid/db";
import { hashPII, encryptPII } from "@sealedbid/crypto";
import { randomBytes, pbkdf2Sync } from "crypto";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  role: z.enum(["VENDOR", "PROCUREMENT_MANAGER"]),
  gstn: z.string().min(1, "GSTN is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  website: z.string().url("Website must be a valid URL"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Utility to hash passwords simply
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 210000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Utility to verify passwords
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  const hash = pbkdf2Sync(password, salt, 210000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/v1/auth/signup",
    {
      schema: {
        body: SignupSchema,
      },
    },
    async (request, reply) => {
      const { email, password, companyName, role, gstn, address, phone, website } = request.body as z.infer<typeof SignupSchema>;

      // Hash email for deterministic DB lookup
      const emailHash = hashPII(email);

      // Check if user exists
      // In Prisma we bypass RLS for signup checks by using raw query or mockDB direct
      // We will just do a standard prisma query (since during signup RLS isn't fully active yet, 
      // but in mock DB findUnique relies on RLS Context which is null, so it returns all)
      const existingUser = await prisma.user.findUnique({
        where: { emailHash },
      });

      if (existingUser) {
        return reply.code(400).send({ message: "User already exists." });
      }

      // Encrypt PII
      const encryptedEmail = await encryptPII(email);
      const encryptedName = await encryptPII(companyName);
      const encryptedGstn = await encryptPII(gstn);
      const encryptedAddress = await encryptPII(address);
      const encryptedPhone = await encryptPII(phone);
      const encryptedWebsite = await encryptPII(website);
      const passwordHash = hashPassword(password);

      // Create Org first
      const org = await prisma.org.create({
        data: {
          encryptedName,
          encryptedGstn,
          encryptedAddress,
          encryptedPhone,
          encryptedWebsite,
          type: role === "VENDOR" ? "ENTERPRISE" : "GOVERNMENT",
        },
      });

      // Create User
      const user = await prisma.user.create({
        data: {
          orgId: org.id,
          emailHash,
          encryptedEmail,
          passwordHash,
          role,
        },
      });

      // Issue JWT
      const token = fastify.jwt.sign({
        id: user.id,
        orgId: org.id,
        role: user.role,
        email: email,
      });

      // Set cookie (same exact logic as the mock login)
      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 3600,
      });

      return reply.send({ success: true, userId: user.id, orgId: org.id, role: user.role });
    }
  );

  fastify.post(
    "/v1/auth/login",
    {
      schema: {
        body: LoginSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof LoginSchema>;

      const emailHash = hashPII(email);

      const user = await prisma.user.findUnique({
        where: { emailHash },
      });

      if (!user) {
        return reply.code(401).send({ message: "Invalid credentials." });
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ message: "Invalid credentials." });
      }

      // Issue JWT
      const token = fastify.jwt.sign({
        id: user.id,
        orgId: user.orgId,
        role: user.role,
        email: email,
      });

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 3600,
      });

      return reply.send({ success: true, userId: user.id, orgId: user.orgId, role: user.role });
    }
  );
}
