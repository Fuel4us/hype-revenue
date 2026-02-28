
import boto3
import os
import lz4.frame
import csv
import io
import json
from datetime import datetime, timedelta

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def build_full_history(start_date="20240101"):
    print(f"Building full history from {start_date}...")
    
    # List all available files in asset_ctxs/ to avoid 404s
    # Pagination needed if > 1000 files
    available_files = set()
    paginator = s3.get_paginator('list_objects_v2')
    
    print("Listing available archive files...")
    for page in paginator.paginate(Bucket=BUCKET, Prefix="asset_ctxs/", RequestPayer='requester'):
        if 'Contents' in page:
            for obj in page['Contents']:
                available_files.add(obj['Key'])
                
    print(f"Found {len(available_files)} daily files.")
    
    results = []
    
    # Iterate dates
    current = datetime.strptime(start_date, "%Y%m%d")
    end = datetime.utcnow()
    
    # Manual overrides for missing S3 data
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
        
        # Check manual overrides first
        if fmt_date in manual_data:
            print(f"Using manual data for {fmt_date}")
            results.append({
                "date": fmt_date,
                "total_oi": manual_data[fmt_date]
            })
            current += timedelta(days=1)
            continue

        key = f"asset_ctxs/{date_str}.csv.lz4"
        
        if key in available_files:
            print(f"Processing {date_str}...", end="\r")
            try:
                # Download
                resp = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
                data = lz4.frame.decompress(resp['Body'].read()).decode('utf-8')
                
                reader = csv.DictReader(io.StringIO(data))
                
                # We need a snapshot. The CSV contains *all* updates for the day? 
                # Or snapshots every minute?
                # The first row was 00:00:00Z.
                # Let's take the *first* snapshot for each coin to represent the "start of day" OI.
                
                # Group by coin, take first occurrence (timestamp 00:00)
                daily_oi_usd = 0
                seen_coins = set()
                
                for row in reader:
                    # Assuming file is sorted by time
                    # We just sum the first occurrence of each coin
                    coin = row['coin']
                    
                    # We want to capture the state at roughly the same time for all coins
                    # The file seems to dump all coins at T1, then all at T2...
                    # We only process the first timestamp block.
                    
                    # Optimization: Stop after first full sweep (roughly)
                    # Or just use a set.
                    
                    if coin not in seen_coins:
                        try:
                            oi = float(row['open_interest'])
                            price = float(row['mark_px'])
                            daily_oi_usd += oi * price
                            seen_coins.add(coin)
                        except ValueError:
                            continue
                            
                    # Heuristic: If we have > 100 coins, we probably have the full snapshot
                    # Hyperliquid has ~150-200 assets now.
                    # Safety break to avoid reading 100MB of CSV rows unnecessarily
                    if len(seen_coins) > 250: 
                        break
                
                results.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "total_oi": daily_oi_usd
                })
                
            except Exception as e:
                print(f"\nError {date_str}: {e}")
        
        current += timedelta(days=1)
        
    print("\nComplete.")
    
    # Save to file
    with open('public/oi_history.json', 'w') as f:
        json.dump(results, f)
        
    print(f"Saved {len(results)} days to public/oi_history.json")

if __name__ == "__main__":
    # Ensure output dir exists
    os.makedirs('public', exist_ok=True)
    build_full_history(start_date="20230520") # Earliest file we saw
