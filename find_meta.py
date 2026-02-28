
import boto3
import os
from botocore.config import Config

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def list_hour_contents():
    # Listing everything in one hour folder to find the metadata file
    prefix = "market_data/20250101/0/"
    print(f"Deep listing {prefix}...")
    
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, RequestPayer='requester')
        if 'Contents' in response:
            files = [obj['Key'] for obj in response['Contents']]
            
            # Filter out l2Book to see what's left
            others = [f for f in files if 'l2Book' not in f and 'trades' not in f]
            
            print(f"Total files: {len(files)}")
            print("Non-book/trade files found:")
            for f in others:
                print(f" - {f}")
                
            if not others:
                print("Only l2Book and trades found. Checking root for other folders...")
                # Maybe it's in a different top-level folder?
                response_root = s3.list_objects_v2(Bucket=BUCKET, Delimiter="/", RequestPayer='requester')
                for p in response_root.get('CommonPrefixes', []):
                    print(f"Root prefix: {p['Prefix']}")
        else:
            print("No contents.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_hour_contents()
