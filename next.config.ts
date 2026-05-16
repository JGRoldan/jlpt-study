import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals = [...(config.externals || []), 'edge-tts']
		}
		return config
	},
}

export default nextConfig
