import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "fontkit", "linebreak", "unicode-properties", "brotli"],
};
export default nextConfig;
