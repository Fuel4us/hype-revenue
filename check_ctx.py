
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

def check_asset_ctxs():
    # We found l2Book, but do we have assetCtxs?
    # Trying same date/hour but different file
    date_str = "20250101"
    key = f"market_data/{date_str}/0/assetCtxs.lz4"
    
    print(f"Checking for {key}...")
    try:
        response = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
        print("Found assetCtxs! Decompressing...")
        
        data = lz4.frame.decompress(response['Body'].read())
        json_data = json.loads(data)
        
        if isinstance(json_data, list) and len(json_data) > 0:
            print("Successfully parsed snapshot list.")
            print("First snapshot sample keys:", json_data[0].keys())
            
            # Check for Open Interest in the universe/ctxs
            # Assuming structure: { "universe": [...], "ctxs": [...] } or similar inside the snapshot
            snapshot = json_data[0]
            # print(json.dumps(snapshot, indent=2)[:500]) 
            
            # Quick check if we can calculate total OI
            # Usually ctxs or universe has the state
            
            # The structure from API is [meta, assetCtxs], but here it might be different
            # If it's a list of updates, we need to see the schema.
            
            print("Sample content structure:")
            if 'universe' in snapshot:
                print(" - Found 'universe'")
            if 'ctxs' in snapshot:
                print(" - Found 'ctxs'")
            elif isinstance(snapshot, list):
                 print(" - Is a list")
            
        else:
            print("Empty or invalid JSON.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_asset_ctxs()
