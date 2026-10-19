/** @type {import('next').NextConfig} */
const isCloudflare = Boolean(process.env.CF_PAGES || process.env.OUTPUT_EXPORT);

const nextConfig = {
  output: isCloudflare ? 'export' : 'standalone',
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
