/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // 1. Ignore Jaeger exporter which is an optional OTel dependency causing build failures
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };

    // 2. Polyfill process.version for libraries (like Supabase) in the Edge Runtime
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify('v20.0.0'),
      })
    );

    return config;
  },
};

export default nextConfig;
