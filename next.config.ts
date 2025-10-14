
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // This is required to allow the Next.js dev server to accept requests from the
    // Firebase Studio preview environment.
    allowedDevOrigins: [
      '6000-firebase-studio-1754454757669.cluster-fnjdffmttjhy2qqdugh3yehhs2.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
