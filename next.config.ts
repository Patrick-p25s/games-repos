
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Framework et build */
  reactStrictMode: true,         // active le mode strict pour React
  swcMinify: true,               // minification SWC pour build plus rapide
  output: undefined,             // pas d'export statique, car Server Actions

  /* TypeScript & ESLint */
  typescript: {
    ignoreBuildErrors: true,     // ignore les erreurs de types à la build
  },
  eslint: {
    ignoreDuringBuilds: true,    // ignore linting à la build
  },

  /* Images distantes autorisées */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      }
    ],
  },

  /* Optionnel : redirections / rewrites si besoin */
  async rewrites() {
    return [
      {
        source: '/api/ai/:slug',
        destination: '/api/genkit/flows/:slug',
      },
      // This rewrite is needed to make Genkit flows work with Vercel
      {
        source: '/api/genkit/:slug*',
        destination: '/api/genkit/:slug*',
      },
    ];
  },
};

export default nextConfig;
