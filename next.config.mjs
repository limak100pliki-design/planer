/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    // Pomija blokowanie buildu przez niezgodności typów
    ignoreBuildErrors: true,
  },
  eslint: {
    // Pomija blokowanie buildu przez ostrzeżenia lintera
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
