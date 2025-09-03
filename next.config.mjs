/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
    domains: ["kfzgnrxnyxiuankcmyth.supabase.co"],
  },
};

export default nextConfig;