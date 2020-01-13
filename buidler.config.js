require('babel-register')
require('babel-polyfill')

const { loadPluginFile } = require('@nomiclabs/buidler/plugins-testing')

loadPluginFile(
  require.resolve('decentraland-contract-plugins/dist/mana/tasks/load-mana')
)

usePlugin('@nomiclabs/buidler-truffle5')
usePlugin('solidity-coverage')

module.exports = {
  defaultNetwork: 'buidlerevm',
  solc: {
    version: '0.5.15',
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    soliditycoverage: {
      gas: 9000000,
      url: 'http://localhost:8555'
    }
  }
}
