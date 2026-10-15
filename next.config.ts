import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Makes the version from package.json available in the browser
  // (shown in the dashboard footer) without bundling all of package.json.
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
