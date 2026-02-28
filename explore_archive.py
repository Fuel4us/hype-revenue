
import boto3
from botocore import UNSIGNED
from botocore.config import Config
from datetime import datetime, timedelta
import os

# Configure S3 client for public bucket access
s3 = boto3.client('s3', config=Config(signature_version=UNSIGNED))
BUCKET = "hyperliquid-archive"

def check_bucket_structure():
    print("Checking bucket structure...")
    
    # Check for a recent date to see what's available
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y%m%d')
    prefix = f"market_data/{yesterday}/"
    
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, MaxKeys=50)
        
        if 'Contents' not in response:
            print(f"No data found for prefix: {prefix}")
            # Try an older date just in case
            prefix = "market_data/20240101/"
            response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, MaxKeys=50)
        
        if 'Contents' in response:
            print(f"\nFound {len(response['Contents'])} objects. First 10:")
            for obj in response['Contents'][:10]:
                print(f" - {obj['Key']} ({obj['Size']} bytes)")
                
            # Check specifically for assetCtxs or similar global state files
            # The user code was looking for 'l2Book', but we want Open Interest which is usually in assetCtxs
            print("\nSearching for 'assetCtxs' or global state files...")
            
            # List "top level" folders inside a specific hour
            # e.g. market_data/20240101/0/
            sample_hour_prefix = os.path.dirname(response['Contents'][0]['Key']) + "/"
            response_hour = s3.list_objects_v2(Bucket=BUCKET, Prefix=sample_hour_prefix, Delimiter="/")
            
            if 'CommonPrefixes' in response_hour:
                print("Subfolders found in hour directory:")
                for pre in response_hour['CommonPrefixes']:
                    print(f" - {pre['Prefix']}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_bucket_structure()
