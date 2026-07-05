import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

const engineRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  turbopack: { root: engineRoot },
}

export default nextConfig
