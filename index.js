require('colors');
const Config = require('./src/config');
const Bot = require('./src/bot');
const initLogger = require('./src/logger');
const {
  readLines,
  displayHeader,
  askAccountType,
  askProxyMode,
} = require('./src/utils');

async function main() {
  displayHeader();
  console.log('⏳ 请稍候...\n'.yellow);

  const config = new Config();
  const logger = initLogger();

  const tokens = await readLines('token.txt');
  const useProxy = await askProxyMode();

  let proxies = [];
  if (useProxy) {
    proxies = await readLines('proxy.txt');

    if (tokens.length > proxies.length) {
      console.log(
        `⚠️  ${'代理数量不足，无法满足令牌数量'.yellow}`
      );
      return;
    }
  }

  const accountType = await askAccountType();
  const bot = new Bot(config, logger);
  if (accountType === '单个账户') {
    const singleToken = tokens[0];
    if (useProxy) {
      for (const proxy of proxies) {
        bot
          .connect(singleToken, proxy)
          .catch((err) => console.log(`❌ ${err.message}`.red));
      }
    } else {
      bot
        .connect(singleToken)
        .catch((err) => console.log(`❌ ${err.message}`.red));
    }
  } else {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const proxy = useProxy ? proxies[i] : null;
      bot
        .connect(token, proxy)
        .catch((err) => console.log(`❌ ${err.message}`.red));
    }
  }

  process.on('SIGINT', () => {
    console.log(`\n👋 ${'正在关闭...'.green}`);
    process.exit(0);
  });
}

main().catch((error) => console.log(`❌ ${error.message}`.red));
