
import boto3
import os
from botocore.config import Config
from datetime import datetime, timedelta

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def list_files():
    # Try to find *any* file to understand the structure
    # Checking a known past date (e.g. late 2024 or early 2025)
    # The error "NoSuchKey" suggests 20260226 might not be uploaded yet (monthly uploads?)
    
    # Let's check 2025-01-01
    prefix = "market_data/20250101/"
    print(f"Listing {prefix}...")
    
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, RequestPayer='requester', MaxKeys=20)
        if 'Contents' in response:
            for obj in response['Contents']:
                print(obj['Key'])
        else:
            print("No contents found for that date.")
            
            # Try exploring root "market_data"
            print("Listing root market_data/...")
            response = s3.list_objects_v2(Bucket=BUCKET, Prefix="market_data/", Delimiter="/", RequestPayer='requester', MaxKeys=20)
            if 'CommonPrefixes' in response:
                print("Found date folders:")
                for p in response['CommonPrefixes']:
                    print(p['Prefix'])
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_files()
