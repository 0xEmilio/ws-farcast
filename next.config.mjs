/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Disable worker functionality
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      use: 'null-loader'
    });

    return config;
  },
};

export default nextConfig;
