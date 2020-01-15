module.exports = {
  skipFiles: ['mocks', 'utils/Migrations.sol'],
  providerOptions: {
      default_balance_ether: 1000000000,
      total_accounts: 20
  },
  mocha: {
    grep: "@skip-on-coverage",
    invert: true
  }
}
