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
  webpack: (config, { isServer, webpack }) => {
    // 1. Ignore Jaeger exporter which causes build resolution errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };

    // 2. Polyfill process.version for Supabase/Edge compatibility
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify('v18.0.0'),
      })
    );

    return config;
  },
};

export default nextConfig;