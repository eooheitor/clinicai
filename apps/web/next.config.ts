import type { NextConfig } from "next";
import path from "path";
import { config as dotenv } from "dotenv";

// Carrega o .env único da raiz do monorepo antes de qualquer processamento do Next.js
dotenv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
