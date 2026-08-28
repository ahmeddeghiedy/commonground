import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [] },
  async headers() {
    const originTrialToken = process.env.WEBMCP_ORIGIN_TRIAL_TOKEN;
    if (!originTrialToken) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "Origin-Trial", value: originTrialToken }],
      },
    ];
  },
};

export default nextConfig;
