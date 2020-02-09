import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'

const FakeENSRegistryFactory = artifacts.require('FakeENSRegistryFactory')
const ENSRegistry = artifacts.require('ENSRegistryWithFallback')
const ENSBaseRegistrar = artifacts.require('BaseRegistrarImplementation')
const ENSPublicResolver = artifacts.require('ENSPublicResolver')
const DCLRegistrarContract = artifacts.require('FakeDCLRegistrar')
const DCLStandardController = artifacts.require('FakeDCLStandardController')

const BN = web3.utils.BN

export const BASE_URI = 'https://decentraland-api.com/v1/'
export const TOP_DOMAIN = 'eth'
export const DOMAIN = 'dcl'
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_32_BYTES =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export const ethLabelHash = web3.utils.sha3(TOP_DOMAIN)
export const dclLabelHash = web3.utils.sha3(DOMAIN)

export const ethTopdomainHash = web3.utils.sha3(
  web3.eth.abi.encodeParameters(
    ['bytes32', 'bytes32'],
    [ZERO_32_BYTES, ethLabelHash]
  )
)

export const dclDomainHash = web3.utils.sha3(
  web3.eth.abi.encodeParameters(
    ['bytes32', 'bytes32'],
    [ethTopdomainHash, dclLabelHash]
  )
)

export const subdomain1 = 'nacho'
export const subdomain1WithLocale = 'Nacho'
export const subdomain1LabelHash = web3.utils.sha3(subdomain1)
export const subdomain1Hash = web3.utils.sha3(
  web3.eth.abi.encodeParameters(
    ['bytes32', 'bytes32'],
    [dclDomainHash, subdomain1LabelHash]
  )
)

export const subdomain2 = 'dani'
export const subdomain2LabelHash = web3.utils.sha3(subdomain2)

export const PRICE = new BN('100000000000000000000')

export async function setupContracts(
  accounts,
  creationParams,
  DCLRegistrar = DCLRegistrarContract,
  DCLController = DCLStandardController
) {
  // Set up MANA Contract
  const mana = new Mana({ accounts, artifacts: global })
  await mana.deploy({ txParams: creationParams })
  const manaContract = mana.getContract()

  // Set up ENS Registry
  const fakeENSRegistryFactory = await FakeENSRegistryFactory.new(
    creationParams
  )
  await fakeENSRegistryFactory.createENSRegistry()
  // Deploy code by bytecode
  const ensRegistryAddress = await fakeENSRegistryFactory.ensRegistryAddress(
    creationParams
  )

  // Set up ENS Registry
  const ensRegistryContract = await ENSRegistry.new(
    ensRegistryAddress,
    creationParams
  )

  // Deploy base registrar
  const baseRegistrarContract = await ENSBaseRegistrar.new(
    ensRegistryContract.address,
    ethTopdomainHash,
    creationParams
  )

  // Register eth top domain
  await ensRegistryContract.setSubnodeOwner(
    ZERO_32_BYTES,
    ethLabelHash,
    baseRegistrarContract.address,
    creationParams
  )

  // Add dummy controller to base
  await baseRegistrarContract.addController(creationParams.from, creationParams)
  // Register dcl
  await baseRegistrarContract.register(
    dclLabelHash,
    creationParams.from,
    60 * 60 * 24 * 30,
    creationParams
  )
  // Deploy public resolver
  const publicResolverContract = await ENSPublicResolver.new(
    ensRegistryContract.address,
    creationParams
  )

  // Deploy dcl subdomain contract
  const dclRegistrarContract = await DCLRegistrar.new(
    ensRegistryContract.address,
    baseRegistrarContract.address,
    TOP_DOMAIN,
    DOMAIN,
    BASE_URI,
    creationParams
  )

  // Deploy dcl controller contract
  const dclControllerContract = await DCLController.new(
    manaContract.address,
    dclRegistrarContract.address,
    creationParams
  )

  await dclRegistrarContract.addController(dclControllerContract.address)

  // Transfer DCL domain
  await baseRegistrarContract.safeTransferFrom(
    creationParams.from,
    dclRegistrarContract.address,
    dclLabelHash,
    creationParams
  )

  await mana.authorize(dclControllerContract.address)

  return {
    manaContract,
    ensRegistryContract,
    baseRegistrarContract,
    publicResolverContract,
    dclRegistrarContract,
    dclControllerContract
  }
}
