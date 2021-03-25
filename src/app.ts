// Config dotenv
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })
// Dependencies
import { bot } from './helpers/bot'
import { checkTime } from './middlewares/checkTime'
import { setupHelp } from './commands/help'
import { setupExtractor } from './commands/extractor'
import { attachUser } from './middlewares/attachUser'
import { setupI18N } from './helpers/i18n'

// Check time
bot.use(checkTime)
// Attach user
bot.use(attachUser)
// Setup commands
setupI18N(bot)
setupHelp(bot)
setupExtractor(bot)

// Start bot
bot.startPolling()
// Log
console.info('Bot is up and running')
