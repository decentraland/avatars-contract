import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const IENSRegistry = artifacts.require('IENSRegistry')
const SubdomainENSRegistry = artifacts.require('FakeSubdomainENSRegistry')
const FakeENSRegistryFactory = artifacts.require('FakeENSRegistryFactory')
const ENSBaseRegistrar = artifacts.require('ENSBaseRegistrar')
const ENSPublicResolver = artifacts.require('ENSPublicResolver')

describe('SubdomainENSRegistry', function() {
  this.timeout(100000)

  // globals
  const TOP_DOMAIN = 'eth'
  const DOMAIN = 'dcl'
  const PRICE = new BN('100000000000000000000')
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const ZERO_32_BYTES =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const subdomain1 = 'nacho'
  const subdomain1LabelHash = web3.utils.sha3(subdomain1)

  const ethLabelHash = web3.utils.sha3(TOP_DOMAIN)
  const dclLabelHash = web3.utils.sha3(DOMAIN)

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
    await subdomainContract.initialize(
      manaContract.address,
      ensRegistryContract.address,
      publicResolverContract.address,
      baseRegistrarContract.address,
      TOP_DOMAIN,
      DOMAIN,
      deployer
    )

    // Transfer DCL domain
    await baseRegistrarContract.safeTransferFrom(
      deployer,
      subdomainContract.address,
      dclLabelHash,
      fromDeployer
    )

    await mana.authorize(subdomainContract.address)
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const acceptedToken = await subdomainContract.acceptedToken()
      expect(acceptedToken).to.be.equal(manaContract.address)

      const registry = await subdomainContract.registry()
      expect(registry).to.be.equal(ensRegistryContract.address)

      const resolver = await subdomainContract.resolver()
      expect(resolver).to.be.equal(publicResolverContract.address)

      const base = await subdomainContract.base()
      expect(base).to.be.equal(baseRegistrarContract.address)

      const topdomain = await subdomainContract.topdomain()
      expect(topdomain).to.be.equal(TOP_DOMAIN)

      const domain = await subdomainContract.domain()
      expect(domain).to.be.equal(DOMAIN)

      const topdomainHash = await subdomainContract.topdomainNamehash()
      expect(topdomainHash).to.be.equal(ethTopdomainHash)

      const domainHash = await subdomainContract.domainNamehash()
      expect(domainHash).to.be.equal(dclDomainHash)

      const owner = await subdomainContract.owner()
      expect(owner).to.be.equal(deployer)

      const ownerOfDCL = await ensRegistryContract.owner(dclDomainHash)
      expect(ownerOfDCL).to.be.equal(subdomainContract.address)
    })
  })

  describe('Migrate', function() {
    it('should migrate a name to a subdomain', async function() {
      const { receipt } = await subdomainContract.migrateNames(
        [web3.utils.fromAscii(subdomain1 + Math.random())],
        [user]
      )
      console.log(receipt.gasUsed)
    })
  })

  describe('Register', function() {
    it('should register a name', async function() {
      const { logs } = await subdomainContract.register(
        subdomain1,
        user,
        fromUser
      )
      expect(logs.length).to.be.equal(4)

      const newOwnerLog = logs[0]
      expect(newOwnerLog.event).to.be.equal('NewOwner')
      expect(newOwnerLog.args.node).to.be.equal(dclDomainHash)
      expect(newOwnerLog.args.label).to.be.equal(subdomain1LabelHash)
      expect(newOwnerLog.args.owner).to.be.equal(user)

      const transferLog = logs[1]
      expect(transferLog.event).to.be.equal('Transfer')
      expect(transferLog.args.from).to.be.equal(ZERO_ADDRESS)
      expect(transferLog.args.to).to.be.equal(user)
      expect(transferLog.args.tokenId).to.eq.BN(
        web3.utils.toBN(subdomain1LabelHash)
      )

      const burnLog = logs[2]
      expect(burnLog.event).to.be.equal('Burn')
      expect(burnLog.args.burner).to.be.equal(subdomainContract.address)
      expect(burnLog.args.value).to.eq.BN(PRICE)

      const subdomainCreatedLog = logs[3]
      expect(subdomainCreatedLog.event).to.be.equal('SubdomainCreated')
      expect(subdomainCreatedLog.args._caller).to.be.equal(user)
      expect(subdomainCreatedLog.args._beneficiary).to.be.equal(user)
      expect(subdomainCreatedLog.args._subdomain).to.be.equal(subdomain1)

      const balanceOfUser = await subdomainContract.balanceOf(user)
      expect(balanceOfUser).to.eq.BN(1)

      const tokenId = await subdomainContract.tokenOfOwnerByIndex(user, 0)
      const subdomain = await subdomainContract.subdomains(tokenId)

      expect(subdomain).to.be.equal(subdomain1)

      const subdomainHash = web3.utils.sha3(
        web3.eth.abi.encodeParameters(
          ['bytes32', 'bytes32'],
          [dclDomainHash, subdomain1LabelHash]
        )
      )

      const subdomainOwner = await ensRegistryContract.owner(subdomainHash)
      expect(subdomainOwner).to.be.equal(user)

      const currentResolver = await ensRegistryContract.resolver(subdomainHash)
      expect(currentResolver).to.be.equal(ZERO_ADDRESS)
    })

    it('should register a name with special characters', async function() {
      await subdomainContract.register('spEC()#$cial name', user, fromUser)
    })

    it('reverts when trying to register a name already used', async function() {
      await subdomainContract.register(subdomain1, user)
      await assertRevert(
        subdomainContract.register(subdomain1, user),
        'sub domain already owned'
      )
    })

    it('reverts when trying to register a name with no balance', async function() {
      const balance = await manaContract.balanceOf(user)
      await manaContract.burn(balance, fromUser)
      await assertRevert(
        subdomainContract.register(subdomain1, user, fromUser),
        'Insufficient funds'
      )
    })

    it('reverts when trying to register a name without approval', async function() {
      await manaContract.approve(subdomainContract.address, 0, fromUser)
      await assertRevert(
        subdomainContract.register(subdomain1, user, fromUser),
        'The contract is not authorized to use the accepted token on sender behalf'
      )
    })

    it('reverts when trying to register a name for a not owned domain', async function() {
      const contract = await SubdomainENSRegistry.new(creationParams)
      await contract.initialize(
        manaContract.address,
        ensRegistryContract.address,
        publicResolverContract.address,
        baseRegistrarContract.address,
        TOP_DOMAIN,
        'dcl2',
        deployer
      )

      await manaContract.approve(contract.address, -1, fromUser)

      await assertRevert(
        contract.register(subdomain1, user, fromUser),
        'this contract should own the domain'
      )
    })
  })

  describe('Transfer', function() {
    it('should transfer a name', async function() {
      await subdomainContract.register(subdomain1, user, fromUser)
      const tokenId = await subdomainContract.tokenOfOwnerByIndex(user, 0)
      let ownerOfTokenId = await subdomainContract.ownerOf(tokenId)
      expect(ownerOfTokenId).to.be.equal(user)

      await subdomainContract.transferFrom(user, anotherUser, tokenId, fromUser)

      ownerOfTokenId = await subdomainContract.ownerOf(tokenId)
      expect(ownerOfTokenId).to.be.equal(anotherUser)

      const subdomain = await subdomainContract.subdomains(tokenId)

      expect(subdomain).to.be.equal(subdomain1)

      const subdomainHash = web3.utils.sha3(
        web3.eth.abi.encodeParameters(
          ['bytes32', 'bytes32'],
          [dclDomainHash, subdomain1LabelHash]
        )
      )

      const subdomainOwner = await ensRegistryContract.owner(subdomainHash)
      expect(subdomainOwner).to.be.equal(user)
    })

    it('should safe transfer a name', async function() {
      await subdomainContract.register(subdomain1, user)
      const tokenId = await subdomainContract.tokenOfOwnerByIndex(user, 0)
      let ownerOfTokenId = await subdomainContract.ownerOf(tokenId)
      expect(ownerOfTokenId).to.be.equal(user)

      await subdomainContract.safeTransferFrom(
        user,
        anotherUser,
        tokenId,
        fromUser
      )

      ownerOfTokenId = await subdomainContract.ownerOf(tokenId)
      expect(ownerOfTokenId).to.be.equal(anotherUser)
    })

    it('should revert when transferring a not owned name', async function() {
      await subdomainContract.register(subdomain1, user), fromUser
      const tokenId = await subdomainContract.tokenOfOwnerByIndex(user, 0)

      await assertRevert(
        subdomainContract.safeTransferFrom(
          user,
          anotherUser,
          tokenId,
          fromHacker
        ),
        ''
      )
    })
  })
})
