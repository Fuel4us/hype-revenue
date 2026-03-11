import urllib.request
import json
import datetime
import time
import os
import sys

USDT_ETH_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7"
ETH_TETHER_MULTISIG = "0xc6cde7c39eb2f0f0095f41570af89efc2c1ea828"

USDT_TRON_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
TRON_TETHER_MULTISIG = "TBPxhVAsuzoFnKyXtc1o2UySEydPHgATto"
TRON_TREASURY = "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs"

START_DATE = datetime.datetime(2021, 1, 1, tzinfo=datetime.timezone.utc)
MINT_THRESHOLD = 800_000_000 

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path): return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line: continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())

def api_get(url, headers=None):
    hdrs = {"User-Agent": "Mozilla/5.0"}
    if headers: hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt < 4:
                wait = 2 ** attempt
                print(f"  ⚠️ Request failed ({e}), retrying in {wait}s...")
                time.sleep(wait)
            else: raise

def ts_to_date(ts):
    return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).strftime("%Y-%m-%d")

def fetch_ethereum_mints(api_key):
    print("\n🔷 Fetching Ethereum USDT mints from Etherscan V2...")
    mints = []
    page = 1
    offset = 100
    start_ts = int(START_DATE.timestamp())

    while True:
        url = (f"https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx"
               f"&contractaddress={USDT_ETH_CONTRACT}&address={ETH_TETHER_MULTISIG}"
               f"&page={page}&offset={offset}&sort=desc&apikey={api_key}")
        time.sleep(0.25)
        data = api_get(url)

        if data.get("status") != "1" or not data.get("result"):
            break

        txs = data["result"]
        hit_date_limit = False

        for tx in txs:
            ts = int(tx["timeStamp"])
            if ts < start_ts:
                hit_date_limit = True
                break
            
            if tx["from"].lower() == ETH_TETHER_MULTISIG.lower():
                amount_usd = int(tx["value"]) / 1e6
                if amount_usd >= MINT_THRESHOLD:
                    mints.append({
                        "timestamp": ts, 
                        "date": ts_to_date(ts), 
                        "amount": amount_usd, 
                        "chain": "ethereum", 
                        "tx": tx["hash"]
                    })
        
        print(f"  📦 Page {page}: {len(txs)} transfers, {len(mints)} mints found...")
        if hit_date_limit or len(txs) < offset:
            break
        page += 1

    print(f"  ✅ Total Ethereum mint events: {len(mints)}")
    return mints

def fetch_tron_mints(api_key):
    print("\n🔴 Fetching Tron USDT mints from Tronscan...")
    mints = []
    start = 0
    limit = 200 
    start_ts_ms = int(START_DATE.timestamp()) * 1000

    while True:
        url = (f"https://apilist.tronscanapi.com/api/filter/trc20/transfers"
               f"?limit={limit}&start={start}&sort=-timestamp&count=true"
               f"&contract_address={USDT_TRON_CONTRACT}&relatedAddress={TRON_TETHER_MULTISIG}")
        headers = {"TRON-PRO-API-KEY": api_key} if api_key else {}
        time.sleep(0.5)
        data = api_get(url, headers=headers)
        transfers = data.get("token_transfers", [])
        if not transfers: break

        hit_date_limit = False
        for tx in transfers:
            ts_ms = tx.get("block_ts", 0)
            if ts_ms < start_ts_ms:
                hit_date_limit = True
                break
            
            from_addr = tx.get("from_address", "")
            to_addr = tx.get("to_address", "")
            
            if from_addr == TRON_TETHER_MULTISIG and to_addr == TRON_TREASURY:
                amount_usd = int(tx.get("quant", "0")) / 1e6 
                if amount_usd >= MINT_THRESHOLD:
                    mints.append({
                        "timestamp": ts_ms // 1000, 
                        "date": ts_to_date(ts_ms // 1000), 
                        "amount": amount_usd, 
                        "chain": "tron", 
                        "tx": tx.get("transaction_id", "")
                    })
        
        print(f"  📦 Page {start // limit + 1}: {len(transfers)} transfers, {len(mints)} mints found...")
        if hit_date_limit or len(transfers) < limit: break
        start += limit

    print(f"  ✅ Total Tron mint events: {len(mints)}")
    return mints

def fetch_defillama_mints():
    print("\n🦙 Fetching DefiLlama net supply changes...")
    url = "https://stablecoins.llama.fi/stablecoincharts/all?stablecoin=1"
    data = api_get(url)
    mints = []
    prev_supply = None
    target_ts = START_DATE.timestamp()
    for entry in data:
        if "date" not in entry: continue
        date_ts = int(entry["date"])
        if date_ts < target_ts:
            prev_supply = entry.get("totalCirculating", {}).get("peggedUSD", 0)
            continue
        current_supply = entry.get("totalCirculating", {}).get("peggedUSD", 0)
        if prev_supply is not None:
            diff = current_supply - prev_supply
            if diff >= MINT_THRESHOLD:
                mints.append({
                    "date": ts_to_date(date_ts), 
                    "timestamp": date_ts, 
                    "amount": diff, 
                    "circulating_after": current_supply, 
                    "source": "defillama_net"
                })
        prev_supply = current_supply
    print(f"  ✅ DefiLlama net 1B+ events: {len(mints)}")
    return mints

def aggregate_onchain_by_day(mints):
    from collections import defaultdict
    daily = defaultdict(lambda: {"total": 0, "txs": [], "chains": set()})
    for m in mints:
        day = m["date"]
        daily[day]["total"] += m["amount"]
        daily[day]["chains"].add(m["chain"])
        daily[day]["txs"].append(m)
    big_days = []
    for day, info in sorted(daily.items()):
        if info["total"] >= MINT_THRESHOLD:
            big_days.append({
                "date": day, 
                "total_minted": info["total"], 
                "chains": list(info["chains"]), 
                "num_txs": len(info["txs"]), 
                "transactions": [{"amount": t["amount"], "chain": t["chain"], "tx": t["tx"]} for t in info["txs"]]
            })
    return big_days

def main():
    os.environ["ETHERSCAN_API_KEY"] = "JWHCP17895M7IP5EBI3KIH7P4QRI7P1X2E"
    os.environ["TRONSCAN_API_KEY"] = "5903fd32-bf3e-43dd-8a7c-859507372b2c"
    
    eth_key = os.environ.get("ETHERSCAN_API_KEY", "").strip()
    tron_key = os.environ.get("TRONSCAN_API_KEY", "").strip()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    all_onchain = []

    if eth_key: all_onchain.extend(fetch_ethereum_mints(eth_key))
    if tron_key: all_onchain.extend(fetch_tron_mints(tron_key))

    onchain_days = aggregate_onchain_by_day(all_onchain) if all_onchain else []
    defillama_mints = fetch_defillama_mints()

    onchain_path = os.path.join(base_dir, "public", "tether_mints_onchain.json")
    defillama_path = os.path.join(base_dir, "public", "tether_mints_defillama.json")

    with open(onchain_path, "w") as f: json.dump(onchain_days, f, indent=2)
    with open(defillama_path, "w") as f: json.dump(defillama_mints, f, indent=2)
    print("Done! Real data saved to /public")

if __name__ == "__main__":
    main()
