/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Konva's Node.js entry (index-node.js) tries to require the 'canvas'
    // npm package for server-side rendering support. We only use Konva in
    // the browser (via dynamic import with ssr:false), so we tell webpack
    // to treat 'canvas' as an empty external on both server and client.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      { canvas: 'canvas' },
    ];
    return config;
  },
};

module.exports = nextConfig;
