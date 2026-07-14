import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Whitelist UploadThing CDN hosts so `next/image` can optimize
   * profile pictures, scholarship images, and university logos
   * served from any of UploadThing's serving domains.
   *
   * - `utfs.io`        - legacy/global UploadThing file server.
   * - `*.ufs.sh`       - per-app subdomain (current default, e.g.
   *                      `<APP_ID>.ufs.sh`).
   * - `*.ut.app`       - alternate per-app subdomain.
   *
   * Validates: Requirement 26.5 (rendering uploaded images via
   * `next/image`).
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "https", hostname: "**.ufs.sh", pathname: "/**" },
      { protocol: "https", hostname: "**.ut.app", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
};

export default nextConfig;
