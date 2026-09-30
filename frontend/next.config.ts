import type { NextConfig } from "next";

/**
 * The browser talks to same-origin /api/v1/*, which is proxied to the
 * Express backend. Set BACKEND_URL (e.g. https://api.nasoi.com) in the
 * environment; it is read at build time.
 */
const backend = (process.env.BACKEND_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000")).replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return backend ? [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
