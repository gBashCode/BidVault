import { prisma, mockRlsContext } from "./client.js";

export async function withRls<T>(
  user: { id: string; orgId: string },
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  if (prisma.isDbReachable === false) {
    return mockRlsContext.run({ currentUserId: user.id, currentOrgId: user.orgId }, async () => {
      return await prisma.$transaction(async (tx: any) => {
        return await fn(tx);
      });
    });
  }

  return await prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${user.id}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${user.orgId}'`);
    return await fn(tx);
  });
}
