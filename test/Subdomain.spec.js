import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const IENSRegistry = artifacts.require('IENSRegistry')
const DCLRegistrar = artifacts.require('FakeDCLRegistrar')
const DCLController = artifacts.require('FakeDCLController')
const FakeENSRegistryFactory = artifacts.require('FakeENSRegistryFactory')
const ENSBaseRegistrar = artifacts.require('ENSBaseRegistrar')
const ENSPublicResolver = artifacts.require('ENSPublicResolver')

describe('DCL Names V2', function() {
  this.timeout(100000)

  // globals
  const TOP_DOMAIN = 'eth'
  const DOMAIN = 'dcl'
  const PRICE = new BN('100000000000000000000')
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const ZERO_32_BYTES =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

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

  const subdomain1 = 'nacho'
  const subdomain1LabelHash = web3.utils.sha3(subdomain1)
  const subdomain1Hash = web3.utils.sha3(
    web3.eth.abi.encodeParameters(
      ['bytes32', 'bytes32'],
      [dclDomainHash, subdomain1LabelHash]
    )
  )

  const subdomain2 = 'dani'
  const subdomain2LabelHash = web3.utils.sha3(subdomain2)
  // const subdomain1Hash = web3.utils.sha3(
  //   web3.eth.abi.encodeParameters(
  //     ['bytes32', 'bytes32'],
  //     [dclDomainHash, subdomain2LabelHash]
  //   )
  // )

  let creationParams

  // Accounts
  let accounts
  let deployer
  let user
  let userController
  let hacker
  let anotherUser
  let fromUserController
  let fromUser
  let fromHacker
  let fromAnotherUser
  let fromDeployer

  // Contracts
  let manaContract
  let ensRegistryContract
  let baseRegistrarContract
  let publicResolverContract
  let dclRegistrarContract
  let dclControllerContract

  beforeEach(async function() {
    // Create Listing environment
    accounts = await web3.eth.getAccounts()
    deployer = accounts[ADDRESS_INDEXES.deployer]
    user = accounts[ADDRESS_INDEXES.user]
    anotherUser = accounts[ADDRESS_INDEXES.anotherUser]
    hacker = accounts[ADDRESS_INDEXES.hacker]
    userController = accounts[Object.keys(ADDRESS_INDEXES).length]
    fromUser = { from: user }
    fromAnotherUser = { from: anotherUser }
    fromUserController = { from: userController }
    fromHacker = { from: hacker }
    fromDeployer = { from: deployer }

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
    dclRegistrarContract = await DCLRegistrar.new(
      ensRegistryContract.address,
      baseRegistrarContract.address,
      TOP_DOMAIN,
      DOMAIN,
      creationParams
    )

    // Deploy dcl controller contract
    dclControllerContract = await DCLController.new(
      manaContract.address,
      ensRegistryContract.address,
      dclRegistrarContract.address
    )

    await dclRegistrarContract.addController(dclControllerContract.address)

    // Transfer DCL domain
    await baseRegistrarContract.safeTransferFrom(
      deployer,
      dclRegistrarContract.address,
      dclLabelHash,
      fromDeployer
    )

    await mana.authorize(dclControllerContract.address)
  })

  describe('DCLRegistrar', function() {
    describe('Constructor', function() {
      it('should be depoyed with valid arguments', async function() {
        const registry = await dclRegistrarContract.registry()
        expect(registry).to.be.equal(ensRegistryContract.address)

        const base = await dclRegistrarContract.base()
        expect(base).to.be.equal(baseRegistrarContract.address)

        const topdomain = await dclRegistrarContract.topdomain()
        expect(topdomain).to.be.equal(TOP_DOMAIN)

        const domain = await dclRegistrarContract.domain()
        expect(domain).to.be.equal(DOMAIN)

        const topdomainHash = await dclRegistrarContract.topdomainNameHash()
        expect(topdomainHash).to.be.equal(ethTopdomainHash)

        const domainHash = await dclRegistrarContract.domainNameHash()
        expect(domainHash).to.be.equal(dclDomainHash)

        const userController = await dclRegistrarContract.owner()
        expect(userController).to.be.equal(deployer)

        const userControllerOfDCL = await ensRegistryContract.owner(
          dclDomainHash
        )
        expect(userControllerOfDCL).to.be.equal(dclRegistrarContract.address)
      })
    })

    describe('Register', function() {
      it('register a name by an authorized account', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          anotherUser,
          fromUserController
        )
      })

      it('reverts when trying to register a name by an unauthorized address', async function() {
        await assertRevert(
          dclRegistrarContract.register(subdomain1, user, fromHacker),
          'Only a controller can call this method'
        )
      })

      it('reverts when trying to register a name for a not owned domain', async function() {
        const contract = await DCLRegistrar.new(
          ensRegistryContract.address,
          baseRegistrarContract.address,
          TOP_DOMAIN,
          'dcl2',
          creationParams
        )

        await contract.addController(userController)
        await assertRevert(
          contract.register(subdomain1, user, fromUserController),
          'The contract doesn not own the domain'
        )
      })

      it('reverts when trying to register a name already used', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await assertRevert(
          dclControllerContract.register(subdomain1, user, fromUserController),
          'Subdomain already owned'
        )
      })
    })

    describe.skip('Migrate', function() {
      it('should migrate a name to a subdomain', async function() {
        const { receipt } = await dclRegistrarContract.migrateNames(
          [web3.utils.fromAscii(subdomain1 + Math.random())],
          [user]
        )
        console.log(receipt.gasUsed)
      })
    })

    describe('Transfer', function() {
      it('should transfer a name', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )
        const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
        let userControllerOfTokenId = await dclRegistrarContract.ownerOf(
          tokenId
        )
        expect(userControllerOfTokenId).to.be.equal(user)

        await dclRegistrarContract.transferFrom(
          user,
          anotherUser,
          tokenId,
          fromUser
        )

        userControllerOfTokenId = await dclRegistrarContract.ownerOf(tokenId)
        expect(userControllerOfTokenId).to.be.equal(anotherUser)

        const subdomain = await dclRegistrarContract.subdomains(tokenId)

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
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )
        const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
        let userControllerOfTokenId = await dclRegistrarContract.ownerOf(
          tokenId
        )
        expect(userControllerOfTokenId).to.be.equal(user)

        await dclRegistrarContract.safeTransferFrom(
          user,
          anotherUser,
          tokenId,
          fromUser
        )

        userControllerOfTokenId = await dclRegistrarContract.ownerOf(tokenId)
        expect(userControllerOfTokenId).to.be.equal(anotherUser)
      })

      it('should revert when transferring a not owned name', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )
        const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)

        await assertRevert(
          dclRegistrarContract.safeTransferFrom(
            user,
            anotherUser,
            tokenId,
            fromHacker
          ),
          ''
        )
      })
    })

    describe('reclaim', function() {
      it('should reclaim an owned name', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await dclRegistrarContract.reclaim(subdomain1LabelHash, user, fromUser)

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(user)
      })

      it('should reclaim a name by an operator', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await dclRegistrarContract.approve(
          anotherUser,
          subdomain1LabelHash,
          fromUser
        )

        await dclRegistrarContract.reclaim(
          subdomain1LabelHash,
          anotherUser,
          fromAnotherUser
        )

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(anotherUser)
      })

      it('should reclaim a name by an approval for all', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await dclRegistrarContract.setApprovalForAll(
          anotherUser,
          true,
          fromUser
        )

        await dclRegistrarContract.reclaim(
          subdomain1LabelHash,
          anotherUser,
          fromAnotherUser
        )

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(anotherUser)
      })

      it('should reclaim a name previously transferred', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await dclRegistrarContract.transferFrom(
          user,
          anotherUser,
          subdomain1LabelHash,
          fromUser
        )

        await dclRegistrarContract.reclaim(
          subdomain1LabelHash,
          anotherUser,
          fromAnotherUser
        )

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(anotherUser)
      })

      it('should assign ownership to an account other than the sender', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )
        await dclRegistrarContract.reclaim(
          subdomain1LabelHash,
          anotherUser,
          fromUser
        )

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(anotherUser)
      })

      it('reverts when trying to reclaim by an unauthorized user', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await assertRevert(
          dclRegistrarContract.reclaim(subdomain1LabelHash, hacker, fromHacker),
          'Only an authorized account can change the subdomain settings'
        )
      })

      it('reverts when trying to reclaim an non-exist name', async function() {
        await assertRevert(
          dclRegistrarContract.reclaim(subdomain1LabelHash, user, fromUser),
          'ERC721: operator query for nonexistent token'
        )
      })
    })

    describe('onERC721Received', function() {
      it('reverts when transferring a token to the registrar by an unauthorized account', async function() {
        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        await assertRevert(
          dclRegistrarContract.safeTransferFrom(
            user,
            dclRegistrarContract.address,
            subdomain1LabelHash,
            fromUser
          ),
          'Only base can send NFTs to this contract'
        )
      })
    })

    describe('available', function() {
      it('should return whether a name is available or not', async function() {
        let isAvailable = await dclRegistrarContract.available(
          subdomain1LabelHash
        )
        expect(isAvailable).to.be.equal(true)

        await dclRegistrarContract.addController(userController)
        await dclRegistrarContract.register(
          subdomain1,
          user,
          fromUserController
        )

        isAvailable = await dclRegistrarContract.available(subdomain1LabelHash)
        expect(isAvailable).to.be.equal(false)

        isAvailable = await dclRegistrarContract.available(subdomain2LabelHash)
        expect(isAvailable).to.be.equal(true)
      })
    })

    describe('reclaimDomain', function() {
      it('should reclaim a domain previously transferred to the registrar contract', async function() {
        const labelHash = web3.utils.sha3('dcl2')
        const hash = web3.utils.sha3(
          web3.eth.abi.encodeParameters(
            ['bytes32', 'bytes32'],
            [ethTopdomainHash, labelHash]
          )
        )

        let subdomainOwner = await ensRegistryContract.owner(hash)
        expect(subdomainOwner).to.be.equal(ZERO_ADDRESS)

        // Register dcl2
        await baseRegistrarContract.register(
          web3.utils.sha3('dcl2'),
          deployer,
          60 * 60 * 24 * 30,
          fromDeployer
        )

        subdomainOwner = await ensRegistryContract.owner(hash)
        expect(subdomainOwner).to.be.equal(deployer)

        // Transfer dcl2 domain to registrar
        await baseRegistrarContract.transferFrom(
          deployer,
          dclRegistrarContract.address,
          labelHash,
          fromDeployer
        )

        subdomainOwner = await ensRegistryContract.owner(hash)
        expect(subdomainOwner).to.be.equal(deployer)

        await dclRegistrarContract.reclaimDomain(labelHash, fromDeployer)

        subdomainOwner = await ensRegistryContract.owner(hash)
        expect(subdomainOwner).to.be.equal(dclRegistrarContract.address)
      })

      it('should allow to claim a domain already owned', async function() {
        await dclRegistrarContract.reclaimDomain(dclLabelHash, fromDeployer)
      })

      it('reverts when trying to reclaim a domain by an unauthorized user', async function() {
        await assertRevert(
          dclRegistrarContract.reclaimDomain(dclLabelHash, fromHacker),
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('transferDomainOwnership', function() {
      it.only('should transfer an owned domain', async function() {
        let domainOwner = await baseRegistrarContract.ownerOf(dclLabelHash)
        expect(domainOwner).to.be.equal(dclRegistrarContract.address)

        let subdomainOwner = await ensRegistryContract.owner(dclDomainHash)
        expect(subdomainOwner).to.be.equal(dclRegistrarContract.address)

        const { logs } = await dclRegistrarContract.transferDomainOwnership(
          user,
          dclLabelHash,
          fromDeployer
        )

        expect(logs.length).to.be.equal(2)
        expect(logs[0].event).to.be.equal('Transfer')
        expect(logs[0].args.from).to.be.equal(dclRegistrarContract.address)
        expect(logs[0].args.to).to.be.equal(user)
        // expect(logs[0].args.tokenId).to.eq.BN(dclLabelHash)

        expect(logs[1].event).to.be.equal('DomainTransferred')
        expect(logs[1].args._newOwner).to.be.equal(user)
        expect(logs[1].args._tokenId).to.be.equal(dclLabelHash)

        domainOwner = await baseRegistrarContract.ownerOf(dclLabelHash)
        expect(domainOwner).to.be.equal(user)

        subdomainOwner = await ensRegistryContract.owner(dclDomainHash)
        expect(subdomainOwner).to.be.equal(dclRegistrarContract.address)

        await baseRegistrarContract.reclaim(dclLabelHash, user, fromUser)

        domainOwner = await baseRegistrarContract.ownerOf(dclLabelHash)
        expect(domainOwner).to.be.equal(user)

        subdomainOwner = await ensRegistryContract.owner(dclDomainHash)
        expect(subdomainOwner).to.be.equal(user)
      })

      it('reverts when transferring a not owned domain', async function() {
        await assertRevert(
          dclRegistrarContract.transferDomainOwnership(
            user,
            web3.utils.sha3('dcl2'),
            fromDeployer
          )
        )
      })

      it('reverts when transferring a domain by an unauthorized user', async function() {
        await assertRevert(
          dclRegistrarContract.transferDomainOwnership(
            user,
            dclLabelHash,
            fromHacker
          ),
          'Ownable: caller is not the owner'
        )
      })
    })

    describe('Controllers', function() {
      it('should add a controller', async function() {
        let isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(false)

        const { logs } = await dclRegistrarContract.addController(
          user,
          fromDeployer
        )

        expect(logs.length).to.be.equal(1)
        expect(logs[0].event).to.be.equal('ControllerAdded')
        expect(logs[0].args._controller).to.be.equal(user)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(true)

        await dclRegistrarContract.removeController(user, fromDeployer)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(false)

        await dclRegistrarContract.addController(user, fromDeployer)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(true)
      })

      it('reverts when trying to add a controller by an unauthorized user', async function() {
        await assertRevert(
          dclRegistrarContract.addController(user, fromHacker),
          'Ownable: caller is not the owner'
        )
      })

      it('reverts when trying to add a controller already added', async function() {
        await dclRegistrarContract.addController(user, fromDeployer)

        await assertRevert(
          dclRegistrarContract.addController(user, fromDeployer),
          'The controller was already added'
        )
      })

      it('should remove a controller', async function() {
        let isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(false)

        await dclRegistrarContract.addController(user, fromDeployer)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(true)

        const { logs } = await dclRegistrarContract.removeController(
          user,
          fromDeployer
        )

        expect(logs.length).to.be.equal(1)
        expect(logs[0].event).to.be.equal('ControllerRemoved')
        expect(logs[0].args._controller).to.be.equal(user)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(false)

        await dclRegistrarContract.addController(user, fromDeployer)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(true)

        await dclRegistrarContract.removeController(user, fromDeployer)

        isController = await dclRegistrarContract.controllers(user)
        expect(isController).to.be.equal(false)
      })

      it('reverts when trying to remove a controller by an unauthorized user', async function() {
        await dclRegistrarContract.addController(user, fromDeployer)

        await assertRevert(
          dclRegistrarContract.removeController(user, fromHacker),
          'Ownable: caller is not the owner'
        )
      })

      it('reverts when trying to remove a controller already removed or unexistant', async function() {
        await assertRevert(
          dclRegistrarContract.removeController(user, fromDeployer),
          'The controller is already disbled'
        )

        await dclRegistrarContract.addController(user, fromDeployer)
        await dclRegistrarContract.removeController(user, fromDeployer)

        await assertRevert(
          dclRegistrarContract.removeController(user, fromDeployer),
          'The controller is already disbled'
        )
      })
    })
  })

  describe('DCLController', function() {
    describe('Constructor', function() {
      it('should be depoyed with valid arguments', async function() {
        const contract = await DCLController.new(
          manaContract.address,
          ensRegistryContract.address,
          dclRegistrarContract.address,
          creationParams
        )

        const acceptedToken = await contract.acceptedToken()
        expect(acceptedToken).to.be.equal(manaContract.address)

        const registry = await contract.registry()
        expect(registry).to.be.equal(ensRegistryContract.address)

        const registrar = await contract.registrar()
        expect(registrar).to.be.equal(dclRegistrarContract.address)
      })
    })

    describe('Register', function() {
      it('should register a name', async function() {
        const { logs } = await dclControllerContract.register(
          subdomain1,
          user,
          fromUser
        )

        expect(logs.length).to.be.equal(5)

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

        const nameRegisteredLog = logs[2]
        expect(nameRegisteredLog.event).to.be.equal('NameRegistered')
        expect(nameRegisteredLog.args._caller).to.be.equal(
          dclControllerContract.address
        )
        expect(nameRegisteredLog.args._beneficiary).to.be.equal(user)
        expect(nameRegisteredLog.args._labelHash).to.be.equal(
          subdomain1LabelHash
        )
        expect(nameRegisteredLog.args._subdomain).to.be.equal(subdomain1)

        const burnLog = logs[3]
        expect(burnLog.event).to.be.equal('Burn')
        expect(burnLog.args.burner).to.be.equal(dclControllerContract.address)
        expect(burnLog.args.value).to.eq.BN(PRICE)

        const nameBoughtLog = logs[4]
        expect(nameBoughtLog.event).to.be.equal('NameBought')
        expect(nameBoughtLog.args._caller).to.be.equal(user)
        expect(nameBoughtLog.args._beneficiary).to.be.equal(user)
        expect(nameBoughtLog.args._price).to.eq.BN(PRICE)
        expect(nameBoughtLog.args._name).to.be.equal(subdomain1)

        const balanceOfUser = await dclRegistrarContract.balanceOf(user)
        expect(balanceOfUser).to.eq.BN(1)

        const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
        const subdomain = await dclRegistrarContract.subdomains(tokenId)

        expect(subdomain).to.be.equal(subdomain1)

        const subdomainOwner = await ensRegistryContract.owner(subdomain1Hash)
        expect(subdomainOwner).to.be.equal(user)

        const currentResolver = await ensRegistryContract.resolver(
          subdomain1Hash
        )
        expect(currentResolver).to.be.equal(ZERO_ADDRESS)
      })

      it('reverts when the name has blanks', async function() {
        const usernameWithBlanks = 'the username'

        await assertRevert(
          dclControllerContract.register(usernameWithBlanks, user, fromUser),
          'Invalid Character'
        )
      })

      it('reverts when username is greather than 15 bytes', async function() {
        const validUsername = 'the_username_is'
        await dclControllerContract.register(validUsername, user, fromUser)

        const bigUsername = 'this_username_is'
        await assertRevert(
          dclControllerContract.register(bigUsername, user, fromUser),
          'Name should be less than or equal 15 characters'
        )
      })

      it.skip('reverts when the username has invalid character', async function() {
        // With ascii 0x1f (US)
        let tx = {
          from: userController,
          to: dclControllerContract.address,
          data: `0x1e59c529000000000000000000000000${user.replace(
            '0x',
            ''
          )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000601f`
        }

        await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

        // With ascii 0x00 (NULL)
        tx = {
          from: userController,
          to: dclControllerContract.address,
          data: `0x1e59c529000000000000000000000000${user.replace(
            '0x',
            ''
          )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000`
        }

        await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

        // With ascii 0x08 (BACKSPACE)
        tx = {
          from: userController,
          to: dclControllerContract.address,
          data: `0x1e59c529000000000000000000000000${user.replace(
            '0x',
            ''
          )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000008`
        }

        await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

        await assertRevert(
          dclControllerContract.register('spEC()#$cial name', user, fromUser),
          'Invalid Character'
        )
      })

      it('reverts when trying to register a name with no balance', async function() {
        const balance = await manaContract.balanceOf(user)
        await manaContract.burn(balance, fromUser)
        await assertRevert(
          dclControllerContract.register(subdomain1, user, fromUser),
          'Insufficient funds'
        )
      })

      it('reverts when trying to register a name without approval', async function() {
        await manaContract.approve(dclControllerContract.address, 0, fromUser)
        await assertRevert(
          dclControllerContract.register(subdomain1, user, fromUser),
          'The contract is not authorized to use the accepted token on sender behalf'
        )
      })
    })
  })
})
