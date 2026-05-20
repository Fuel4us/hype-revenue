import os
import json
import requests
from datetime import datetime, timedelta

def fetch_live():
    url = "https://api.hyperliquid.xyz/info"
    payload = {"type": "metaAndAssetCtxs"}
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        asset_ctxs = data[1]
        total_oi = 0
        for ctx in asset_ctxs:
            oi = float(ctx.get('openInterest', 0))
            price = float(ctx.get('markPx', 0))
            total_oi += oi * price
            
        # The cron runs at 00:05 UTC. Since the daily file is considered the "start of day" state, 
        # and we want to record yesterday's ending state as today's starting state... wait. 
        # If it runs at 00:05 UTC on March 10th, it is the start of March 10th. So date should be March 10th.
        # But maybe we want the previous day's data if it's meant to be "Close of day"?
        # Actually, in build_history.py the timestamp 00:00:00 is labeled as the current date.
        # So fetching at 00:05 UTC means we are grabbing the current date's 00:00 equivalent!
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        
        history_path = 'public/oi_history.json'
        
        history = []
        if os.path.exists(history_path):
            with open(history_path, 'r') as f:
                try:
                    history = json.load(f)
                except Exception:
                    pass
            
        # Check if today already exists, if so update it, else append
        existing = next((item for item in history if item["date"] == date_str), None)
        if existing:
            existing["total_oi"] = total_oi
        else:
            history.append({
                "date": date_str,
                "total_oi": total_oi
            })
            
        # Sort history by date just in case
        history.sort(key=lambda x: x["date"])
        
        with open(history_path, 'w') as f:
            json.dump(history, f)
            
        print(f"Successfully saved live OI for {date_str}: ${total_oi:,.2f}")
        
    except Exception as e:
        print(f"Error fetching live OI: {e}")

if __name__ == "__main__":
    fetch_live()