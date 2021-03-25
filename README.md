The main purpose of this bot is to find links to PubMed And Nature journals in group/private chats on Telegram, get their abstracts and reply with a Telegraph link, containing this summary of this text and it's translation to russian language. This could help to read and understand very fast what is paper about

# Telegram bot based on telegraf.js.org

Inspired from https://github.com/backmeupplz/telegraf-template

# Installation and local launch

1. Clone this repo: `git clone https://github.com/Moldoteck/AbstractExtractorBot`
2. Launch the [mongo database](https://www.mongodb.com/) locally
3. Create `.env` with the environment variables listed below
4. Add `google_api.json` file in the root folder and enable translate API in google console
4. Run `yarn install` in the root folder
5. Run `yarn develop`

And you should be good to go! Feel free to fork and submit pull requests. Thanks!

# Environment variables

- `TOKEN` — Telegram bot token
- `MONGO`— URL of the mongo database
- `SMMRY_TOKEN`— Token from SMMRY API
- `TELEGRAPH_TOKEN`— Token from Telegraph API
- `NATURE_TOKEN`— Token for Nature/Springer Api

Also, please, consider looking at `.env.sample`.

# License

MIT — use for any purpose. Would be great if you could leave a note about the original developers. Thanks!
