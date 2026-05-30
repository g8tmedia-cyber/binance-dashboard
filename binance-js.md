# Binance JavaScript API Guide

> Official Docs: https://developers.binance.com/docs/binance-spot-api-docs/rest-api
> **Futures Docs:** https://developers.binance.com/docs/derivatives/usds-margined-futures
> GitHub (Spot): https://github.com/binance/binance-spot-api-docs
> Node SDK: https://github.com/binance/binance-connector-js
> Futures SDK: `npm install @binance/connector` (supports USDT-M futures)
> Spot Testnet (public only): https://testnet.binance.vision
> **Futures Testnet (full API):** https://testnet.binancefuture.com

---

## Spot vs Futures — Two Separate APIs

| | Spot | USDT-M Futures (Perpetual) |
|--|------|---------------------------|
| Base URL (public) | `https://data-api.binance.vision` | `https://fapi.binance.com` |
| Base URL (private) | `https://api.binance.com` | `https://fapi.binance.com` |
| WebSocket | `wss://stream.binance.com:9443/ws` | `wss://fstream.binance.com/ws` |
| Symbol | `BTCUSDT` | `BTCUSDT` |
| **Use for** | Reading spot prices | Trading BTCUSDT perpetual |

> ⚠️ **Common mistake:** Using the Spot API (`data-api.binance.vision`) when you want futures perpetual data. They have different prices. Always use `fapi.binance.com` for USDT-M perpetual.

---

## Install

```bash
npm install @binance/connector
```

Or use the official SDK:

```bash
npm install binance-connector-js
```

---

## Setup

```js
// Using ESM
import { Spot } from '@binance/connector';

// Public (no API key needed) — use data-api.binance.vision for public endpoints
const PUBLIC_BASE = 'https://data-api.binance.vision';

// Private (requires API key) — use api.binance.com
const PRIVATE_BASE = 'https://api.binance.com';

const apiKey = 'your_api_key';
const apiSecret = 'your_api_secret';

// Create client
const client = new Spot(apiKey, apiSecret, { baseURL: PRIVATE_BASE });
// Public client (no auth)
const publicClient = new Spot('', '', { baseURL: PUBLIC_BASE });
```

---

## Public REST API — No API Key

### Ping / Server Time

```js
// Using global fetch (Node 18+)
const resp = await fetch('https://data-api.binance.vision/api/v3/ping');
const data = await resp.json();
console.log(data); // {} — empty means success
```

### Exchange Info

```js
const resp = await fetch('https://data-api.binance.vision/api/v3/exchangeInfo');
const data = await resp.json();
console.log(data.symbols.map(s => ({ symbol: s.symbol, status: s.status })));
```

### Ticker Price

```js
// Single symbol
const resp = await fetch('https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT');
const { price } = await resp.json();
console.log(`BTC price: $${price}`);

// All tickers
const resp = await fetch('https://data-api.binance.vision/api/v3/ticker/price');
const tickers = await resp.json();
console.log(`Total pairs: ${tickers.length}`);
```

### 24hr Ticker

```js
const resp = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr?symbol=BTCUSDT');
const data = await resp.json();
console.log(`
  Symbol: ${data.symbol}
  Price: $${data.lastPrice}
  24h High: $${data.highPrice}
  24h Low: $${data.lowPrice}
  24h Change: ${data.priceChangePercent}%
  Volume: ${data.volume}
`);
```

### Klines (Candlesticks)

```js
const symbol = 'BTCUSDT';
const interval = '1h';
const limit = 10;

const resp = await fetch(
  `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
);
const klines = await resp.json();
// Each kline: [openTime, open, high, low, close, volume, closeTime, ...]
klines.forEach(k => {
  const [openTime, open, high, low, close, volume] = k;
  console.log(`${new Date(openTime).toISOString()} O:${open} H:${high} L:${low} C:${close}`);
});
```

### Order Book

```js
const resp = await fetch('https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=10');
const data = await resp.json();
console.log('Bids:', data.bids);
console.log('Asks:', data.asks);
```

### Recent Trades

```js
const resp = await fetch('https://data-api.binance.vision/api/v3/trades?symbol=BTCUSDT&limit=10');
const trades = await resp.json();
trades.forEach(t => {
  console.log(`${new Date(t.time).toISOString()} ${t.isBuyerMaker ? 'SELL' : 'BUY'} ${t.price} x ${t.qty}`);
});
```

---

## WebSocket — Real-Time Data

```js
// Using the SDK
import { WebSocketSpot } from '@binance/connector';

let ws;

function connect() {
  ws = new WebSocketSpot(['wss://stream.binance.com:9443/ws/btcusdt@kline_1m']);

  ws.onMessage((data) => {
    const msg = JSON.parse(data);
    if (msg.k) {
      console.log(`
        Symbol: ${msg.s}
        Time: ${new Date(msg.k.t).toISOString()}
        Open: ${msg.k.o}  High: ${msg.k.h}  Low: ${msg.k.l}  Close: ${msg.k.c}
        Volume: ${msg.k.v}
      `);
    }
  });

  ws.onError((err) => console.error('WS Error:', err));
  ws.onClose(() => {
    console.log('WS closed, reconnecting...');
    setTimeout(connect, 3000);
  });
}

connect();

// Multiple streams — combined: wss://stream.binance.com:9443/stream?streams=btcusdt@kline_1m/ethusdt@kline_1m
// Or use the SDK combined streams:
// import { CombinedSpotWebSocket } from '@binance/connector';
```

### WebSocket Trades

```js
const WebSocket = require('ws');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log(`${new Date(msg.T).toISOString()} ${msg.m ? 'SELL' : 'BUY'} ${msg.p} x ${msg.q}`);
});
```

### WebSocket Order Book (Depth)

```js
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms');
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Bids:', msg.b, 'Asks:', msg.a);
});
```

---

## Private REST API — Requires API Key

> **Security:** Never hardcode API keys. Use environment variables.

```js
import crypto from 'crypto';

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';

// Helper: sign request with HMAC SHA256
function sign(queryString) {
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(queryString)
    .digest('hex');
}

// Generic signed request
async function signedRequest(method, endpoint, params = {}) {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams({ ...params, timestamp }).toString();
  const signature = sign(queryParams);
  const url = `${BASE_URL}${endpoint}?${queryParams}&signature=${signature}`;

  const resp = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': API_KEY,
      'Content-Type': 'application/json',
    },
  });
  return resp.json();
}
```

### Get Account Info

```js
const account = await signedRequest('GET', '/api/v3/account');
console.log('Balances:', account.balances.filter(b => parseFloat(b.free) > 0));
```

### Get Open Orders

```js
const orders = await signedRequest('GET', '/api/v3/openOrders', { symbol: 'BTCUSDT' });
console.log('Open orders:', orders.length);
```

### Place Limit Order

```js
const order = await signedRequest('POST', '/api/v3/order', {
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  timeInForce: 'GTC',
  quantity: '0.001',
  price: '95000',
});
console.log('Order placed:', order.orderId, order.status);
```

### Place Market Order

```js
const order = await signedRequest('POST', '/api/v3/order', {
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: '0.001',
});
console.log('Order filled:', order.orderId, order.status);
```

### Cancel Order

```js
const result = await signedRequest('DELETE', '/api/v3/order', {
  symbol: 'BTCUSDT',
  orderId: '12345678',
});
console.log('Cancelled:', result.orderId);
```

### Place OCO Order (One-Cancels-Other)

```js
const order = await signedRequest('POST', '/api/v3/order/oco', {
  symbol: 'BTCUSDT',
  side: 'SELL',
  quantity: '0.001',
  price: '100000',       // take-profit price
  stopPrice: '95000',    // stop-loss trigger
  stopLimitPrice: '94500',
  stopLimitTimeInForce: 'GTC',
});
console.log('OCO placed:', order.orderListId);
```

---

## Binance USDT-Margined Futures API

> Base URL: `https://fapi.binance.com` (mainnet)  
> Testnet base: `https://testnet.binancefuture.com` (full private API supported)  
> Docs: https://developers.binance.com/docs/derivatives/usds-margined-futures

### Futures Setup

```js
import { Futures } from '@binance/connector';

const apiKey = process.env.BINANCE_FUTURES_API_KEY;
const apiSecret = process.env.BINANCE_FUTURES_API_SECRET;

// Mainnet
const futuresClient = new Futures(apiKey, apiSecret);

// Testnet (full private API — works with testnet API keys from testnet.binancefuture.com)
const testnetClient = new Futures(apiKey, apiSecret, {
  baseURL: 'https://testnet.binancefuture.com',
});
```

### Futures Signing (raw fetch)

```js
// Futures signing is identical to spot — HMAC SHA256
// Base URL for futures: https://fapi.binance.com

const BASE_URL = 'https://fapi.binance.com';

async function futuresSignedRequest(method, endpoint, params = {}) {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams({ ...params, timestamp }).toString();
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(queryParams)
    .digest('hex');

  const resp = await fetch(`${BASE_URL}${endpoint}?${queryParams}&signature=${signature}`, {
    method,
    headers: { 'X-MBX-APIKEY': API_KEY },
  });
  return resp.json();
}
```

---

### Public REST API — No API Key (Futures)

#### Exchange Info (Futures)

```js
const resp = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
const data = await resp.json();
// data.symbols contains all USDT-M perpetual contracts
data.symbols.filter(s => s.contractType === 'PERPETUAL').slice(0, 3).forEach(s => {
  console.log(`${s.symbol} — base: ${s.baseAsset}, quote: ${s.quoteAsset}, precision: ${s.pricePrecision}`);
});
```

#### Ticker (24hr)

```js
// All tickers
const resp = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
const tickers = await resp.json();
const btc = tickers.find(t => t.symbol === 'BTCUSDT');
console.log(`
  Symbol: ${btc.symbol}
  Last price: $${btc.lastPrice}
  24h High: $${btc.highPrice}
  24h Low: $${btc.lowPrice}
  24h Change: ${btc.priceChangePercent}%
  24h Volume: ${btc.volume} BTC
  Open Interest: ${btc.openInterest} BTC
  Funding rate: ${btc.fundingRate}%
  Next funding: ${new Date(parseInt(btc.nextFundingTime)).toISOString()}
`);

// Single ticker
const resp2 = await fetch('https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT');
const { price } = await resp2.json();
console.log(`BTCUSDT: $${price}`);
```

#### Klines (Futures)

```js
const params = new URLSearchParams({
  symbol: 'BTCUSDT',
  interval: '1h',   // 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  limit: 10,
});
const resp = await fetch(`https://fapi.binance.com/fapi/v1/klines?${params}`);
const klines = await resp.json();
klines.forEach(k => {
  // [openTime, open, high, low, close, volume, closeTime, ...]
  console.log(`${new Date(k[0]).toISOString()} O:${k[1]} H:${k[2]} L:${k[3]} C:${k[4]} Vol:${k[5]}`);
});
```

#### Order Book (Futures)

```js
const resp = await fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=10');
const data = await resp.json();
console.log('Top 10 Bids:', data.bids);
console.log('Top 10 Asks:', data.asks);
```

#### Recent Trades (Futures)

```js
const resp = await fetch('https://fapi.binance.com/fapi/v1/trades?symbol=BTCUSDT&limit=10');
const trades = await resp.json();
trades.forEach(t => {
  console.log(`${new Date(t.time).toISOString()} ${t.isBuyerMaker ? 'SELL' : 'BUY'} ${t.price} x ${t.qty}`);
});
```

#### Funding Rate

```js
const resp = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
const data = await resp.json();
console.log(`
  Funding rate: ${data.lastFundingRate}% (${parseFloat(data.lastFundingRate) * 100}% per 8h)
  Next funding: ${new Date(parseInt(data.nextFundingTime)).toISOString()}
  Mark price: $${data.markPrice}
  Index price: $${data.indexPrice}
`);
```

#### Open Interest

```js
const resp = await fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');
const data = await resp.json();
console.log(`Open interest: ${data.openInterest} BTC`);
```

#### Historical Liquidations

```js
const params = new URLSearchParams({
  symbol: 'BTCUSDT',
  limit: 10,
});
const resp = await fetch(`https://fapi.binance.com/fapi/v1/liquidationOrders?${params}`);
const data = await resp.json();
data.rows?.forEach(o => {
  console.log(`${new Date(o.time).toISOString()} ${o.side} ${o.symbol} — price: $${o.price} qty: ${o.qty} (${o.orderType})`);
});
```

---

### WebSocket — Futures Real-Time Data

```js
const WebSocket = require('ws');

// Unified futures stream — btcusdt@kline_1m, btcusdt@trade, btcusdt@depth@100ms
const ws = new WebSocket('wss://fstream.binance.com/ws');

// Subscribe to kline
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['btcusdt@kline_1m', 'btcusdt@trade'],
  id: 1,
}));

// Subscribe to ticker
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['btcusdt@ticker'],
  id: 2,
}));

// Subscribe to depth (partial orderbook, 20 levels, 100ms)
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['btcusdt@depth20@100ms'],
  id: 3,
}));

// Subscribe to funding rate (1-second updates)
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['btcusdt@markPrice@1s'],
  id: 4,
}));

// All market pair tickers
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['!ticker@arr'],
  id: 5,
}));

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.e === 'kline') {
    console.log(`[KLINE ${msg.s}] O:${msg.k.o} H:${msg.k.h} L:${msg.k.l} C:${msg.k.c}`);
  } else if (msg.e === 'trade') {
    console.log(`[TRADE ${msg.s}] ${msg.m ? 'SELL' : 'BUY'} ${msg.p} x ${msg.q}`);
  } else if (msg.e === '24hrTicker') {
    console.log(`[TICKER ${msg.s}] $${msg.c} | vol: ${msg.v}`);
  } else if (msg.lastUpdateId) {
    console.log(`[DEPTH] bids: ${msg.b?.length} asks: ${msg.a?.length}`);
  }
});

ws.on('error', (err) => console.error('WS error:', err));

// Unsubscribe
ws.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: ['btcusdt@kline_1m'], id: 100 }));
```

---

### Private REST API — Requires API Key (Futures)

#### Change Leverage

```js
// Must set leverage before placing order
const result = await futuresSignedRequest('POST', '/fapi/v1/leverage', {
  symbol: 'BTCUSDT',
  leverage: 10,   // 1-125x depending on symbol
});
console.log('Leverage set:', result.leverage, result.marginType);
```

#### Set Margin Type (Cross / Isolated)

```js
const result = await futuresSignedRequest('POST', '/fapi/v1/marginType', {
  symbol: 'BTCUSDT',
  marginType: 2,  // 1 = isolated, 2 = cross
});
console.log('Margin type set:', result.msg);
```

#### Get Account Info (Futures)

```js
const account = await futuresSignedRequest('GET', '/fapi/v2/account');
console.log('Total USDT balance:', account.totalCrossWalletBalance);
console.log('Positions:');
account.positions.forEach(p => {
  if (parseFloat(p.positionAmt) !== 0) {
    console.log(`  ${p.symbol}: ${p.positionAmt} ${p.precision} @ entry $${p.entryPrice} | PnL: $${p.unrealizedProfit} | leverage: ${p.leverage}x`);
  }
});
```

#### Get Position Mode (One-Way / Hedge)

```js
const mode = await futuresSignedRequest('GET', '/fapi/v1/positionSide/dual');
console.log('Position mode:', mode.dualModulePositionSide); // 'true' = hedge, 'false' = one-way
```

#### Place Limit Order (Futures)

```js
const order = await futuresSignedRequest('POST', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  timeInForce: 'GTC',
  quantity: '0.001',   // in BTC (base asset)
  price: '95000',
});
console.log('Limit order placed:', order.orderId, order.status, order.price);
```

#### Place Market Order (Futures)

```js
const order = await futuresSignedRequest('POST', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: '0.001',
});
console.log('Market filled:', order.orderId, order.status, order.executedQty, 'BTC');
```

#### Place Stop-Limit Order (Futures)

```js
const order = await futuresSignedRequest('POST', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP',
  timeInForce: 'GTC',
  quantity: '0.001',
  price: '94000',           // trigger price
  stopPrice: '94500',       // stop trigger
  reduceOnly: true,         // must be true for stop-loss
});
console.log('Stop order placed:', order.orderId, order.status);
```

#### Place Stop-Market Order (Futures)

```js
// STOP_MARKET — triggers a market order when stopPrice is hit
const order = await futuresSignedRequest('POST', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP_MARKET',
  quantity: '0.001',
  stopPrice: '94000',       // triggers market sell when price drops to 94000
  reduceOnly: true,
});
console.log('Stop-market order:', order.orderId);
```

#### Place Take-Profit Market Order

```js
const order = await futuresSignedRequest('POST', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'TAKE_PROFIT_MARKET',
  quantity: '0.001',
  stopPrice: '105000',      // triggers market sell when price rises to 105000
  reduceOnly: true,
});
console.log('TP-market order:', order.orderId);
```

#### Get Open Orders (Futures)

```js
const orders = await futuresSignedRequest('GET', '/fapi/v1/openOrders', {
  symbol: 'BTCUSDT',
});
console.log('Open orders:', orders.length);
orders.forEach(o => console.log(`  ${o.orderId} ${o.side} ${o.type} ${o.price} x ${o.origQty} [${o.status}]`));
```

#### Get All Open Orders (all symbols)

```js
const orders = await futuresSignedRequest('GET', '/fapi/v1/openOrders');
console.log('Total open orders:', orders.length);
```

#### Cancel Order (Futures)

```js
const result = await futuresSignedRequest('DELETE', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  orderId: '12345678',
});
console.log('Cancelled:', result.orderId);
```

#### Cancel All Open Orders

```js
const result = await futuresSignedRequest('DELETE', '/fapi/v1/allOpenOrders', {
  symbol: 'BTCUSDT',
});
console.log('Cancelled count:', result.numOfCancelRequests);
```

#### Cancel Multi-Orders

```js
const result = await futuresSignedRequest('DELETE', '/fapi/v1/order', {
  symbol: 'BTCUSDT',
  orderIdList: JSON.stringify(['111', '222', '333']),  // up to 10 at a time
});
console.log('Multi-cancel result:', result);
```

#### Get Position Risk

```js
const positions = await futuresSignedRequest('GET', '/fapi/v2/positionRisk');
positions.filter(p => parseFloat(p.positionAmt) !== 0).forEach(p => {
  console.log(`
    ${p.symbol}: ${p.positionAmt} ${p.precision}
    Entry: $${p.entryPrice} | Mark: $${p.markPrice}
    PnL: $${p.unrealizedProfit} (${p.roePnl}% ROE)
    Liquidation: $${p.liquidationPrice}
    Margin: ${p.margin} USDT | Leverage: ${p.leverage}x
  `);
});
```

#### Get Income History

```js
const params = new URLSearchParams({
  symbol: 'BTCUSDT',
  limit: 10,
});
const history = await futuresSignedRequest('GET', '/fapi/v1/income', params);
history.forEach(i => {
  console.log(`${new Date(parseInt(i.time)).toISOString()} ${i.incomeType} $${i.income} ${i.asset} (sym: ${i.symbol})`);
});
```

---

### Using the SDK for Futures (Recommended)

```js
import { Futures } from '@binance/connector';

const apiKey = process.env.BINANCE_FUTURES_API_KEY;
const apiSecret = process.env.BINANCE_FUTURES_API_SECRET;

// Mainnet
const futures = new Futures(apiKey, apiSecret);

// Testnet
const testnetFutures = new Futures(apiKey, apiSecret, {
  baseURL: 'https://testnet.binancefuture.com',
});

// Public — market data
const tickers   = await futures.ticker24hr();
const btcTicker  = await futures.ticker24hr({ symbol: 'BTCUSDT' });
const klines     = await futures.klines({ symbol: 'BTCUSDT', interval: '1h', limit: 10 });
const depth      = await futures.depth({ symbol: 'BTCUSDT', limit: 10 });
const funding    = await futures.fundingRate({ symbol: 'BTCUSDT' });

// Private — account & trading
const leverage  = await futures.changeLeverage({ symbol: 'BTCUSDT', leverage: 10 });
const marginType = await futures.changeMarginType({ symbol: 'BTCUSDT', marginType: 'CROSS' });
const account    = await futures.account();
const positions  = await futures.positionRisk();

const limitOrder = await futures.newOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: '0.001',
  price: '95000',
  timeInForce: 'GTC',
});

const marketOrder = await futures.newOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'MARKET',
  quantity: '0.001',
  reduceOnly: true,
});

const stopOrder = await futures.newOrder({
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'STOP',
  quantity: '0.001',
  price: '94000',
  stopPrice: '94500',
  reduceOnly: true,
});

const openOrders = await futures.openOrders({ symbol: 'BTCUSDT' });
const cancelled  = await futures.cancelOrder({ symbol: 'BTCUSDT', orderId: limitOrder.orderId });
const allCancelled = await futures.cancelAllOpenOrders({ symbol: 'BTCUSDT' });
```

---

## Using the Official SDK (Cleaner API)

```js
import { Spot } from '@binance/connector';

const spot = new Spot();

// Public
const klines = await spot.klines('BTCUSDT', '1h', { limit: 10 });
const price = await spot.tickerPrice('BTCUSDT');
const depth = await spot.depth('BTCUSDT', 10);

// Private — pass API key + secret
const privateClient = new Spot(apiKey, apiSecret);
const account = await privateClient.account();
const newOrder = await privateClient.newOrder('BTCUSDT', 'BUY', 'LIMIT', {
  quantity: '0.001',
  price: '95000',
  timeInForce: 'GTC',
});
```

---

## Error Handling

```js
try {
  const resp = await fetch('https://data-api.binance.vision/api/v3/order', {
    method: 'POST',
    headers: { 'X-MBX-APIKEY': API_KEY },
    body: JSON.stringify({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: '0.001' }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    console.error('Binance API Error:', err);
  }
} catch (e) {
  console.error('Network error:', e.message);
}
```

Common error codes:
| Code | Meaning |
|------|---------|
| -1000 | Unknown error |
| -1013 | Invalid quantity |
| -1021 | Timestamp invalid |
| -2015 | Invalid API key |
| -2019 | Insufficient balance |
| -2021 | Order would immediately self-trade |

---

## Rate Limits

| Endpoint type | Limit |
|--------------|-------|
| Weighted (general) | 1200 requests/min |
| Order (per order) | 10 orders/sec |
| Market data | IP-based |
| WebSocket | 5 messages/sec per stream |

Public endpoints: `https://data-api.binance.vision` — no auth, no rate penalty.

---

## Testing — Spot Testnet

```js
// Testnet does NOT support API key operations — public data only
const TESTNET_BASE = 'https://testnet.binance.vision';

// Fetch testnet klines
const resp = await fetch('https://testnet.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=5');
const klines = await resp.json();
console.log(klines);
```

For private API testing, use **Binance Futures Testnet**: https://testnet.binancefuture.com

---

## Key Endpoints Summary

### Spot API

| Operation | Endpoint | Auth |
|-----------|----------|------|
| Ping | GET /api/v3/ping | No |
| Exchange Info | GET /api/v3/exchangeInfo | No |
| Ticker | GET /api/v3/ticker/price | No |
| Klines | GET /api/v3/klines | No |
| Order Book | GET /api/v3/depth | No |
| Account | GET /api/v3/account | Yes |
| Place Order | POST /api/v3/order | Yes |
| Cancel Order | DELETE /api/v3/order | Yes |
| Open Orders | GET /api/v3/openOrders | Yes |

### USDT-M Futures API

| Operation | Endpoint | Auth |
|-----------|----------|------|
| Exchange Info | GET /fapi/v1/exchangeInfo | No |
| Ticker 24hr | GET /fapi/v1/ticker/24hr | No |
| Klines | GET /fapi/v1/klines | No |
| Order Book | GET /fapi/v1/depth | No |
| Funding Rate | GET /fapi/v1/premiumIndex | No |
| Open Interest | GET /fapi/v1/openInterest | No |
| Place Order | POST /fapi/v1/order | Yes |
| Cancel Order | DELETE /fapi/v1/order | Yes |
| Cancel All Orders | DELETE /fapi/v1/allOpenOrders | Yes |
| Set Leverage | POST /fapi/v1/leverage | Yes |
| Set Margin Type | POST /fapi/v1/marginType | Yes |
| Account Info | GET /fapi/v2/account | Yes |
| Position Risk | GET /fapi/v2/positionRisk | Yes |
| Open Orders | GET /fapi/v1/openOrders | Yes |
| Income History | GET /fapi/v1/income | Yes |

**Base URLs:**
- Spot public: `https://data-api.binance.vision`
- Spot private: `https://api.binance.com`
- Spot WebSocket: `wss://stream.binance.com:9443/ws`
- Futures public: `https://fapi.binance.com`
- Futures private: `https://fapi.binance.com`
- Futures WebSocket: `wss://fstream.binance.com/ws`
- Spot Testnet (public): `https://testnet.binance.vision`
- **Futures Testnet (full API):** `https://testnet.binancefuture.com`

**Futures WebSocket Streams:**
- Kline: `btcusdt@kline_1m` (interval: 1m, 5m, 15m, etc.)
- Trade: `btcusdt@trade`
- Ticker: `btcusdt@ticker`
- Depth: `btcusdt@depth20@100ms`
- Mark Price: `btcusdt@markPrice@1s`
- All tickers: `!ticker@arr`