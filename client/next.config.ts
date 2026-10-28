import type { NextConfig } from "next";

// Las imágenes de las actividades las sirve el backend en /uploads
const backend = new URL(process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000/api");

const nextConfig: NextConfig = {
  images: {
    // En local el backend está en localhost; Next 16 bloquea esas direcciones si no se permite
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: backend.protocol === "https:" ? "https" : "http",
        hostname: backend.hostname,
        port: backend.port,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
};

export default nextConfig;
