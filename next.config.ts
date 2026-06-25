import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.zippopotam.us",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/directory", destination: "/listings", permanent: true },
      { source: "/directory/:path*", destination: "/listings/:path*", permanent: true },
      { source: "/community", destination: "/feed", permanent: true },
      { source: "/forum", destination: "/feed?tab=discussions", permanent: true },
      { source: "/collaborate", destination: "/partnerships", permanent: true },
      { source: "/collaborate/:path*", destination: "/partnerships/:path*", permanent: true },
      { source: "/groups", destination: "/partnerships?tab=groups", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
