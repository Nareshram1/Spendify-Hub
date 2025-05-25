// next.config.mjs
import withPWA from '@serwist/next';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your other Next.js configurations go here
};

const withPWAConfig = withPWA({
  // cacheOnFrontEndNav: true, // REMOVE THIS LINE
  swDest: 'public/sw.js',
  swSrc: 'app/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // Any other valid Serwist/PWA configurations you might add later
})(nextConfig);

export default withPWAConfig;