import yfinance as yf
import pandas as pd
import os


INTERVAL_MAP = {
    "1d": "1d",
    "1h": "60m",
    "5m": "5m"
}

def fetch_stock_data(assets, start_date, end_date, frequency):
    data = {}

    interval = INTERVAL_MAP.get(frequency)

    if not interval:
        raise ValueError(f"Unsupported frequency: {frequency}")
    
    for asset in assets:
        df = yf.download(
            asset,
            start=start_date,
            end=end_date,
            interval=interval,
            progress=False
        )

        df["asset"] = asset
        data[asset] = df

    return data

def combine_assets(data_dict):
    df = pd.concat(data_dict.values())
    df.reset_index(inplace=True)
    return df

def preprocess_data(df):
    df = df.sort_values(by=["Date", "asset"])

    # Forward fill missing values
    df = df.ffill()

    # Optional: normalize prices (later)
    # df["Close"] = df.groupby("asset")["Close"].transform(lambda x: x / x.iloc[0])

    return df

def save_dataset(df, dataset_id):
    os.makedirs("datasets", exist_ok=True)

    file_path = f"datasets/dataset_{dataset_id}.parquet"

    df.to_parquet(file_path)

    return file_path


def build_dataset(dataset):

    raw_data = fetch_stock_data(
        assets=dataset.assets,
        start_date=dataset.start_date,
        end_date=dataset.end_date,
        frequency=dataset.frequency
    )

    df = combine_assets(raw_data)
    df = preprocess_data(df)

    file_path = save_dataset(df, dataset.id)

    return file_path
