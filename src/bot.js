const axios = require('axios');
const crypto = require('crypto');
const ProxyChecker = require('./proxyChecker');
const { SocksProxyAgent } = require('socks-proxy-agent');

class Bot {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.proxyCheck = new ProxyChecker(config, logger);
  }

  async connect(token, proxy = null) {
    try {
      const userAgent = 'Mozilla/5.0 ... Safari/537.3';
      const accountInfo = await this.getSession(token, userAgent, proxy);

      console.log(
        `✅ ${'已连接到会话'.green}，UID: ${accountInfo.uid}`
      );
      this.logger.info('会话信息', {
        uid: accountInfo.uid,
        name: accountInfo.name,
        useProxy: !!proxy,
      });

      console.log('');

      const interval = setInterval(async () => {
        try {
          await this.sendPing(accountInfo, token, userAgent, proxy);
        } catch (error) {
          console.log(`❌ ${'Ping 错误'.red}：${error.message}`);
          this.logger.error('Ping 错误', { error: error.message });
        }
      }, this.config.retryInterval);

      process.on('SIGINT', () => clearInterval(interval));
    } catch (error) {
      console.log(`❌ ${'连接错误'.red}：${error.message}`);
      this.logger.error('连接错误', { error: error.message, proxy });
    }
  }

  async getSession(token, userAgent, proxy) {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      };

      if (proxy) {
        config.httpsAgent = this.buildProxyConfig(proxy);
      }
      
      const response = await axios.post(this.config.sessionURL, {}, config);
      return response.data.data;
    } catch (error) {
      throw new Error('会话请求失败');
    }
  }

  async sendPing(accountInfo, token, userAgent, proxy) {
    const uid = accountInfo.uid || crypto.randomBytes(8).toString('hex');
    const browserId =
      accountInfo.browser_id || crypto.randomBytes(8).toString('hex');

    const pingData = {
      id: uid,
      browser_id: browserId,
      timestamp: Math.floor(Date.now() / 1000),
      version: '2.2.7',
    };

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      };

      if (proxy) {
        config.httpsAgent = this.buildProxyConfig(proxy);
      }

      await axios.post(this.config.pingURL, pingData, config);
      console.log(`📡 ${'Ping 已发送'.cyan}，UID: ${uid}`);
      this.logger.info('Ping 已发送', {
        uid,
        browserId,
        ip: proxy ? proxy : '直连',
      });
    } catch (error) {
      throw new Error('Ping 请求失败');
    }
  }

  buildProxyConfig(proxy) {
    return proxy 
      ? new SocksProxyAgent(proxy)
      : undefined;
  }
}

module.exports = Bot;
