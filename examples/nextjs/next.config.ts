import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // placehold.co — 예제용 placeholder 이미지 호스트
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
