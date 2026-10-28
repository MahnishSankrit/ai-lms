import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Makes the version from package.json available in the browser
  // (shown in the dashboard footer) without bundling all of package.json.
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Security headers on every response. frame-ancestors / X-Frame-Options
  // stop other sites from loading the app (e.g. the proctored exam page)
  // inside an iframe. The CSP is kept loose on scripts/styles because Next
  // injects inline scripts; tighten it with nonces later if needed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
