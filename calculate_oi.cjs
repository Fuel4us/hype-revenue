
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('meta.json', 'utf8'));

// The response is [meta, assetCtxs]
const universe = data[0].universe;
const assetCtxs = data[1];

let totalOpenInterest = 0;

assetCtxs.forEach((ctx, index) => {
    // "openInterest" is in the asset unit (e.g. BTC)
    // "markPx" is the current price
    // Notional OI = openInterest * markPx
    const oi = parseFloat(ctx.openInterest);
    const price = parseFloat(ctx.markPx);
    const notional = oi * price;
    totalOpenInterest += notional;
});

console.log("Total Open Interest (Snapshot):", totalOpenInterest);
