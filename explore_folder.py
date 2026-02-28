
import boto3
import os

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def explore_hour_folder():
    # If assetCtxs.lz4 isn't there, what IS there besides l2Book?
    prefix = "market_data/20250101/0/"
    print(f"Listing all objects in {prefix}...")
    
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, RequestPayer='requester', MaxKeys=100)
        for obj in response.get('Contents', []):
            print(obj['Key'])
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    explore_hour_folder()
