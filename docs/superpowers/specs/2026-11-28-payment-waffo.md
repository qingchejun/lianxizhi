# 收款方案：完整版年卡走 Waffo（2026-11-28 草案，待站长定）

## 结论

1. Aship 的模板 `~/coding/template-shipany-ai` 已经接好了 Waffo（`src/core/payment/waffo.ts`，用官方 SDK `@waffo/pancake-ts` 0.18，含下单、回调验签、退款、订阅、查单补单，带测试）。
2. 但纸和笔是纯静态页 + Cloudflare Pages Functions + D1，没有 npm 构建，模板代码不能直接搬。**照模板的做法，把用得到的那一小块（一次性下单、回调验签、查单、退款）用浏览器标准加密接口（WebCrypto）重写成一个文件 `server/waffo.js`**，不引 SDK（SDK 用的是 Node 的 crypto，Pages Functions 里能不能跑要开兼容开关，还多一层不确定）。签名规则从 SDK 源码里看清楚了，很短：
   1. 请求：`POST\n路径\n秒级时间戳\nbase64(sha256(body))` 用商户私钥 RSA-SHA256 签名，放 `X-Merchant-Id / X-Timestamp / X-Signature` 头；`X-Idempotency-Key = sha256(商户号:路径:body[:时间窗])`。
   2. 回调：头 `X-Waffo-Signature: t=毫秒,v1=base64`，对 `t + "." + 原文` 用 Waffo 公钥（SDK 里写死了正式、测试两把）验 RSA-SHA256，5 分钟内有效。
   3. 测试时拿模板里装好的 SDK 当「标准答案」交叉验证：同一个请求两边签出来一样、SDK 能验过我们造的回调。

## 卖什么（沿用 11-25 站长定的）

1. 完整版**年卡，一次性付款，不自动续费**。早鸟价 99 元/年，人民币标价。
2. 续费 = 再买一张，到期日在原来的基础上往后加一年（没到期就接着加，过期了从付款那天算）。
3. 邀请码账号（永久完整版）不显示购买按钮。7 天体验照旧。

## 付款流程

1. 家长登录后，在完整版说明页（现在写「付费开通 2027 年 1 月上线」那块）点「开通完整版 · 99 元/年」。
2. 服务器建一条订单（订单号自己生成），调 Waffo 建收银台会话：商品 = Waffo 后台建好的「纸和笔完整版年卡」，`priceSnapshot` 写死 CNY 99、`buyerIdentity` = 账号 id、`buyerEmail`、`orderMerchantExternalId` = 订单号、`successUrl` = 付款完成页、中文收银台。
3. 跳到 Waffo 收银台付款（支付宝、微信、银行卡；11-27 调研：微信每个买家每月上限约 1000 元，对 99 元无影响）。
4. 付完跳回「付款完成」页，页面每隔几秒问一次服务器「这笔到了没」。
5. 到账以 Waffo 回调 `order.completed`（验签通过）为准：订单记为已付，账号 `full_until` 加一年。回调丢了的兜底：付款完成页问服务器时，服务器按订单号去 Waffo 查（GraphQL `payments(orderMerchantExternalId)`），查到已付同样开通。同一笔只开通一次（按 Waffo 付款号去重）。
6. 开通后发一封邮件（Resend 已接）：「完整版已开通，到期日 X」，附退款说明。

## 数据

新表 `orders`（正式库迁移，**先备份、先问站长再跑**，只新增表不改旧表）：

| 列 | 说明 |
|---|---|
| id | 订单号 |
| uid | 账号 |
| amount / currency | 9900 / CNY（按分存） |
| status | pending / paid / refunded / failed |
| waffo_payment_id | Waffo 付款号，去重用 |
| days | 这单加了几天（365） |
| created_at / paid_at / refunded_at | 时间 |

## 退款

1. 建议写明：**付款 7 天内不满意，发邮件全额退款**；过了 7 天不退（一次性年卡，常见做法）。
2. 管理页（admin.html 已有账号列表）加「退款」按钮：调 Waffo 退款接口（refund-ticket），成功后订单记退款、`full_until` 减回这一单的天数。

## 上线前要补的

1. 用户协议、退款说明：建议放进现有的 privacy 页旁边做一页 `/terms`（不放进站点地图、noindex，因为是新页面，按规矩先问站长）。
2. Waffo 要求在后台申报网站、写清退款政策和商品说明。
3. 11-23 调研留下的两个风险还没处理：识字字表、视频背景音乐的版权；收费以后这两样要先过一遍。

## 站长要做的（只有你能做）

1. Waffo 后台：给纸和笔单独建一个店铺（store），按「一站一个收款」的规矩不和别的站混用；申报网站 zhihebi.com。
2. 生成 API 密钥（商户号 + 私钥），用剪贴板交给我灌进 Cloudflare 密钥，不落盘、不进聊天记录。
3. 商品和回调地址我可以用接口建（SDK 里有建商品、加回调的接口），也可以你在后台点；回调地址是 `https://zhihebi.com/api/pay/waffo`。

## 实施步骤（站长同意后）

1. 测试环境先走通：`server/waffo.js` + 测试（对照 SDK）→ `/api/pay/create`、`/api/pay/status`、`/api/pay/waffo` 三个接口 → 付款完成页 → 管理页退款。用 Waffo 测试模式真付一笔、退一笔。
2. 正式库迁移（备份、问站长）→ 上线 → 站长自己真付 99 元走一遍再退掉。
3. 完整版说明页、首页、帮助、更新记录改文案；小红书首发前把 「开通时通知我」名单里的人发邮件通知。
