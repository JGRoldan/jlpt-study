import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	experimental: {
		optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals = [...(config.externals || []), 'edge-tts']
		}
		return config
	},
}

export default nextConfig
