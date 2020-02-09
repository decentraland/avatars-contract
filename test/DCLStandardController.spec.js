import { ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'
import {
  ZERO_ADDRESS,
  PRICE,
  setupContracts,
  dclDomainHash,
  subdomain1,
  subdomain1LabelHash,
  subdomain1Hash
} from './helpers/setupContracts'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const DCLRegistrar = artifacts.require('FakeDCLRegistrar')
const DCLStandardController = artifacts.require('FakeDCLStandardController')

const MAX_GAS_PRICE = '20000000000'

describe('DCLStandardController', function() {
  let creationParams

  // Accounts
  let accounts
  let deployer
  let user
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
      DCLStandardController
    )

    manaContract = contracts.manaContract
    ensRegistryContract = contracts.ensRegistryContract
    dclRegistrarContract = contracts.dclRegistrarContract
    dclControllerContract = contracts.dclControllerContract

    await dclRegistrarContract.migrationFinished()
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const contract = await DCLStandardController.new(
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

      const maxGasPrice = await dclControllerContract.maxGasPrice()
      expect(maxGasPrice).to.eq.BN(MAX_GAS_PRICE)
    })

    it('reverts if acceptedToken is not a contract', async function() {
      await assertRevert(
        DCLStandardController.new(
          user,
          dclRegistrarContract.address,
          creationParams
        ),
        'Accepted token should be a contract'
      )
    })

    it('reverts if registrar is not a contract', async function() {
      await assertRevert(
        DCLStandardController.new(manaContract.address, user, creationParams),
        'Registrar should be a contract'
      )
    })
  })

  describe('Register', function() {
    it('should register a name', async function() {
      const { logs } = await dclControllerContract.register(subdomain1, user, {
        ...fromUser,
        gasPrice: MAX_GAS_PRICE
      })

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
      expect(nameRegisteredLog.args._labelHash).to.be.equal(subdomain1LabelHash)
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

      const currentResolver = await ensRegistryContract.resolver(subdomain1Hash)
      expect(currentResolver).to.be.equal(ZERO_ADDRESS)
    })

    it('should register a name with a-z', async function() {
      let name = 'qwertyuiopasdfg'
      await dclControllerContract.register(name, user, fromUser)

      let tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      let subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'hjklzxcvbnm'
      await dclControllerContract.register(name, user, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 1)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'abc'
      await dclControllerContract.register(name, user, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 2)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with A-Z', async function() {
      let name = 'QWERTYUIOPASDFG'
      await dclControllerContract.register(name, user, fromUser)

      let tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      let subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'HJKLZXCVBNM'
      await dclControllerContract.register(name, user, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 1)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)

      name = 'ABC'
      await dclControllerContract.register(name, user, fromUser)
      tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 2)
      subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with 0-9', async function() {
      const name = '123456789'
      await dclControllerContract.register(name, user, fromUser)
      const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      const subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('should register a name with a-A and 0-9', async function() {
      const name = '123456789aBcd'
      await dclControllerContract.register(name, user, fromUser)
      const tokenId = await dclRegistrarContract.tokenOfOwnerByIndex(user, 0)
      const subdomain = await dclRegistrarContract.subdomains(tokenId)
      expect(subdomain).to.be.equal(name)
    })

    it('reverts when trying to register a name with a gas price higher than max gas price', async function() {
      await assertRevert(
        dclControllerContract.register(subdomain1, user, {
          ...fromUser,
          gasPrice: MAX_GAS_PRICE + 1
        }),
        'Maximum gas price allowed exceeded'
      )
    })

    it('reverts when the name has invalid characters', async function() {
      let name = 'the username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = '_username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = 'úsername'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = '^"}username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = '👍username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = '€username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      name = '𐍈username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x2F
      name = ':username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x3A
      name = '/username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x40
      name = '@username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x5b
      name = '[username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x60
      name = '`username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Edge cases on ascii table 0x7B
      name = '{username'
      await assertRevert(
        dclControllerContract.register(name, user, fromUser),
        'Invalid Character'
      )

      // Special characters
      // With ascii 0x1f (US)
      let tx = {
        from: userController,
        to: dclControllerContract.address,
        data: `0x1e59c5290000000000000000000000000000000000000000000000000000000000000040000000000000000000000000${user.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000031f60600000000000000000000000000000000000000000000000000000000000`
      }
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x00 (NULL)
      tx = {
        from: userController,
        to: dclControllerContract.address,
        data: `0x1e59c5290000000000000000000000000000000000000000000000000000000000000040000000000000000000000000${user.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000030060600000000000000000000000000000000000000000000000000000000000`
      }
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x08 (BACKSPACE)
      tx = {
        from: userController,
        to: dclControllerContract.address,
        data: `0x1e59c5290000000000000000000000000000000000000000000000000000000000000040000000000000000000000000${user.replace(
          '0x',
          ''
        )}00000000000000000000000000000000000000000000000000000000000000030860600000000000000000000000000000000000000000000000000000000000`
      }
      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')
    })

    it('reverts when username is lower than 2 and greather than 15 bytes', async function() {
      const bigUsername = 'abignameregistry'
      await assertRevert(
        dclControllerContract.register(bigUsername, user, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
      )
    })

    it('reverts when trying to register a name with a lenght < 3', async function() {
      await assertRevert(
        dclControllerContract.register('', user, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
      )

      await assertRevert(
        dclControllerContract.register('a', user, fromUser),
        'Name should be greather than or equal to 2 and less than or equal to 15'
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

  describe('updateMaxGasPrice', function() {
    it('should update the max gas price', async function() {
      let maxGasPrice = await dclControllerContract.maxGasPrice()
      expect(maxGasPrice).to.eq.BN(MAX_GAS_PRICE)

      const newMaxGasPrice = 1000000000
      const { logs } = await dclControllerContract.updateMaxGasPrice(
        newMaxGasPrice,
        fromDeployer
      )

      expect(logs.length).to.be.equal(1)

      const newOwnerLog = logs[0]
      expect(newOwnerLog.event).to.be.equal('MaxGasPriceChanged')
      expect(newOwnerLog.args._oldMaxGasPrice).to.eq.BN(MAX_GAS_PRICE)
      expect(newOwnerLog.args._newMaxGasPrice).to.eq.BN(newMaxGasPrice)

      maxGasPrice = await dclControllerContract.maxGasPrice()
      expect(maxGasPrice).to.eq.BN(newMaxGasPrice)
    })

    it('should update the max gas price to 1 gwei', async function() {
      const newMaxGasPrice = 1000000000
      await dclControllerContract.updateMaxGasPrice(
        newMaxGasPrice,
        fromDeployer
      )

      const maxGasPrice = await dclControllerContract.maxGasPrice()
      expect(maxGasPrice).to.eq.BN(newMaxGasPrice)
    })

    it('should update the max gas price to 30 gwei', async function() {
      const newMaxGasPrice = 30000000000
      await dclControllerContract.updateMaxGasPrice(
        newMaxGasPrice,
        fromDeployer
      )

      const maxGasPrice = await dclControllerContract.maxGasPrice()
      expect(maxGasPrice).to.eq.BN(newMaxGasPrice)
    })

    it('reverts when updating the max gas price by an unauthorized user', async function() {
      const newMaxGasPrice = 10000000000
      await assertRevert(
        dclControllerContract.updateMaxGasPrice(newMaxGasPrice, fromHacker),
        'Ownable: caller is not the owner'
      )
    })

    it('reverts when updating the max gas price with lower than 1 gwei', async function() {
      await assertRevert(
        dclControllerContract.updateMaxGasPrice(0, fromDeployer),
        'Max gas price should be greater than or equal to 1 gwei'
      )

      await assertRevert(
        dclControllerContract.updateMaxGasPrice(999999999, fromDeployer),
        'Max gas price should be greater than or equal to 1 gwei'
      )
    })

    it('reverts when updating the max gas price with the same value', async function() {
      await assertRevert(
        dclControllerContract.updateMaxGasPrice(MAX_GAS_PRICE, fromDeployer),
        'Max gas price should be different'
      )
    })
  })
})
