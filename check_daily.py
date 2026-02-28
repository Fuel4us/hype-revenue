
import boto3
import os
import lz4.frame
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

def fetch_total_oi_for_hour(date_str, hour=0):
    # Since we only have l2Book, we might not have global state (assetCtxs) in the hourly folder.
    # But wait, the list was truncated. It's possible assetCtxs is at the end or beginning.
    
    # Let's check specifically for: market_data/20250101/0/assetCtxs.lz4
    # Oh wait, the previous `head_object` check failed for that key. 
    
    # Maybe it's named differently? 
    # Or maybe it's not in the hourly folder?
    
    # Let's check "market_data/20250101/" non-recursively to see if there are daily files.
    print(f"Checking daily root for {date_str}...")
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=f"market_data/{date_str}/", Delimiter="/", RequestPayer='requester')
        if 'Contents' in response:
            for obj in response['Contents']:
                print(f"File in daily root: {obj['Key']}")
        
        # If assetCtxs is missing, we might have to use trade data or something else, 
        # but calculating Total OI from L2 books isn't possible (L2 is orders, not positions).
        
        # We need "assetCtxs" or "meta". 
        # Let's check if there is any other folder structure.
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_total_oi_for_hour("20250101")
