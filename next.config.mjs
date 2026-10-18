/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Firebase App Hosting handles the serving of the standalone output efficiently.
  experimental: {
    // This allows Next.js 15 to handle standard Web APIs more effectively in server environments
  },
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
};

export default nextConfig;