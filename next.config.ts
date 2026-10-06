import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/plans', destination: '/', permanent: false }];
  },
  transpilePackages: ['three'],
  eslint: {
    ignoreDuringBuilds: true,
  },
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
      },
    ],
  },
  // This is required to allow the Next.js dev server to be accessed from
  // the Cloud Workstation preview.
  allowedDevOrigins: [
    "https://6000-firebase-fluxopro100-1763604405911.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
  ],
};

export default nextConfig;
