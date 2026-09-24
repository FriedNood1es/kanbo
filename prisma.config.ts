import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Unpooled connection — used by the Prisma CLI (migrate/studio), not by the running app.
    // Falls back to DATABASE_URL so commands that need no database (e.g. `prisma generate`
    // in postinstall) don't crash on hosts where only the runtime URL is set (Vercel, CI).
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
