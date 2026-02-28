
import boto3
import os
import lz4.frame
import json
from datetime import datetime, timedelta
import asyncio
from botocore.config import Config

# Configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

# Setup S3 client with Requester Pays enabled
session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def fetch_historical_oi(start_date='20240101'):
    print(f"Fetching historical OI starting from {start_date}...")
    
    # We will sample one hour per day (e.g., hour 0)
    current_date = datetime.strptime(start_date, '%Y%m%d')
    end_date = datetime.utcnow()
    
    history = []
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y%m%d')
        # Path format: market_data/{date}/{hour}/assetCtxs.lz4
        # Note: bucket layout can vary, let's verify if assetCtxs exists
        key = f"market_data/{date_str}/0/assetCtxs.lz4"
        
        try:
            # Check if file exists (head_object)
            # Use RequestPayer='requester'
            s3.head_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
            
            # Download file
            print(f"Downloading {date_str}...", end='\r')
            response = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
            compressed_data = response['Body'].read()
            
            # Decompress
            data = lz4.frame.decompress(compressed_data)
            json_data = json.loads(data)
            
            # json_data is typically a list of snapshots for that hour? 
            # Or just one snapshot? Usually archives are periodic updates.
            # Let's inspect the first element.
            # Usually the archive format is a stream of updates or a list of snapshots.
            # For 'assetCtxs', it might be a list of {time, ... universe ...}
            
            if isinstance(json_data, list) and len(json_data) > 0:
                # Take the first snapshot of the hour
                snapshot = json_data[0] 
                
                # Extract timestamp
                # Note: structure might be different inside the archive compared to API
                # Let's assume it matches API: [meta, assetCtxs] or {universe: ..., ctxs: ...}
                # If it's a list of updates, we need to find the structure.
                
                # Simplified check for now (we might need to adjust after first successful read)
                # Calculating Total OI
                total_oi = 0
                
                # We need to parse the specific format of the archive
                # Often it's a list of objects like: {"time": 123..., "ctxs": [...]}
                # Let's print keys of first object to debug if unsure
                
                # Logic placeholder:
                # for ctx in snapshot['ctxs']:
                #    total_oi += float(ctx['openInterest']) * float(ctx['markPx'])
                
                # timestamp = snapshot['time']
                # history.append({'date': date_str, 'timestamp': timestamp, 'oi': total_oi})
                
                pass # (Actual parsing logic to be refined below)

        except Exception as e:
            # File might not exist for that specific hour or date
            # print(f"Skipping {date_str}: {e}")
            pass
            
        current_date += timedelta(days=1)
        
    print("\nDone.")
    return history

# Quick test to see file structure of one file
def inspect_one_file():
    # Try yesterday
    yesterday = (datetime.utcnow() - timedelta(days=2)).strftime('%Y%m%d')
    key = f"market_data/{yesterday}/0/assetCtxs.lz4"
    
    try:
        print(f"Inspecting {key}...")
        response = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
        data = lz4.frame.decompress(response['Body'].read())
        json_data = json.loads(data)
        
        print("Data type:", type(json_data))
        if isinstance(json_data, list):
            print("List length:", len(json_data))
            if len(json_data) > 0:
                print("First item keys:", json_data[0].keys())
                # print("First item sample:", json.dumps(json_data[0], indent=2)[:500])
        elif isinstance(json_data, dict):
            print("Keys:", json_data.keys())
            
    except Exception as e:
        print(f"Error inspecting: {e}")

if __name__ == "__main__":
    inspect_one_file()
