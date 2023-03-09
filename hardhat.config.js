require('babel-register')
require('babel-polyfill')

require('decentraland-contract-plugins/dist/src/mana/tasks/load-mana')
require('@nomiclabs/hardhat-truffle5')
require('solidity-coverage')

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
}
