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
    // Use the webpack instance provided by Next.js to avoid 'require' errors in ESM
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@opentelemetry\/exporter-jaeger/,
      })
    );

    // Polyfill process.version for Supabase/Edge compatibility during build
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.version': JSON.stringify('v20.0.0'),
      })
    );

    return config;
  },
};

export default nextConfig;