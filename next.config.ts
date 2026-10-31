import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly so Turbopack doesn't try to infer it
  // from stray lockfiles higher up the filesystem (e.g. in the user profile).
  turbopack: {
    root: path.join(__dirname),
  },
  // The API sits behind the same origin so its cookies stay first-party.
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:4000"}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
