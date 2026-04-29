import yfinance as yf
import pandas as pd
import os

INTERVAL_MAP = {
    "1d": "1d",
    "1h": "60m",
    "5m": "5m"
}


# 1. FETCH — download one ticker at a time to avoid MultiIndex columns
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
            auto_adjust=True,
            progress=False,
        )

        # FIX: newer yfinance always returns MultiIndex columns even for
        # a single ticker — e.g. ('Close', 'AAPL'). Take only level 0 (the
        # price field name) and lowercase it.
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [level0.lower() for level0, level1 in df.columns]
        else:
            df.columns = [c.lower() for c in df.columns]

        # Drop adj close if it leaks through
        df = df.drop(columns=[c for c in df.columns if "adj" in c], errors="ignore")

        # Reset index so date/datetime becomes a column
        df = df.reset_index()

        # Unify date column name
        date_col = df.columns[0]
        if date_col != "date":
            df = df.rename(columns={date_col: "date"})

        df["ticker"] = asset
        data[asset] = df

    return data

# 2. COMBINE
def combine_assets(data_dict):
    df = pd.concat(data_dict.values(), ignore_index=True)
    df.columns = [c.lower() for c in df.columns]
    if "asset" in df.columns:
        df = df.rename(columns={"asset": "ticker"})
    return df


# 3. PREPROCESS + FEATURES
def preprocess_data(df, include_vix=True, start_date=None, end_date=None):
    df.columns = [c.lower() for c in df.columns]

    if "asset" in df.columns:
        df = df.rename(columns={"asset": "ticker"})

    if "date" not in df.columns:
        raise ValueError(f"'date' column missing. Columns: {list(df.columns)}")

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["date", "ticker"]).reset_index(drop=True)

    # PRICE MATRIX
    prices = df.pivot(index="date", columns="ticker", values="close")
    prices = prices.dropna(how="all")   # drop rows where ALL tickers are NaN
                                        # do NOT dropna() fully — some tickers
                                        # may have started trading later

    # FEATURES — keep NaNs during rolling warmup (matches expected output)
    returns    = prices.pct_change()
    volatility = returns.rolling(21).std()
    momentum   = returns.rolling(21).sum()
    sma_ratio  = prices / prices.rolling(21).mean()

    feature_dict = {
        "return":     returns,
        "volatility": volatility,
        "momentum":   momentum,
        "sma_ratio":  sma_ratio,
    }

    df_wide = pd.concat(feature_dict.values(), axis=1, keys=feature_dict.keys())

    # FIX: after stack(), index level names are already "date" and "ticker"
    # in modern pandas — don't blindly rename level_0/level_1
    df_final = df_wide.stack(level=1, future_stack=True).reset_index()

    # Normalize whatever pandas named the index columns
    col_map = {}
    for col in df_final.columns:
        if col in ("level_0", "date"):
            col_map[col] = "date"
        elif col in ("level_1", "ticker"):
            col_map[col] = "ticker"
    df_final = df_final.rename(columns=col_map)

    # VIX
    if include_vix:
        try:
            vix_start = start_date or str(prices.index.min().date())
            vix_end   = end_date   or str(prices.index.max().date())

            vix_raw = yf.download(
                "^VIX",
                start=vix_start,
                end=vix_end,
                auto_adjust=True,
                progress=False
            )

            # FIX: yfinance may return MultiIndex columns for VIX too
            if isinstance(vix_raw.columns, pd.MultiIndex):
                vix_raw.columns = ['_'.join([p for p in parts if p]).lower()
                                   for parts in vix_raw.columns]
            else:
                vix_raw.columns = [c.lower() for c in vix_raw.columns]

            # grab the close column (could be "close" or "close_^vix")
            close_col = [c for c in vix_raw.columns if "close" in c][0]
            vix = vix_raw[close_col].squeeze()  # ensure Series

            vix.index = pd.to_datetime(vix.index)
            vix = vix.reindex(prices.index).ffill()

            vix_z = (vix - vix.rolling(60).mean()) / vix.rolling(60).std()
            vix_z.index.name = "date"

            vix_df = vix_z.rename("vix_z").reset_index()
            vix_df["date"] = pd.to_datetime(vix_df["date"])

            df_final = df_final.merge(vix_df, on="date", how="left")

        except Exception as e:
            print(f"[VIX skipped] {e}")

    # FIX: do NOT dropna() here — early rows have NaN rolling features
    # and that matches the expected output. Only drop rows with no return at all.
    df_final = df_final.dropna(subset=["return"])

    df_final = df_final.sort_values(["date", "ticker"]).reset_index(drop=True)

    return df_final


def save_dataset(df, dataset_id):
    os.makedirs("datasets", exist_ok=True)
    file_path = f"datasets/dataset_{dataset_id}.parquet"
    df.to_parquet(file_path, index=False)
    return file_path


def build_dataset(dataset):
    raw_data = fetch_stock_data(
        assets=dataset.assets,
        start_date=dataset.start_date,
        end_date=dataset.end_date,
        frequency=dataset.frequency
    )
    df = combine_assets(raw_data)
    df = preprocess_data(
        df,
        include_vix=True,
        start_date=dataset.start_date,
        end_date=dataset.end_date,
    )
    return save_dataset(df, dataset.id)