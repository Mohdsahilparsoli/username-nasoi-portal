import type { NextConfig } from "next";

/**
 * The browser talks to same-origin /api/v1/*, which is proxied to the
 * Express backend. Default: https://nasoi-api.vercel.app (production) and
 * http://localhost:4000 (local dev). Override with BACKEND_URL (read at
 * build time) — later this becomes https://api.nasoi.com.
 */
const DEFAULT_BACKEND = process.env.NODE_ENV === "production" ? "https://nasoi-api.vercel.app" : "http://localhost:4000";
const backend = (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, "");

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
