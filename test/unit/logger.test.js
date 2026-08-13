'use strict'

const {assert} = require('chai')

describe('Logger', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    delete process.env.LOG_LEVEL
    process.env.NODE_ENV = 'test'
  })

  it('initialises log level when specified in LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'silly'
    const logger = require('../../server/logger')
    assert.equal(logger.level, 'silly')
  })

  it('initialises log level to debug in development', () => {
    delete process.env.LOG_LEVEL
    process.env.NODE_ENV = 'development'
    const logger = require('../../server/logger')
    assert.equal(logger.level, 'debug')
  })

  it('initialises log level to info in production', () => {
    delete process.env.LOG_LEVEL
    process.env.NODE_ENV = 'production'
    const logger = require('../../server/logger')
    assert.equal(logger.level, 'info')
  })
})
