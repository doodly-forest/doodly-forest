import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the keyless Playwright server separate from a user's running dev server.
  distDir: process.env.STORY_E2E === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
