import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Unpooled connection — used by the Prisma CLI (migrate/studio), not by the running app.
    url: env("DIRECT_URL"),
  },
});
