/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Increase body size limit for manual PDF uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}
export default nextConfig
