import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'
import assertRevert from './helpers/assertRevert'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const Avatars = artifacts.require('AvatarNameRegistry')

describe.skip('DCL Names v1', function() {
  this.timeout(100000)

  // globals
  const username = 'ignacio'
  const metadata = 'the metadata'

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
  let avatarsContract
  let manaContract

  function checkRegisterEvent(
    _log,
    _owner,
    _caller = owner,
    _username = username,
    _metadata = metadata
  ) {
    expect(_log.event).to.be.equal('Register')
    expect(_log.args._owner).to.be.equal(_owner)
    expect(_log.args._username).to.be.equal(_username)
    expect(_log.args._metadata).to.be.equal(_metadata)
    expect(_log.args._caller).to.be.equal(_caller)
  }

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

    const mana = new Mana({ accounts, artifacts: global })

    await mana.deploy({ txParams: creationParams })

    manaContract = mana.getContract()

    avatarsContract = await Avatars.new(creationParams)

    avatarsContract.initialize(manaContract.address, owner)

    await mana.authorize(avatarsContract.address)
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const contract = await Avatars.new(creationParams)
      await contract.initialize(manaContract.address, owner)

      const mana = await contract.manaToken()
      const canRegister = await contract.allowed(owner)

      expect(mana).to.be.equal(manaContract.address)
      expect(canRegister).to.be.equal(true)
    })
  })

  describe('Register username', function() {
    it('should register a username', async function() {
      // Check user data
      let data = await avatarsContract.user(user)
      expect(data.username).to.be.equal('')
      expect(data.metadata).to.be.equal('')

      const { logs } = await avatarsContract.registerUsername(
        user,
        username,
        metadata,
        fromOwner
      )

      expect(logs.length).to.be.equal(1)

      checkRegisterEvent(logs[0], user)

      // Check user data
      data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)
    })

    it('should register a username by an allowed account', async function() {
      await avatarsContract.setAllowed(user, true, fromOwner)

      await avatarsContract.registerUsername(
        anotherUser,
        username,
        metadata,
        fromUser
      )

      // Check user data
      const data = await avatarsContract.user(anotherUser)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)
    })

    it('should free previous username', async function() {
      let isAvailable = await avatarsContract.isUsernameAvailable(username)
      expect(isAvailable).to.be.equal(true)

      await avatarsContract.registerUsername(
        user,
        username,
        metadata,
        fromOwner
      )

      isAvailable = await avatarsContract.isUsernameAvailable(username)
      expect(isAvailable).to.be.equal(false)

      const newUsername = username + '_v2'

      isAvailable = await avatarsContract.isUsernameAvailable(newUsername)
      expect(isAvailable).to.be.equal(true)

      await avatarsContract.registerUsername(
        user,
        newUsername,
        metadata,
        fromOwner
      )

      isAvailable = await avatarsContract.isUsernameAvailable(newUsername)
      expect(isAvailable).to.be.equal(false)
    })

    it('should change the username', async function() {
      await avatarsContract.registerUsername(
        user,
        username,
        metadata,
        fromOwner
      )

      // Check user data
      let data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)

      const newUsername = username + '_v2'
      await avatarsContract.registerUsername(user, newUsername, '', fromOwner)

      // Check user data
      data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(newUsername)
      expect(data.metadata).to.be.equal(metadata)

      const newMetadata = metadata + '_v2'
      await avatarsContract.registerUsername(
        user,
        username,
        newMetadata,
        fromOwner
      )

      // Check user data
      data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(newMetadata)
    })

    it('reverts when the name has blanks', async function() {
      const usernameWithBlanks = 'the username'

      await assertRevert(
        avatarsContract.registerUsername(
          user,
          usernameWithBlanks,
          metadata,
          fromOwner
        ),
        'Invalid Character'
      )
    })

    it('reverts when registering an already used username', async function() {
      await avatarsContract.registerUsername(
        user,
        username,
        metadata,
        fromOwner
      )

      // Same user
      await assertRevert(
        avatarsContract.registerUsername(user, username, metadata, fromOwner),
        'The username was already taken'
      )

      // Another user
      await assertRevert(
        avatarsContract.registerUsername(
          anotherUser,
          username,
          metadata,
          fromOwner
        ),
        'The username was already taken'
      )
    })

    it('reverts when a not allowed account trying to register a username', async function() {
      await assertRevert(
        avatarsContract.registerUsername(user, username, metadata, fromUser),
        'The sender is not allowed to register a username'
      )
    })

    it('reverts when username is greather than 15 bytes', async function() {
      const validUsername = 'the_username_is'
      await avatarsContract.registerUsername(
        user,
        validUsername,
        metadata,
        fromOwner
      )

      const bigUsername = 'this_username_is'
      await assertRevert(
        avatarsContract.registerUsername(
          user,
          bigUsername,
          metadata,
          fromOwner
        ),
        'Username should be less than or equal 15 characters'
      )
    })

    it('reverts when the username has invalid character', async function() {
      // With ascii 0x1f (US)
      let tx = {
        from: owner,
        to: avatarsContract.address,
        data: `0x88dd45ba000000000000000000000000${user.replace(
          '0x',
          ''
        )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000c1f736461736461736461736400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`
      }

      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x00 (NULL)
      tx = {
        from: owner,
        to: avatarsContract.address,
        data: `0x88dd45ba000000000000000000000000${user.replace(
          '0x',
          ''
        )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000c00736461736461736461736400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`
      }

      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')

      // With ascii 0x08 (BACKSPACE)
      tx = {
        from: owner,
        to: avatarsContract.address,
        data: `0x88dd45ba000000000000000000000000${user.replace(
          '0x',
          ''
        )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000c08736461736461736461736400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`
      }

      await assertRevert(web3.eth.sendTransaction(tx), 'Invalid Character')
    })
  })

  describe('Metadata', function() {
    const newMetadata = 'new metadata'

    it('should change metadata', async function() {
      await avatarsContract.registerUsername(
        user,
        username,
        metadata,
        fromOwner
      )

      let data = await avatarsContract.user(user)
      expect(data.metadata).to.be.equal(metadata)

      const { logs } = await avatarsContract.setMetadata(newMetadata, fromUser)
      expect(logs.length).to.be.equal(1)

      const log = logs[0]
      expect(log.event).to.be.equal('MetadataChanged')
      expect(log.args._owner).to.be.equal(user)
      expect(log.args._metadata).to.be.equal(newMetadata)

      data = await avatarsContract.user(user)
      expect(data.metadata).to.be.equal(newMetadata)
    })

    it('revert when changing metadata for an unexisting user', async function() {
      await assertRevert(
        avatarsContract.setMetadata(newMetadata),
        'The user does not exist'
      )
    })
  })

  describe('Allow accounts', function() {
    it('should assign the contract deployer as allowed', async function() {
      const allowed = await avatarsContract.allowed(owner)
      expect(allowed).to.be.equal(true)
    })

    it('should return false for a not allowed account', async function() {
      const allowed = await avatarsContract.allowed(user)
      expect(allowed).to.be.equal(false)
    })

    it('should manage role for an account', async function() {
      // Check user
      let allowed = await avatarsContract.allowed(user)
      expect(allowed).to.be.equal(false)

      // Set allowance to user
      const { logs } = await avatarsContract.setAllowed(user, true, fromOwner)

      expect(logs.length).to.be.equal(1)

      let log = logs[0]
      expect(log.event).to.be.equal('Allow')
      expect(log.args._caller).to.be.equal(owner)
      expect(log.args._account).to.be.equal(user)
      expect(log.args._allowed).to.be.equal(true)

      // Check another user
      allowed = await avatarsContract.allowed(anotherUser)
      expect(allowed).to.be.equal(false)

      // Set allowance to another user
      await avatarsContract.setAllowed(anotherUser, true, fromOwner)

      allowed = await avatarsContract.allowed(anotherUser)
      expect(allowed).to.be.equal(true)

      // Remove allowance to user
      await avatarsContract.setAllowed(user, false, fromOwner)

      allowed = await avatarsContract.allowed(user)
      expect(allowed).to.be.equal(false)

      // Remove allowance to another user
      const receipt = await avatarsContract.setAllowed(
        anotherUser,
        false,
        fromOwner
      )

      expect(receipt.logs.length).to.be.equal(1)

      log = receipt.logs[0]
      expect(log.event).to.be.equal('Allow')
      expect(log.args._caller).to.be.equal(owner)
      expect(log.args._account).to.be.equal(anotherUser)
      expect(log.args._allowed).to.be.equal(false)

      allowed = await avatarsContract.allowed(anotherUser)
      expect(allowed).to.be.equal(false)
    })

    it('reverts when trying to manage your own role', async function() {
      await assertRevert(
        avatarsContract.setAllowed(owner, false, fromOwner),
        'You can not manage your role'
      )
    })

    it('reverts when trying to allow an account by not an allowed account', async function() {
      await assertRevert(
        avatarsContract.setAllowed(anotherUser, true, fromUser)
      )

      await assertRevert(avatarsContract.setAllowed(user, true, fromHacker))
    })
  })
})
