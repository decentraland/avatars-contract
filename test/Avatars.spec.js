import { Mana, ADDRESS_INDEXES } from 'decentraland-contract-plugins'

import assertRevert from './helpers/assertRevert'
import { increaseBlocks } from './helpers/increase'

const BN = web3.utils.BN
const expect = require('chai').use(require('bn-chai')(BN)).expect

const Avatars = artifacts.require('UsernameRegistry')

describe('Avatars', function() {
  this.timeout(100000)

  // globals
  const EMPTY_32_BYTES =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const username = 'ignacio'
  const metadata = 'the metadata'
  const salt = web3.utils.randomHex(32) // Random 32-bytes hexa
  const blocksUntilReveal = 10
  let creationParams

  // Accounts
  let accounts
  let deployer
  let user
  let owner
  let anotherUser
  let fromOwner
  let fromUser
  let fromAnotherUser

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
    owner = accounts[Object.keys(ADDRESS_INDEXES).length]
    fromUser = { from: user }
    fromAnotherUser = { from: anotherUser }
    fromOwner = { from: owner }

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

    avatarsContract.initialize(manaContract.address, owner, blocksUntilReveal)

    await mana.authorize(avatarsContract.address)
  })

  describe('Constructor', function() {
    it('should be depoyed with valid arguments', async function() {
      const contract = await Avatars.new(creationParams)
      await contract.initialize(manaContract.address, owner, blocksUntilReveal)

      const mana = await contract.manaToken()
      const canRegister = await contract.allowed(owner)
      const blocks = await contract.blocksUntilReveal()

      expect(mana).to.be.equal(manaContract.address)
      expect(canRegister).to.be.equal(true)
      expect(blocks).to.be.eq.BN(blocksUntilReveal)
    })

    it('reverts when trying to deploy with blocksUntilReveal = 0', async function() {
      const contract = await Avatars.new(creationParams)

      await assertRevert(
        contract.initialize(manaContract.address, owner, 0),
        'Blocks until reveal should be greather than 0'
      )
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

    it('reverts when username is greather than 32 bytes', async function() {
      const validUsername = 'this_username_is_very_very_tight'
      await avatarsContract.registerUsername(
        user,
        validUsername,
        metadata,
        fromOwner
      )

      const bigUsername = 'username_given_is_very_very_large'
      await assertRevert(
        avatarsContract.registerUsername(
          user,
          bigUsername,
          metadata,
          fromOwner
        ),
        'Username should be less than or equal 32 characters'
      )
    })

    it('reverts when username has blanks', async function() {
      const usernameWithBlanks = 'this username has blanks'

      await assertRevert(
        avatarsContract.registerUsername(
          user,
          usernameWithBlanks,
          metadata,
          fromOwner
        ),
        'No blanks are allowed'
      )
    })
  })

  describe('Commit & Reveal', function() {
    let hash

    beforeEach(async function() {
      hash = await avatarsContract.getHash(username, metadata, salt, fromUser)
    })

    it('should match solidity hash with web3 hash', async function() {
      // Remove 0x
      const contractAddress = avatarsContract.address.toLowerCase().slice(2)
      const hexUsername = web3.utils.toHex(username).slice(2)
      const hexMetadata = web3.utils.toHex(metadata).slice(2)
      const userSalt = salt.slice(2)

      const web3Hash = web3.utils.keccak256(
        '0x' + contractAddress + hexUsername + hexMetadata + userSalt
      )

      expect(web3Hash).to.be.equal(hash)
    })

    it('should commit', async function() {
      // Check user commit
      let userCommit = await avatarsContract.commit(user)

      expect(userCommit.commit).to.be.equal(EMPTY_32_BYTES)
      expect(userCommit.blockNumber).to.eq.BN(0)
      expect(userCommit.revealed).to.eq.BN(false)

      const hash = await avatarsContract.getHash(
        username,
        metadata,
        salt,
        fromUser
      )

      const { logs } = await avatarsContract.commitUsername(hash, fromUser)
      const blockNumber = (await web3.eth.getBlock('latest')).number

      // Check logs
      expect(logs.length).to.be.equal(1)

      const log = logs[0]
      expect(log.event).to.be.equal('CommitUsername')
      expect(log.args._owner).to.be.equal(user)
      expect(log.args._hash).to.be.equal(hash)
      expect(log.args._blockNumber).to.eq.BN(blockNumber)

      // Check user commit
      userCommit = await avatarsContract.commit(user)

      expect(userCommit.commit).to.be.equal(hash)
      expect(userCommit.blockNumber).to.eq.BN(blockNumber)
      expect(userCommit.revealed).to.eq.BN(false)
    })

    it('should commit & reveal', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      // Check user commit
      let userCommit = await avatarsContract.commit(user)
      const commitBlockNumber = (await web3.eth.getBlock('latest')).number

      expect(userCommit.commit).to.be.equal(hash)
      expect(userCommit.blockNumber).to.eq.BN(commitBlockNumber)
      expect(userCommit.revealed).to.eq.BN(false)

      await increaseBlocks(blocksUntilReveal)

      const { logs } = await avatarsContract.revealUsername(
        username,
        metadata,
        salt,
        fromUser
      )
      const revealBlockNumber = (await web3.eth.getBlock('latest')).number

      // Check logs
      expect(logs.length).to.be.equal(2)

      const log = logs[0]
      expect(log.event).to.be.equal('RevealUsername')
      expect(log.args._owner).to.be.equal(user)
      expect(log.args._hash).to.be.equal(hash)
      expect(log.args._blockNumber).to.eq.BN(revealBlockNumber)

      checkRegisterEvent(logs[1], user, user)

      // Check user data
      const data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)

      // Check user commit
      userCommit = await avatarsContract.commit(user)
      expect(userCommit.commit).to.be.equal(hash)
      expect(userCommit.blockNumber).to.eq.BN(commitBlockNumber)
      expect(userCommit.revealed).to.eq.BN(true)
    })

    it('should override previous commit', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      await increaseBlocks(blocksUntilReveal - 1)
      await assertRevert(
        avatarsContract.revealUsername(username, metadata, salt, fromUser),
        'Reveal can not be done before blocks passed'
      )

      const newUsername = username + 'v2'
      const newHash = await avatarsContract.getHash(
        newUsername,
        metadata,
        salt,
        fromUser
      )
      await avatarsContract.commitUsername(newHash, fromUser)

      await increaseBlocks(1)
      await assertRevert(
        avatarsContract.revealUsername(username, metadata, salt, fromUser),
        'Revealed hash does not match commit'
      )
      await assertRevert(
        avatarsContract.revealUsername(newUsername, metadata, salt, fromUser),
        'Reveal can not be done before blocks passed'
      )

      await increaseBlocks(blocksUntilReveal)

      await avatarsContract.revealUsername(
        newUsername,
        metadata,
        salt,
        fromUser
      )
    })

    it('should update username', async function() {
      await avatarsContract.commitUsername(hash, fromUser)
      await increaseBlocks(blocksUntilReveal)
      await avatarsContract.revealUsername(username, metadata, salt, fromUser)

      // Check user data
      let data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)

      const newUsername = username + 'v2'
      const newHash = await avatarsContract.getHash(
        newUsername,
        '',
        salt,
        fromUser
      )
      await avatarsContract.commitUsername(newHash, fromUser)

      await increaseBlocks(blocksUntilReveal)
      await avatarsContract.revealUsername(newUsername, '', salt, fromUser)

      data = await avatarsContract.user(user)
      expect(data.username).to.be.equal(newUsername)
      expect(data.metadata).to.be.equal(metadata)
    })

    it('reverts when commit & reveal before allowed', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      await increaseBlocks(blocksUntilReveal - 1)

      await assertRevert(
        avatarsContract.revealUsername(username, metadata, salt, fromUser),
        'Reveal can not be done before blocks passed'
      )
    })

    it('reverts when revealing with different data', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      const alteredUsername = `${username} `
      await assertRevert(
        avatarsContract.revealUsername(
          alteredUsername,
          metadata,
          salt,
          fromUser
        ),
        'Revealed hash does not match commit'
      )

      const alteredMetadata = `${metadata} `
      await assertRevert(
        avatarsContract.revealUsername(
          username,
          alteredMetadata,
          salt,
          fromUser
        ),
        'Revealed hash does not match commit'
      )

      const alteredSalt = web3.utils.randomHex(32)
      await assertRevert(
        avatarsContract.revealUsername(
          username,
          metadata,
          alteredSalt,
          fromUser
        ),
        'Revealed hash does not match commit'
      )
    })

    it('reverts when revealing an already revealed commit', async function() {
      await avatarsContract.commitUsername(hash, fromUser)
      await increaseBlocks(blocksUntilReveal)
      await avatarsContract.revealUsername(username, metadata, salt, fromUser)

      await assertRevert(
        avatarsContract.revealUsername(username, metadata, salt, fromUser),
        'Commit was already revealed'
      )
    })

    it('reverts when username was already taken', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      await increaseBlocks(blocksUntilReveal)

      await avatarsContract.registerUsername(
        anotherUser,
        username,
        metadata,
        fromOwner
      )

      await assertRevert(
        avatarsContract.revealUsername(username, metadata, salt, fromUser),
        'The username was already taken'
      )

      let data = await avatarsContract.user(anotherUser)
      expect(data.username).to.be.equal(username)
      expect(data.metadata).to.be.equal(metadata)

      data = await avatarsContract.user(user)
      expect(data.username).to.be.equal('')
      expect(data.metadata).to.be.equal('')
    })

    it('reverts when a user try to reveal someone else commit', async function() {
      await avatarsContract.commitUsername(hash, fromUser)

      await increaseBlocks(blocksUntilReveal)

      await assertRevert(
        avatarsContract.revealUsername(
          username,
          metadata,
          salt,
          fromAnotherUser
        ),
        'User has not a commit to be revealed'
      )
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

      // Set allowance to user
      await avatarsContract.setAllowed(user, true, fromOwner)

      allowed = await avatarsContract.allowed(user)
      expect(allowed).to.be.equal(true)

      // Set allowance to another user
      await avatarsContract.setAllowed(anotherUser, true, fromUser)

      allowed = await avatarsContract.allowed(anotherUser)
      expect(allowed).to.be.equal(true)

      // Remove allowance to user
      await avatarsContract.setAllowed(user, false, fromAnotherUser)

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
        avatarsContract.setAllowed(anotherUser, true, fromUser),
        'The sender is not allowed to register a username'
      )
    })
  })
})
