# SimCo Profit Radar v0.4.1

A read-only Chrome / Edge Manifest V3 extension for SimCompanies. It ranks production, retail, and multi-stage make-or-buy industry chains by **PPHPL** (net profit per hour per building level).

> 非官方 SimCompanies 社区工具；仅进行只读数据分析，不执行自动交易、生产或其他游戏操作。

## Download

- [Download v0.4.1](dist/simco-profit-radar-v0.4.1.zip)
- [SHA-256](dist/simco-profit-radar-v0.4.1.sha256)

The ZIP contains the complete extension source, tests, documentation, and installable files.

## Features

- Production → Exchange
- Exchange purchase → Retail
- Production → Retail
- Optimized multi-stage chain → Exchange
- Optimized multi-stage chain → Retail
- Recursive make-or-buy optimization across upstream inputs
- Seasonal production and retail handling
- Summer weather, Pumpkin seasonality, Tree quality mechanics, and ice-cream decay
- Current account production/sales modifiers and acceleration
- Rate-limit-safe loading with 429 cooldown and stale-cache fallback
- Read-only GET requests; no telemetry or automated game actions

## Install

1. Download and unzip the release ZIP.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select the extracted `simco-profit-radar` folder.
6. Refresh SimCompanies and open **利润雷达**.

## Development

The source and tests are included in the ZIP. After extraction:

```bash
npm ci
npm test
npm run check
```

The v0.4.1 release passed 59 automated tests and JavaScript syntax checks. See [SELF_CHECK.md](SELF_CHECK.md) for the detailed validation report.

## Limitations

The optimizer is a steady-state operating model. It does not fully model integer building layouts, construction capital, order-book depth, inventory timing, or company-wide multi-product portfolio optimization.

## License

MIT. See [LICENSE](LICENSE).
