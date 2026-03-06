import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://lh3.googleusercontent.com; connect-src 'self' https://*.vercel.app https://accounts.google.com https://www.googleapis.com https://*.googleapis.com; img-src 'self' data: blob: https: https://lh3.googleusercontent.com https://*.googleusercontent.com; font-src 'self' data: https://fonts.gstatic.com https://use.typekit.net;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
