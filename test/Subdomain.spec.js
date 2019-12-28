import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const IENSRegistry = artifacts.require('IENSRegistry')
const SubdomainENSRegistry = artifacts.require('SubdomainENSRegistry')
const FakeENSRegistryFactory = artifacts.require('FakeENSRegistryFactory')
const ENSBaseRegistrar = artifacts.require('ENSBaseRegistrar')
const ENSPublicResolver = artifacts.require('ENSPublicResolver')

describe('SubdomainENSRegistry', function() {
  this.timeout(100000)

  // globals
  const subdomain = 'nacho'
  const ZERO_32_BYTES =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

  const ethLabelHash = web3.utils.sha3('eth')
  const dclLabelHash = web3.utils.sha3('dcl')

  const ethTopdomainHash = web3.utils.sha3(
    web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes32'],
      [ZERO_32_BYTES, ethLabelHash]
    )
  )

  const dclDomainHash = web3.utils.sha3(
    web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes32'],
      [ethTopdomainHash, dclLabelHash]
    )
  )

  let creationParams

  // Accounts
  let accounts
  let deployer
  let user
  let owner
  let hacker
  let anotherUser
  let fromOwner
  let fromUser
  let fromHacker

  // Contracts
  let manaContract
  let ensRegistryContract
  let baseRegistrarContract
  let publicResolverContract
  let subdomainContract

  // function checkRegisterEvent(
  //   _log,
  //   _owner,
  //   _caller = owner,
  //   _username = username,
  //   _metadata = metadata
  // ) {
  //   expect(_log.event).to.be.equal('Register')
  //   expect(_log.args._owner).to.be.equal(_owner)
  //   expect(_log.args._username).to.be.equal(_username)
  //   expect(_log.args._metadata).to.be.equal(_metadata)
  //   expect(_log.args._caller).to.be.equal(_caller)
  // }

  beforeEach(async function() {
    // Create Listing environment
    accounts = await web3.eth.getAccounts()
    deployer = accounts[ADDRESS_INDEXES.deployer]
    user = accounts[ADDRESS_INDEXES.user]
    anotherUser = accounts[ADDRESS_INDEXES.anotherUser]
    hacker = accounts[ADDRESS_INDEXES.hacker]
    owner = accounts[Object.keys(ADDRESS_INDEXES).length]
    fromUser = { from: user }
    fromOwner = { from: owner }
    fromHacker = { from: hacker }

    const fromDeployer = { from: deployer }
    creationParams = {
      ...fromDeployer,
      gas: 6e6,
      gasPrice: 21e9
    }

    // Set up MANA Contract
    const mana = new Mana({ accounts, artifacts: global })
    await mana.deploy({ txParams: creationParams })
    manaContract = mana.getContract()

    // Set up ENS Registry
    const fakeENSRegistryFactory = await FakeENSRegistryFactory.new(
      creationParams
    )
    await fakeENSRegistryFactory.createENSRegistry()
    // Deploy code by bytecode
    const ensRegistryAddress = await fakeENSRegistryFactory.ensRegistryAddress(
      creationParams
    )
    ensRegistryContract = await IENSRegistry.at(ensRegistryAddress)

    // Deploy base registrar
    baseRegistrarContract = await ENSBaseRegistrar.new(
      ensRegistryAddress,
      ensRegistryAddress,
      ethTopdomainHash,
      Date.now() * 2, // to pass transnfer lock period
      creationParams
    )

    // Register eth top domain
    await ensRegistryContract.setSubnodeOwner(
      ZERO_32_BYTES,
      ethLabelHash,
      baseRegistrarContract.address,
      fromDeployer
    )

    // Add controller to base
    await baseRegistrarContract.addController(deployer, fromDeployer)
    // Register dcl
    await baseRegistrarContract.register(
      dclLabelHash,
      deployer,
      60 * 60 * 24 * 30,
      fromDeployer
    )
    // Deploy public resolver
    publicResolverContract = await ENSPublicResolver.new(
      ensRegistryAddress,
      creationParams
    )

    // Deploy dcl subdomain contract
    subdomainContract = await SubdomainENSRegistry.new(creationParams)

    subdomainContract.initialize(
      manaContract.address,
      ensRegistryContract.address,
      publicResolverContract.address,
      baseRegistrarContract.address,
      'eth',
      'dcl',
      owner
    )

    await mana.authorize(subdomainContract.address)
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const acceptedToken = await subdomainContract.acceptedToken()
      expect(acceptedToken).to.be.equal(manaContract.address)

      const ownerOfDCL = await ensRegistryContract.owner(dclDomainHash)
      expect(ownerOfDCL).to.be.equal(deployer)
    })
  })
})
