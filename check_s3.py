import boto3
from botocore import UNSIGNED
from botocore.config import Config
import lz4.frame
import json
import os
from datetime import datetime, timedelta

BUCKET = "hyperliquid-archive"
S3_CLIENT = boto3.client('s3', config=Config(signature_version=UNSIGNED))

def get_latest_data(asset):
    # Try to find recent data. We'll check yesterday's date.
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y%m%d')
    
    # We need asset contexts to get Open Interest, not L2 Book.
    # Checking if 'assetCtxs' is available in the archive.
    # The structure is usually market_data/{date}/{hour}/assetCtxs.lz4 (conjecture, checking...)
    
    # Actually, the user script referenced 'l2Book'. 
    # Let's list objects in the bucket to see what's available.
    try:
        response = S3_CLIENT.list_objects_v2(Bucket=BUCKET, Prefix=f"market_data/{yesterday}/", MaxKeys=20)
        if 'Contents' in response:
            print(f"Found data for {yesterday}:")
            for obj in response['Contents']:
                print(obj['Key'])
        else:
            print(f"No data found for {yesterday}")
            
    except Exception as e:
        print(f"Error listing objects: {e}")

get_latest_data("HYPE")
