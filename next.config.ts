import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp (used server-side to trim black bars from uploaded blog images) is a
  // native module — keep it external so it is required at runtime instead of
  // being bundled/traced into the standalone server.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
