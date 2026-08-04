import type { NextConfig } from "next";

function parseHostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const s3Hostname = parseHostname(process.env.S3_PUBLIC_URL);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(s3Hostname
        ? [
            {
              protocol: "http" as const,
              hostname: s3Hostname,
              pathname: "/**",
            },
            {
              protocol: "https" as const,
              hostname: s3Hostname,
              pathname: "/**",
            },
          ]
        : [
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "9000",
              pathname: "/**",
            },
          ]),
    ],
  },
};

export default nextConfig;
