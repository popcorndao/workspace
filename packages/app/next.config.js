const { join } = require('path');

require('../utils/src/envLoader');

const workspace = join(__dirname, '..');

module.exports = {
  target: 'serverless',
  distDir:"dist/apps/react-docs/.next",
  env: {
    RPC_URL: process.env.RPC_URL,
    CHAIN_ID: process.env.CHAIN_ID,
    ADDR_STAKING: process.env.ADDR_STAKING,
    ADDR_POP: process.env.ADDR_POP,
    ADDR_GRANT_REGISTRY: process.env.ADDR_GRANT_REGISTRY,
    ADDR_BENEFICIARY_REGISTRY: process.env.ADDR_BENEFICIARY_REGISTRY,
    ADDR_GRANT_ELECTION: process.env.ADDR_GRANT_ELECTION,
    ADDR_PRIVATE_SALE: process.env.ADDR_PRIVATE_SALE,
    ADDR_USDC: process.env.ADDR_USDC,
    ADDR_TREASURY: process.env.ADDR_TREASURY,
  },
  poweredByHeader: false,
  webpack: (config, options) => {
    /** Allows import modules from packages in workspace. */
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.(js|jsx|ts|tsx)$/,
          include: [workspace],
          exclude: /node_modules/,
          use: options.defaultLoaders.babel,
        },
      ],
    };

    return config;
  },
};