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
    // Ignore Jaeger exporter which is not installed and causes build failures in Genkit OTel
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
    };

    // Polyfill process.version for libraries that expect it (like @supabase/ssr in Edge Runtime)
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify('v20.0.0'),
      })
    );

    return config;
  },
};

export default nextConfig;