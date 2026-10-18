/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist has an optional Node-only `canvas` dependency; the browser build never needs it.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
