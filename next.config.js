/** @type {import('next').NextConfig} */
// Fichier de configuration pour Next.js.
// Il vous permet de personnaliser le comportement de votre application Next.js.
const nextConfig = {
  // Le mode strict de React aide à identifier les problèmes potentiels dans l'application.
  reactStrictMode: true,
  // Active la minification SWC pour des builds plus rapides.
  swcMinify: true,
  typescript: {
    // Ignore les erreurs de build TypeScript. Utile en développement, mais à utiliser avec prudence.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore les erreurs ESLint pendant le build.
    ignoreDuringBuilds: true,
  },
  // Configure les domaines d'images autorisés pour le composant Next.js Image.
  // Cela améliore la sécurité et les performances.
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
};

module.exports = nextConfig;
