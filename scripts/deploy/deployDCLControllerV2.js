import ethProvider from 'eth-provider'
import { web3 } from 'hardhat'

async function main() {
  let chain
  let mana
  let dclRegistry
  let feeCollector
  let owner

  switch (process.env.NETWORK) {
    case 'GOERLI':
      chain = 5
      mana = '0xe7fDae84ACaba2A5Ba817B6E6D8A2d415DBFEdbe'
      dclRegistry = '0x6b8da2752827cf926215b43bb8E46Fd7b9dDac35'
      feeCollector = '0xb919da06d5f81777B13Fc5CBd48635E19500Fbf5'
      owner = '0xb919da06d5f81777B13Fc5CBd48635E19500Fbf5'
      break
    case 'MAINNET':
      chain = 1
      mana = '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
      dclRegistry = '0x2a187453064356c898cae034eaed119e1663acb8'
      feeCollector = '0x9A6ebE7E2a7722F8200d0ffB63a1F6406A0d7dce'
      owner = '0x9A6ebE7E2a7722F8200d0ffB63a1F6406A0d7dce'
      break
    default:
      throw new Error('Invalid network')
  }

  const provider = ethProvider()

  provider.setChain(chain)

  web3.setProvider(provider)

  const DCLControllerV2 = artifacts.require('DCLControllerV2')

  await DCLControllerV2.new(mana, dclRegistry, feeCollector, owner)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
