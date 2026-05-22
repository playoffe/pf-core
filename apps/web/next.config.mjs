/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pickleball/ui', '@pickleball/db', '@pickleball/shared', '@pickleball/rating'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'supabase.co' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};

export default nextConfig;
