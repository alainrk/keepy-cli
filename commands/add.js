'use strict'

const askFor = require('../lib/askFor')
const parseArgs = require('../lib/args')
const log = require('../lib/notify')
const { needToShowHelp, readKeyValueFile } = require('../lib/help')
const CryptoStorage = require('../lib/CryptoStorage')

module.exports = async function (args) {
  let opts = parseArgs(args)
  needToShowHelp('add.txt', opts)

  if (!opts.key && !opts.file) {
    return log.error('❌ key parameter is mandatory', 1)
  }

  const hasPayloadValue = !!opts.payload
  const hasEnvValue = opts.env && process.env[opts.key]
  if (!hasPayloadValue && !hasEnvValue && !opts.file) {
    return log.error('❌ payload or env parameter is mandatory', 1)
  }

  const itemKey = opts.key
  let itemPayload = opts.payload

  if (opts.env && !itemPayload) {
    itemPayload = process.env[itemKey]
  }
  if (opts.file && !itemPayload) {
    itemPayload = readKeyValueFile(opts.file)
  }

  const storage = new CryptoStorage()
  try {
    await storage.load()
  } catch (error) {
    return log.error('❌ keepy-store doesn\'t exists, call init first', 1)
  }

  let password = opts.password || null
  if (storage.isSecured() && password === null) {
    password = await askFor.password(storage.reminder)
  }

  try {
    if (opts.update) {
      // TODO update file
      const filters = {
        key: opts.key,
        tags: opts.tags
      }
      const dsItem = storage.read(password, filters)
      const items = dsItem.map(_ => _.index)
      storage.refresh(items, password, itemPayload)
      await storage.persist()
      log.info(`👍 Updated ${items.length} items`)
    } else {
      if (itemPayload instanceof Array) {
        itemPayload.forEach(([k, v]) => storage.store(password, k, v, opts.tags))
      } else {
        storage.store(password, itemKey, itemPayload, opts.tags)
      }
      await storage.persist()
      log.info('👍 Success')
    }
  } catch (error) {
    log.error(`❌ Error: ${error.message}`, 1)
  }
}
