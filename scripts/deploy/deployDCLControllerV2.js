import ethProvider from 'eth-provider'
import hre, { web3 } from 'hardhat'

async function main() {
  let chain
  let mana
  let dclRegistry
  let feeCollector

  switch (process.env.NETWORK) {
    case 'GOERLI':
      chain = 5
      mana = '0xe7fDae84ACaba2A5Ba817B6E6D8A2d415DBFEdbe'
      dclRegistry = '0x6b8da2752827cf926215b43bb8E46Fd7b9dDac35'
      feeCollector = '0xE3336140Edfe740a26F9f1912fD52891e6Dd8A35'
      break
    default:
      throw new Error('Invalid network')
  }

  const provider = ethProvider()

  provider.setChain(chain)

  web3.setProvider(provider)

  const DCLControllerV2 = artifacts.require('DCLControllerV2')

  await DCLControllerV2.new(mana, dclRegistry, feeCollector)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
