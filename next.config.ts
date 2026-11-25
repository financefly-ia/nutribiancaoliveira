import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { '*': ['./mockups/**/*', './docs/**/*'] },
}

export default nextConfig
