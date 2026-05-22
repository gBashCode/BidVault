import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(env: any) {
  // `env.DB` is the D1 binding provided by Cloudflare
  return drizzle(env.DB, { schema });
}
