# SimCo Profit Radar v0.5.0 — Self-check / 自检报告

Date / 日期：2026-07-21

## Scope / 本轮范围

v0.5.0 adds a runtime bilingual interface with English as the default language and Chinese as an immediately switchable option.

v0.5.0 新增运行时中英文双语界面，默认英文，可在不刷新页面、不重新请求数据的情况下立即切换为中文。

## Internationalization checks / 国际化检查

Verified behavior:

- clean installs default to `en`;
- settings migrated from schema versions below 5 default to English;
- the toolbar exposes `English` and `中文`;
- changing the language updates the existing panel without reloading SimCompanies;
- the language choice is saved under the existing extension settings key;
- the choice is restored on future loads;
- controls, routes, diagnostics, status, result tags, confidence labels, profile fields, seasonal fields, detailed calculations, chain tables, and recovery messages are localized;
- cached English warnings can be rendered in Chinese and cached Chinese calculation strings can be rendered in English;
- locale formatting switches between `en-US` and `zh-CN`;
- arbitrary API resource names remain untouched rather than being translated inaccurately.

已验证：

- 干净安装默认 `en`；
- 旧版设置迁移到 schema 5 时默认英文；
- 顶部工具栏提供 `English` 与 `中文`；
- 切换语言不刷新 SimCompanies 页面；
- 语言选择写入原有扩展设置并在后续加载时恢复；
- 控件、路线、诊断、状态、标签、可信度、账号参数、季节信息、计算详情、产业链表格及恢复提示均可切换；
- 已缓存的英文警告可切换成中文，内部中文计算字段可切换成英文；
- 数字和 UTC 日期格式分别采用 `en-US` 与 `zh-CN`；
- API 返回的任意商品名称保持原样，避免不可靠的自动翻译。

## Automated verification / 自动化验证

```text
Node automated tests      64 / 64 passed
JavaScript syntax checks  passed
Failed / skipped          0 / 0
```

Internationalization-specific coverage includes:

- English default and unsupported-language normalization;
- static label and route switching;
- live DOM switching without reload;
- persistence to `chrome.storage.local`;
- dynamic HTTP 429 and account-warning translation;
- fully English industry-chain detail output with no residual Chinese UI labels;
- switching the same chain detail back to Chinese;
- existing lifecycle, cache, network, seasonal, retail, and chain regression coverage.

## Security and packaging / 安全与打包

The extension remains read-only:

- ordinary permission: `storage` only;
- no telemetry;
- no automated production, retail, contract, or exchange actions;
- no remote JavaScript;
- no runtime `eval` or `new Function` (the JSDOM test harness uses `window.eval` only to load local extension modules);
- no POST, PUT, PATCH, or DELETE request implementation;
- `node_modules` is excluded from the release archive.

扩展仍为只读工具：普通权限仅 `storage`，不包含遥测、自动交易/生产操作、远程 JavaScript 或写请求逻辑；发行 ZIP 不包含 `node_modules`。

## Known boundary / 已知边界

The interface is bilingual, but product names supplied by SimCompanies or SimcoTools are displayed as provided. A universal product-name translation layer is intentionally not included because source naming can change and inaccurate translations would reduce auditability.

界面已双语化，但 SimCompanies / SimcoTools 返回的商品名称仍按数据源原文展示。当前没有强行建立全商品名称翻译表，以免名称更新或错误翻译影响审计。
