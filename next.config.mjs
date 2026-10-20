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
  // Ensure the app can build even if OpenTelemetry Jaeger is not found
  webpack: (config, { webpack, isServer }) => {
    if (config.plugins) {
      // 1. Ignore Jaeger exporter which is a common Genkit build blocker
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@opentelemetry\/exporter-jaeger$/,
        })
      );

      // 2. Polyfill process.version for compatibility in Edge/Middleware environments
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.version': JSON.stringify('v20.0.0'),
        })
      );
    }

    return config;
  },
};

export default nextConfig;