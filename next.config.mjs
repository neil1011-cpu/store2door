/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase App Hosting requires standalone output for optimal deployment.
  output: 'standalone',
  // Ensure that external packages used by Genkit or Supabase are correctly handled.
  serverExternalPackages: ['@aws-sdk/client-s3', 'firebase-admin'],
};

export default nextConfig;