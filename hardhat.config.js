require('babel-register')
require('babel-polyfill')

require('decentraland-contract-plugins/dist/src/mana/tasks/load-mana')
require('@nomiclabs/hardhat-truffle5')
require('solidity-coverage')
require('@nomiclabs/hardhat-etherscan')

require('dotenv').config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.5.15',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    deploy: {
      url: process.env.RPC_URL || 'http://some-rpc-url.org',
      timeout: 600000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
}
