import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Loaded from node_modules at runtime instead of being bundled
  // (they ship native binaries / worker files the bundler can't handle).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // @napi-rs/canvas picks its native binary with a dynamic require, which
  // Vercel's file tracing can miss -- force the Linux binary into the
  // functions that read PDFs. Without it production failed with
  // "DOMMatrix is not defined".
  // pdfjs-dist also loads its worker file (pdf.worker.mjs) with a dynamic
  // import that tracing misses, so include that too.
  outputFileTracingIncludes: {
    "/api/ai/extract-pdf": [
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    // "*" not "[id]": these keys are glob patterns, and [id] would mean "i or d"
    "/api/upload/*": [
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
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
