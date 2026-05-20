import urllib.request
import json
url = "https://apilist.tronscanapi.com/api/filter/trc20/transfers?limit=200&start=0&sort=-timestamp&count=true&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&relatedAddress=TBPxhVAsuzoFnKyXtc1o2UySEydPHgATto"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())

mints = []
for tx in data.get("token_transfers", []):
    amt = int(tx["quant"]) / 1e6
    if amt >= 800_000_000:
        if tx["from_address"] == "TBPxhVAsuzoFnKyXtc1o2UySEydPHgATto":
            mints.append((tx["from_address"], tx["to_address"], amt))
print("Large transfers FROM Tron Multisig:", len(mints))
if mints:
    print(mints[:2])
