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
    // Fix for Jaeger/OpenTelemetry resolution errors in strict environments
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };

    // Polyfill process.version for compatibility with libraries like @supabase/ssr in Edge Runtime
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify(process.version),
      })
    );

    return config;
  },
};

export default nextConfig;
