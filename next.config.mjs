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
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Resolve Genkit/OpenTelemetry resolution errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };
    
    // Polyfill process.version for Supabase/SSR in Edge Runtime
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify(process.version),
      })
    );

    return config;
  },
};

export default nextConfig;