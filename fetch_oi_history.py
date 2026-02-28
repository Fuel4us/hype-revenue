
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

def fetch_asset_ctxs_history():
    print("Found 'asset_ctxs/' root folder! exploring...")
    
    # Check structure inside asset_ctxs/
    # Typically: asset_ctxs/{date}/{hour}.lz4 or similar?
    prefix = "asset_ctxs/"
    
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, Delimiter="/", RequestPayer='requester', MaxKeys=20)
        
        # It might be dated folders like asset_ctxs/20240101/
        if 'CommonPrefixes' in response:
            print("Date folders found:")
            for p in response['CommonPrefixes'][:5]:
                print(f" - {p['Prefix']}")
                
            # Pick one date to drill down
            sample_date = response['CommonPrefixes'][0]['Prefix']
            print(f"Drilling into {sample_date}...")
            
            resp_date = s3.list_objects_v2(Bucket=BUCKET, Prefix=sample_date, RequestPayer='requester', MaxKeys=10)
            if 'Contents' in resp_date:
                files = [obj['Key'] for obj in resp_date['Contents']]
                print("Files found:", files)
                
                # Try to download and parse one
                if files:
                    target = files[0]
                    print(f"Downloading {target}...")
                    obj = s3.get_object(Bucket=BUCKET, Key=target, RequestPayer='requester')
                    data = lz4.frame.decompress(obj['Body'].read())
                    json_data = json.loads(data)
                    
                    print("Parsed successfully!")
                    if isinstance(json_data, list) and len(json_data) > 0:
                        print("Sample keys:", json_data[0].keys())
                        # Check for universe/coin info
                        # We expect Open Interest here
                        
                        # Example calculation test
                        total_oi = 0
                        snapshot = json_data[0]
                        # Assuming it's the [meta, ctxs] format or similar
                        # Let's print structure hints
                        print("Snapshot type:", type(snapshot))
                        # print(json.dumps(snapshot, indent=2)[:500])
                        
        else:
            # Maybe flat files?
            if 'Contents' in response:
                print("Flat files found:", [o['Key'] for o in response['Contents'][:5]])

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_asset_ctxs_history()
