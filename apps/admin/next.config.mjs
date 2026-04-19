/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@content-assist/shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
