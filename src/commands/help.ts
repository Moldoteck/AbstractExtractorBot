// Dependencies
import { Telegraf, Context } from "telegraf";

export function setupHelp(bot: Telegraf<Context>) {
  bot.command(['help', 'start'], ctx => {
    ctx.reply("This bot extracts abstracts from pubmed articles")
  })
}
