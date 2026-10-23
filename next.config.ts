import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Separate the development build directory from production to prevent webpack chunk collisions
  // and 'Cannot find module' errors in cloud-based preview environments.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  
  // Standard Next.js configuration for optimal chunk loading
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = { level: 'error' };
    }
    return config;
  },
};

export default nextConfig;