import boto3
import os
import lz4.frame
import csv
import io
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def build_full_history(start_date="20230520"):
    print(f"Building full history from {start_date}...")
    
    # List all available files in asset_ctxs/ to avoid 404s
    available_files = set()
    paginator = s3.get_paginator('list_objects_v2')
    
    print("Listing available archive files...")
    for page in paginator.paginate(Bucket=BUCKET, Prefix="asset_ctxs/", RequestPayer='requester'):
        if 'Contents' in page:
            for obj in page['Contents']:
                available_files.add(obj['Key'])
                
    print(f"Found {len(available_files)} daily files.")
    
    # Load existing history to preserve live-fetched days that aren't in S3 yet
    history_file = 'public/oi_history.json'
    existing_history = {}
    if os.path.exists(history_file):
        with open(history_file, 'r') as f:
            try:
                data = json.load(f)
                for item in data:
                    existing_history[item["date"]] = item["total_oi"]
            except Exception:
                pass

    # Iterate dates
    current = datetime.strptime(start_date, "%Y%m%d")
    end = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # Manual overrides for missing S3 data (used only as fallback)
    manual_data = {
        "2026-02-22": 4_440_000_000,
        "2026-02-23": 4_320_000_000,
        "2026-02-24": 4_360_000_000,
        "2026-02-25": 4_480_000_000,
        "2026-02-26": 4_520_000_000,
        "2026-02-27": 4_290_000_000,
        "2026-02-28": 4_490_000_000,
    }

    while current <= end:
        date_str = current.strftime("%Y%m%d")
        fmt_date = current.strftime("%Y-%m-%d")
        
        key = f"asset_ctxs/{date_str}.csv.lz4"
        
        if key in available_files:
            print(f"Processing {date_str}...", end="\r")
            try:
                resp = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
                data = lz4.frame.decompress(resp['Body'].read()).decode('utf-8')
                
                reader = csv.DictReader(io.StringIO(data))
                
                daily_oi_usd = 0
                seen_coins = set()
                
                for row in reader:
                    coin = row['coin']
                    if coin not in seen_coins:
                        try:
                            oi = float(row['open_interest'])
                            price = float(row['mark_px'])
                            daily_oi_usd += oi * price
                            seen_coins.add(coin)
                        except ValueError:
                            continue
                            
                    if len(seen_coins) > 250: 
                        break
                
                existing_history[fmt_date] = daily_oi_usd
                
            except Exception as e:
                print(f"\nError {date_str}: {e}")
                
        else:
            # S3 is missing this day
            if fmt_date not in existing_history and fmt_date in manual_data:
                # Use manual override if we don't even have a live-fetched value
                print(f"Using manual data for {fmt_date}")
                existing_history[fmt_date] = manual_data[fmt_date]
        
        current += timedelta(days=1)
        
    print("\nComplete.")
    
    # Convert dict to sorted list
    results = [{"date": d, "total_oi": oi} for d, oi in existing_history.items()]
    results.sort(key=lambda x: x["date"])
    
    with open(history_file, 'w') as f:
        json.dump(results, f)
        
    print(f"Saved {len(results)} days to public/oi_history.json")

if __name__ == "__main__":
    os.makedirs('public', exist_ok=True)
    # Only fetch the last 30 days to save AWS egress costs (S3 Requester Pays)
    from datetime import datetime, timedelta, timezone
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y%m%d")
    build_full_history(start_date=thirty_days_ago)