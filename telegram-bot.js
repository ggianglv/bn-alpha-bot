const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Load Telegram bot token and API URL from .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Load user IDs from config file
const config = require('./config.json');
const USER_IDS = config.userIds;

// In-memory storage for the latest config
let latestConfig = null;

// Headers for the API request
const headers = {
  "accept": "*/*",
  "accept-language": "en,vi;q=0.9,ja;q=0.8,en-US;q=0.7,la;q=0.6",
  "bnc-level": "0",
  "bnc-location": "VN",
  "bnc-time-zone": "Asia/Saigon",
  "bnc-uuid": "",
  "cache-control": "no-cache",
  "clienttype": "web",
  "content-type": "application/json",
  "csrftoken": "",
  "device-info": "",
  "fvideo-id": "",
  "fvideo-token": "",
  "lang": "en",
  "pragma": "no-cache",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-passthrough-token": "",
  "x-trace-id": "",
  "x-ui-request-trace": ""
};

// Function to fetch data from API
async function fetchData() {
  try {
    const response = await axios.post('https://www.binance.com/bapi/defi/v1/friendly/wallet-direct/buw/growth/query-alpha-airdrop', {
      page: 1,
      rows: 6
    }, {
      headers: headers
    });
    if (response.data.success && response.data.data.configs.length > 0) {
      return response.data.data.configs[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return null;
  }
}

// Function to send message to multiple Telegram users
async function sendTelegramMessage(message) {
  const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
  try {
    for (const userId of USER_IDS) {
      await bot.sendMessage(userId, message);
      console.log(`Message sent to user ${userId}`);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
  }
}

// Function to check for new data
async function checkForNewData() {
  const newConfig = await fetchData();
  if (!newConfig) {
    console.log('No new data fetched');
    return;
  }

  if (latestConfig == null) {
    latestConfig = newConfig;
    console.log('Initial config set:', latestConfig);
    return;
  }


  // Compare with stored config
  if (latestConfig.configId !== newConfig.configId) {
    latestConfig = newConfig;
    const message = `New record detected!\n` +
      `Config Name: ${newConfig.configName}\n` +
      `Token Symbol: ${newConfig.tokenSymbol}\n` +
      `Airdrop Amount: ${newConfig.airdropAmount}\n`
    await sendTelegramMessage(message);
  } else {
    console.log('No new records found');
  }
}

// Schedule task to run at every hour with 500ms delay
cron.schedule('0 * * * *', async () => {
  setTimeout(async () => {
    console.log('Checking for new data at', new Date().toLocaleString());
    await checkForNewData();
  }, 500);
});

// Initial check on startup
console.log('Bot started');
sendTelegramMessage('Bot started successfully. Monitoring for new records...');
checkForNewData();