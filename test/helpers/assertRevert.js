const should = require('chai').should()

export default async function assertRevert(promise, message) {
  try {
    await promise
  } catch (error) {
    error.message.should.include(
      message || 'revert',
      `Expected "revert", got ${error} instead`
    )
    return
  }
  should.fail('Expected revert not received')
}
