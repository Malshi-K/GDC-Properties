/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["kfzgnrxnyxiuankcmyth.supabase.co"],
  },
  // Add this for better error messages in production
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;