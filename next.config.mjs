/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["kfzgnrxnyxiuankcmyth.supabase.co"],
  },
  // Force server-side rendering for all pages
  output: 'standalone',
};

export default nextConfig;