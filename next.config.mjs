/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  /**
   * Hardened Webpack configuration to resolve production build blockers.
   * 1. Polyfills process.version for Edge Runtime compatibility (Supabase/OTel).
   * 2. Ignores the missing Jaeger exporter which Genkit/OTel traces by default.
   */
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.version': JSON.stringify('v18.0.0'),
        })
      );
    }

    // Solve "Module not found: Can't resolve '@opentelemetry/exporter-jaeger'"
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };

    return config;
  },
};

export default nextConfig;
