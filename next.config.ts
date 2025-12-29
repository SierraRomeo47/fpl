
import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/app",
  sw: "service-worker.js",
});

const nextConfig: NextConfig = {
  // Prevent build issues with Puppeteer which uses dynamic requires
  serverExternalPackages: ["puppeteer-extra", "puppeteer-extra-plugin-stealth", "puppeteer"],
  experimental: {
    // Only if needed for advanced server actions or similar
  },
  // Turbopack configuration (empty config to silence warning)
  turbopack: {},
};

export default withPWA(nextConfig);
