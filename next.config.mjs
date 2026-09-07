/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://aqclqqphhxvloinkgfgz.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_AOIff5SRRiBBvD5ieSnLKw_qAsVmINl",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
