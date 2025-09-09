/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["kfzgnrxnyxiuankcmyth.supabase.co"],
  },
  // Completely disable static optimization
  experimental: {
    forceSwcTransforms: true,
  },
  // Force all pages to be server-rendered
  async rewrites() {
    return []
  }
};

export default nextConfig;