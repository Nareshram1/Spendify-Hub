// app/sw.js
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

// This is where Serwist (the library next-pwa uses) gets its pre-cached assets.
// next-pwa automatically generates this list during the build.
// eslint-disable-next-line no-undef
const precacheManifest = self.__SW_MANIFEST;

const serwist = new Serwist({
  precacheEntries: precacheManifest,
  disableDevLogs: process.env.NODE_ENV === 'development',
  navigationPreload: true, // Enable navigation preloading for faster navigation
  runtimeCaching: defaultCache, // Use default caching strategies for routes
});

serwist.addEventListeners();