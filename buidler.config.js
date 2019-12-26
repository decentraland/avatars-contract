require('babel-register')
require('babel-polyfill')

const { loadPluginFile } = require('@nomiclabs/buidler/plugins-testing')

loadPluginFile(
  require.resolve('decentraland-contract-plugins/dist/mana/tasks/load-mana')
)

usePlugin('@nomiclabs/buidler-truffle5')

module.exports = {
  defaultNetwork: 'buidlerevm',
  solc: {
    version: '0.5.15'
  }
}
