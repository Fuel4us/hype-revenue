
import boto3
import os
import lz4.frame
import csv
import io
from datetime import datetime, timedelta

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
BUCKET = "hyperliquid-archive"

session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
s3 = session.client('s3')

def process_daily_csv_lz4():
    # We found files like 'asset_ctxs/20230520.csv.lz4'
    # This looks like daily aggregates! Perfect.
    
    # Let's try to get a recent one (e.g., from 2024 or 2025)
    # Since we can't easily guess the *last* date without listing all,
    # let's try a specific recent date we know might exist.
    
    date_str = "20240101" 
    key = f"asset_ctxs/{date_str}.csv.lz4"
    
    print(f"Downloading {key}...")
    
    try:
        response = s3.get_object(Bucket=BUCKET, Key=key, RequestPayer='requester')
        data = lz4.frame.decompress(response['Body'].read())
        
        # Parse CSV
        text_data = data.decode('utf-8')
        reader = csv.reader(io.StringIO(text_data))
        
        # Read header
        header = next(reader)
        print("Header:", header)
        
        # Read first row
        first_row = next(reader)
        print("First row:", first_row)
        
        # We need to sum up Open Interest for the whole day (or take avg?)
        # Let's see what columns we have.
        # Likely: timestamp, coin, markPx, openInterest, ...
        
        # Map columns
        col_map = {name: i for i, name in enumerate(header)}
        
        if 'open_interest' in col_map and 'mark_px' in col_map:
            print("Found OI and Price columns!")
        else:
            print("Columns available:", col_map.keys())

    except Exception as e:
        print(f"Error: {e}")
        # If 20240101 fails, we might need to list to find valid dates
        # but let's try this first.

if __name__ == "__main__":
    process_daily_csv_lz4()
