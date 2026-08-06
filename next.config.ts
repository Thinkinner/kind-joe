/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/featuredvideo.mp4",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/kindjoe-hero.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/topstories",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ventura/articles",
        destination: "/ventura-county",
        permanent: true,
      },
      {
        source: "/terms-of-use",
        destination: "/terms-of-service",
        permanent: true,
      },
      {
        source: "/articles/:slug",
        destination: "/:slug",
        permanent: true,
      },
      {
        source: "/ventura/promote",
        destination: "/ventura-promote",
        permanent: true,
      },
      {
        source: "/ventura/:slug((?!posts$|articles$).*)",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos", // optional — if you also use Picsum
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.kindjoe.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "kindjoe.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**", // safer pattern
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.cdn.filesafe.space",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
