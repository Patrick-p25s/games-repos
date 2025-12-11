
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Framework et build */
  reactStrictMode: true,         // Active le mode strict pour React
  swcMinify: true,               // Active la minification SWC pour des builds plus rapides
  output: undefined,             // Pas d'export statique, car nous utilisons des Server Actions

  /* TypeScript & ESLint */
  typescript: {
    ignoreBuildErrors: true,     // Ignore les erreurs de types TypeScript lors de la construction
  },
  eslint: {
    ignoreDuringBuilds: true,    // Ignore les erreurs ESLint lors de la construction
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
  
  // Redirections pour les API Genkit
  async rewrites() {
    return [
      {
        source: '/api/genkit/:slug*',
        destination: '/api/genkit/:slug*',
      },
    ];
  },

};

export default nextConfig;
