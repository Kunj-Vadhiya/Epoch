/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'assets.example.com'],
  },
  async rewrites() {
    return [
      // Proxy all /api/v1 calls to the backend on port 8000 (Prevents browser CORS issues)
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      // Backward-compatible aliases
      {
        source: '/analyze-audio',
        destination: `${BACKEND_URL}/analyze-audio`,
      },
      {
        source: '/analyze-video',
        destination: `${BACKEND_URL}/analyze-video`,
      },
    ];
  },
};

export default nextConfig;
