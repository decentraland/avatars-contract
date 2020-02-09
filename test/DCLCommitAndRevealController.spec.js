import { ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'
import { increaseTime, duration } from './helpers/increase'
import {
  ZERO_ADDRESS,
  PRICE,
  setupContracts,
  dclDomainHash,
  subdomain1,
  subdomain1LabelHash,
  subdomain1Hash,
  subdomain2
} from './helpers/setupContracts'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const DCLRegistrar = artifacts.require('FakeDCLRegistrar')
const DCLCommitAndRevealController = artifacts.require(
  'FakeDCLCommitAndRevealController'
)

const TIME_UNTIL_REVEAL = 60 // 60 seconds
const salt = web3.utils.randomHex(32)

describe('DCLCommitAndRevealController', function() {
  let creationParams

  // Accounts
  let accounts
  let deployer
  let user
  let anotherUser
  let userController
  let hacker
  let fromUser
  let fromHacker
  let fromDeployer

  // Contracts
  let manaContract
  let ensRegistryContract
  let dclRegistrarContract
  let dclControllerContract

  beforeEach(async () => {
    this.timeout(100000)

    // Create Listing environment
    accounts = await web3.eth.getAccounts()
    deployer = accounts[ADDRESS_INDEXES.deployer]
    user = accounts[ADDRESS_INDEXES.user]
    anotherUser = accounts[ADDRESS_INDEXES.anotherUser]
    hacker = accounts[ADDRESS_INDEXES.hacker]
    userController = accounts[Object.keys(ADDRESS_INDEXES).length]
    fromUser = { from: user }
    fromHacker = { from: hacker }
    fromDeployer = { from: deployer }

    creationParams = {
      ...fromDeployer,
      gasPrice: 21e9
    }

    const contracts = await setupContracts(
      accounts,
      creationParams,
      DCLRegistrar,
      DCLCommitAndRevealController
    )

    manaContract = contracts.manaContract
    ensRegistryContract = contracts.ensRegistryContract
    dclRegistrarContract = contracts.dclRegistrarContract
    dclControllerContract = contracts.dclControllerContract

    await dclRegistrarContract.migrationFinished()
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const contract = await DCLCommitAndRevealController.new(
        manaContract.address,
        dclRegistrarContract.address,
        creationParams
      )

      const acceptedToken = await contract.acceptedToken()
      expect(acceptedToken).to.be.equal(manaContract.address)

      const registrar = await contract.registrar()
      expect(registrar).to.be.equal(dclRegistrarContract.address)

      const price = await dclControllerContract.PRICE()
      expect(price).to.eq.BN(PRICE)

      const timeUntilReveal = await dclControllerContract.timeUntilReveal()
      expect(timeUntilReveal).to.eq.BN(TIME_UNTIL_REVEAL)
    })

    it('reverts if acceptedToken is not a contract', async function() {
      await assertRevert(
        DCLCommitAndRevealController.new(
          user,
          dclRegistrarContract.address,
          creationParams
        ),
        'Accepted token should be a contract'
      )
    })

    it('reverts if registrar is not a contract', async function() {
      await assertRevert(
        DCLCommitAndRevealController.new(
          manaContract.address,
          user,
          creationParams
        ),
        'Registrar should be a contract'
      )
    })
  })

  describe('getHash', function() {
    it('should get hash', async function() {
      const salt1 = web3.utils.randomHex(32)
      const salt2 = web3.utils.randomHex(32)

      let hash = await dclControllerContract.getHash(
        subdomain1,
        user,
        salt1,
        fromDeployer
      )

      let expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, deployer, subdomain1, user, salt1]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain1,
        anotherUser,
        salt1,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            deployer,
            subdomain1,
            anotherUser,
            salt1
          ]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain1,
        user,
        salt2,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, deployer, subdomain1, user, salt2]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain2,
        user,
        salt1,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, deployer, subdomain2, user, salt1]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain2,
        user,
        salt1,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, deployer, subdomain2, user, salt1]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain2,
        anotherUser,
        salt1,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            deployer,
            subdomain2,
            anotherUser,
            salt1
          ]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain2,
        user,
        salt2,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, deployer, subdomain2, user, salt2]
        )
      )

      expect(hash).to.be.equal(expectedHash)

      hash = await dclControllerContract.getHash(
        subdomain2,
        anotherUser,
        salt2,
        fromDeployer
      )

      expectedHash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            deployer,
            subdomain2,
            anotherUser,
            salt2
          ]
        )
      )

      expect(hash).to.be.equal(expectedHash)
    })
  })

  describe('commitName', function() {
    it('should commit a name', async function() {
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )

      const { logs } = await dclControllerContract.commitName(hash, fromUser)
      expect(logs.length).to.be.equal(1)

      const log = logs[0]
      expect(log.event).to.be.equal('CommittedName')
      expect(log.args._caller).to.be.equal(user)
      expect(log.args._hash).to.be.equal(hash)
    })

    it('should reverts when trying to commit the same hash before revealed', async function() {
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )

      await dclControllerContract.commitName(hash, fromUser)

      await assertRevert(
        dclControllerContract.commitName(hash, fromUser),
        'There is already a commit for the same hash'
      )
    })
  })

  describe('Register', function() {
    it('should register a name', async function() {
      const salt1 = web3.utils.randomHex(32)

      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt1]
        )
      )

      await dclControllerContract.commitName(hash, fromUser)

      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      const { logs } = await dclControllerContract.register(
        subdomain1,
        user,
        salt1,
        fromUser
      )

      expect(logs.length).to.be.equal(6)

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
      expect(nameRegisteredLog.args._labelHash).to.be.equal(subdomain1LabelHash)
      expect(nameRegisteredLog.args._subdomain).to.be.equal(subdomain1)

      const burnLog = logs[3]
      expect(burnLog.event).to.be.equal('Burn')
      expect(burnLog.args.burner).to.be.equal(dclControllerContract.address)
      expect(burnLog.args.value).to.eq.BN(PRICE)

      const revealedCommit = logs[4]
      expect(revealedCommit.event).to.be.equal('RevealedName')
      expect(revealedCommit.args._caller).to.be.equal(user)
      expect(revealedCommit.args._hash).to.be.equal(hash)

      const nameBoughtLog = logs[5]
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

      const currentResolver = await ensRegistryContract.resolver(subdomain1Hash)
      expect(currentResolver).to.be.equal(ZERO_ADDRESS)
    })

    it('should register a name with a-z', async function() {
      let name = 'qwertyuiopasdfg'
      let hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      let tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      let subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'hjklzxcvbnm'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 1)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'abc'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 2)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with A-Z', async function() {
      let name = 'QWERTYUIOPASDFG'
      let hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      let tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      let subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'HJKLZXCVBNM'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 1)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'ABC'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 2)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with 0-9', async function() {
      const name = '123456789'
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      const subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with a-A and 0-9', async function() {
      const name = '123456789aBcd'
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await dclControllerContract.register(name, user, salt, fromUser)
      const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      const subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should clean the commit after revealing it', async function() {
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      await dclControllerContract.register(subdomain1, user, salt, fromUser)

      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'The commit does not exist'
      )
    })

    it('reverts when trying to register a name with a not commited hash', async function() {
      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'The commit does not exist'
      )

      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )

      await dclControllerContract.commitName(hash, fromUser)

      const salt1 = web3.utils.randomHex(32)
      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt1, fromUser),
        'The commit does not exist'
      )
    })

    it('reverts when trying to register a name with a commit not ready to be revealed', async function() {
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )

      await dclControllerContract.commitName(hash, fromUser)

      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'The commit is not ready to be revealed'
      )
    })

    it('reverts when trying to register a name with an already commited hash', async function() {
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      await dclControllerContract.register(subdomain1, user, salt, fromUser)

      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'Subdomain already owned'
      )
    })

    it('reverts when the name has invalid characters', async function() {
      let name = 'the username'
      let hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = '_username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = 'úsername'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = '^"}username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = '👍username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = '€username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      name = '𐍈username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x2F
      name = ':username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x3A
      name = '/username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x40
      name = '@username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x5b
      name = '[username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x60
      name = '`username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x7B
      name = '{username'
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, name, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(name, user, salt, fromUser),
        'Invalid Character'
      )

      // Special characters
      // With ascii 0x1f (US)
      let tx = {
        from: user,
        to: dclControllerContract.address,
        data: `0xf34b95b30000000000000000000000000000000000000000000000000000000000000060000000000000000000000000${user.replace(
          '0x',
          ''
        )}${salt.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000031f60600000000000000000000000000000000000000000000000000000000000`
      }
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            user,
            web3.utils.hexToAscii('0x1f6060'),
            user,
            salt
          ]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x00 (NULL)
      tx = {
        from: user,
        to: dclControllerContract.address,
        data: `0xf34b95b30000000000000000000000000000000000000000000000000000000000000060000000000000000000000000${user.replace(
          '0x',
          ''
        )}${salt.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000030060600000000000000000000000000000000000000000000000000000000000`
      }
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            user,
            web3.utils.hexToAscii('0x006060'),
            user,
            salt
          ]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x08 (BACKSPACE)
      tx = {
        from: user,
        to: dclControllerContract.address,
        data: `0xf34b95b30000000000000000000000000000000000000000000000000000000000000060000000000000000000000000${user.replace(
          '0x',
          ''
        )}${salt.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000030860600000000000000000000000000000000000000000000000000000000000`
      }
      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [
            dclControllerContract.address,
            user,
            web3.utils.hexToAscii('0x086060'),
            user,
            salt
          ]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')
    })

    it('reverts when username is lower than 2 and greather than 15 bytes', async function() {
      const bigUsername = 'abignameregistry'
      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, bigUsername, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register(bigUsername, user, salt, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
      )
    })

    it('reverts when trying to register a name with a lenght < 3', async function() {
      let hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, '', user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register('', user, salt, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
      )

      hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, 'a', user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))
      await assertRevert(
        dclControllerContract.register('a', user, salt, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
      )
    })

    it('reverts when trying to register a name with no balance', async function() {
      const balance = await manaContract.balanceOf(user)
      await manaContract.burn(balance, fromUser)

      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'Insufficient funds'
      )
    })

    it('reverts when trying to register a name without approval', async function() {
      await manaContract.approve(dclControllerContract.address, 0, fromUser)

      const hash = web3.utils.soliditySha3(
        web3.eth.abi.encodeParameters(
          ['address', 'address', 'string', 'address', 'bytes32'],
          [dclControllerContract.address, user, subdomain1, user, salt]
        )
      )
      await dclControllerContract.commitName(hash, fromUser)
      await increaseTime(duration.seconds(TIME_UNTIL_REVEAL))

      await assertRevert(
        dclControllerContract.register(subdomain1, user, salt, fromUser),
        'The contract is not authorized to use the accepted token on sender behalf'
      )
    })
  })
})
