/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.wieldcd.net' },
      { protocol: 'https', hostname: '**.vibechain.com' },
      { protocol: 'https', hostname: '**.ipfs.dweb.link' },
      { protocol: 'https', hostname: '**.ipfs.io' }
    ]
  }
};
export default nextConfig;
