import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit", "linebreak", "unicode-properties", "brotli"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
