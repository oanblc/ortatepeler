import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Varsayılan Server Action gövde sınırı 1 MB — saha fotoğrafları/fişler bunu aşıp
  // kaydın sessizce başarısız olmasına yol açıyordu.
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
