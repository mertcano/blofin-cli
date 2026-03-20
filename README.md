# blofin-cli

Agent-first CLI for BloFin exchange. Exposes all 30 tools from `blofin-core` as grouped shell commands.

## Installation

```bash
npm install -g blofin-cli
```

## Quick Start

```bash
# Configure API credentials (interactive)
blofin setup

# Get ticker prices (table output by default)
blofin market tickers --instId=BTC-USDT

# JSON output
blofin market tickers --instId=BTC-USDT -o json

# Use demo trading environment
blofin --demo market tickers
```

## Setup

Run the interactive setup wizard to save API credentials to `~/.config/blofin/config.json`:

```bash
blofin setup
```

The wizard prompts for API key, secret key, passphrase, and demo mode preference. Existing values are shown masked (`...xxxx`); press Enter to keep them.

Alternatively, use environment variables (they take priority over the config file):

```bash
export BLOFIN_API_KEY="your-key"
export BLOFIN_API_SECRET="your-secret"
export BLOFIN_PASSPHRASE="your-passphrase"
```

## Usage

```bash
blofin [flags] <group> <subcommand> [--param=value ...]
```

### Market Data (no auth required)

```bash
blofin market tickers --instId=BTC-USDT
blofin market instruments
blofin market orderbook --instId=BTC-USDT --size=20
blofin market candles --instId=BTC-USDT --bar=1H --limit=24
blofin market mark-price --instId=BTC-USDT
blofin market trades --instId=BTC-USDT
blofin market funding-rate --instId=BTC-USDT
```

### Account

```bash
blofin account balance --productType=USDT-FUTURES
blofin account positions
blofin account config
blofin account leverage --instId=BTC-USDT --marginMode=cross          # query
blofin account leverage --instId=BTC-USDT --marginMode=cross --leverage=10  # set
blofin account margin-mode                                             # query
blofin account margin-mode --marginMode=cross                          # set
blofin account position-mode
```

### Trading

```bash
# Dangerous operations require --confirm
blofin trade place --instId=BTC-USDT --side=buy --orderType=market \
  --size=0.01 --marginMode=cross --positionSide=net --confirm

blofin trade cancel --orderId=123456 --confirm

blofin trade close --instId=BTC-USDT --marginMode=cross \
  --positionSide=net --confirm

# Read operations
blofin trade orders --instId=BTC-USDT              # pending orders
blofin trade orders --orderId=123456                # order detail
blofin trade orders --status=filled                 # order history
blofin trade fills --instId=BTC-USDT

# TP/SL and algo orders
blofin trade tpsl --instId=BTC-USDT --side=sell --marginMode=cross \
  --positionSide=net --tpTriggerPrice=55000 --tpOrderPrice=-1 --size=-1
blofin trade tpsl-orders --instId=BTC-USDT
blofin trade cancel-tpsl --tpslId=123456
blofin trade algo --instId=BTC-USDT --orderType=trigger \
  --side=buy --size=0.01 --triggerPrice=50000 --marginMode=cross --positionSide=net
blofin trade algo-orders --orderType=trigger
blofin trade cancel-algo --algoId=123456
```

### Assets

```bash
blofin asset balances --accountType=futures
blofin asset transfer --currency=USDT --fromAccount=funding \
  --toAccount=futures --amount=100 --confirm
blofin asset bills
blofin asset deposits
blofin asset withdrawals
blofin asset apikey-info
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help (global or per-group) |
| `--version` | Show version |
| `-o, --output <format>` | Output format: `table` (default) or `json` |
| `--demo` | Use demo trading environment |
| `--confirm` | Required for dangerous operations |
| `--read-only` | Only expose read-level tools |
| `--modules=<list>` | Comma-separated module filter (e.g. `public,account`) |

## Output Formats

### Table (default)

```
┌────────────┬──────────┬──────────┐
│ instId     │ last     │ vol24h   │
├────────────┼──────────┼──────────┤
│ BTC-USDT   │ 67000.5  │ 12345.67 │
└────────────┴──────────┴──────────┘
```

### JSON (`-o json`)

```json
{
  "tool": "get_tickers",
  "ok": true,
  "data": { "code": "0", "data": [...] },
  "timestamp": 1700000000000
}
```

## Credential Resolution

Priority (highest to lowest):

1. **Environment variables** — `BLOFIN_API_KEY`, `BLOFIN_API_SECRET`, `BLOFIN_PASSPHRASE`
2. **Config file** — `~/.config/blofin/config.json` (created by `blofin setup`)
3. **Defaults** — empty strings (public endpoints only)

The `--demo` flag and `BLOFIN_BASE_URL` env var control which environment is used:

| Condition | Base URL |
|-----------|----------|
| `--demo` flag | `https://demo-trading-openapi.blofin.com` |
| `demo: true` in config | `https://demo-trading-openapi.blofin.com` |
| `BLOFIN_BASE_URL` set | Uses that URL (overrides all) |
| Otherwise | `https://openapi.blofin.com` (production) |

## Command Groups

| Group | Description | Subcommands |
|-------|-------------|-------------|
| `market` | Market data (public) | `instruments`, `tickers`, `orderbook`, `trades`, `candles`, `mark-price`, `funding-rate` |
| `account` | Account information | `balance`, `positions`, `config`, `leverage`, `margin-mode`, `position-mode` |
| `trade` | Trading operations | `place`, `cancel`, `close`, `orders`, `tpsl`, `cancel-tpsl`, `tpsl-orders`, `algo`, `cancel-algo`, `algo-orders`, `fills` |
| `asset` | Asset management | `balances`, `transfer`, `bills`, `deposits`, `withdrawals`, `apikey-info` |
