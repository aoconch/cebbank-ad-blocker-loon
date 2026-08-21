# 光大银行 AD Blocker for Loon

屏蔽 **光大银行 App**（手机银行）的开屏广告、首页弹窗广告与主视图公告下方推广内容。基于 **2026-08-21 iPhone 真机抓包（HAR）** 校准，规则对准真实流量而非猜���。

## 真机定位到的广告来源

| 广告来源 | 真实接口 | 处理方式 |
|---------|---------|---------|
| 开屏广告（每次启动弹的推广图） | `static.cebbank.com/.../layouts/KPPage.json` → `ContentJson.ClientNoticeList`（`advertImg`+`detailUrl`） | MITM 脚本清空 |
| 首页弹窗广告 | 同 `KPPage.json` → `ContentJson.HomePopList`（`picurl`+`detailurl`） | MITM 脚本清空 |
| 主视图公告下方推广（轮播图/精选卡） | 同域 `layouts/*Page.json` 下 `bannerList`/`recommendList`/`noticeList` 等数组 | MITM 脚本兜底清空 |
| 埋点 / 统计 | `datafinder.cebbank.com` | `[Rule]` REJECT |

> 关键点：**不拦截 `static.cebbank.com` 域名本身** —— 它承载 App 全部原生布局配置与功能图片，整域 REJECT 会导致功能卡片缺失。正确做法是脚本改写 JSON，只清掉广告条目、保留结构。

## 文件

- `CEB-AD-Blocker.plugin` — Loon 插件（含 `[Rule]`/`[Mitm]`/`[Script]`）
- `cebbank_remove_ads.js` — MITM 响应脚本：清空开屏 / 弹窗 / 推广数组

## 安装（Loon 一键导入）

**推荐：commit 固定地址（不走 CDN 缓存，永远拿到确切版本）**

```
https://cdn.jsdelivr.net/gh/aoconch/cebbank-ad-blocker-loon@<COMMIT_SHA>/CEB-AD-Blocker.plugin
```

Loon 操作：配置 → 插件 → `+` → 通过 URL 添加 → 粘贴上面地址 → 启用。
若之前装过旧版，先左滑删除旧插件再添加（Loon 插件缓存按 URL 区分，新 URL = 重新拉取）。

备用地址（raw.githubusercontent，需要代理可直连 GitHub）：
`https://raw.githubusercontent.com/aoconch/cebbank-ad-blocker-loon/main/CEB-AD-Blocker.plugin`

> ⚠️ 不要用 `@main` 的 jsDelivr 地址：jsDelivr 对 `@main` 有约 45 分钟的更新节流，会出现"仓库已更新但手机还跑旧脚本"的假象。

安装后：Loon → 工具 → MitM 开启（主机名已含 `static.cebbank.com`）→ 安装并信任证书 → 打开光大银行 App。

## 怎么确认插件真的生效了

脚本会给每条被处理的响应打上响应头 **`X-Loon-AdBlock: removed=N;v1`**（N=本响应移除的广告条目数）。
- 下次抓包 / 看 Loon 日志，只要出现这个头，就说明插件脚本确实跑起来了；
- `removed=0` 表示这条响应本就没有广告。
- 如果**完全看不到** `X-Loon-AdBlock` 头，说明插件没加载（检查导入 URL 是否正确、MitM 是否开启、证书是否信任）。

## 手动部署到自己的仓库

1. 把本仓库推到 GitHub（任意公开仓库）。
2. 编辑 `CEB-AD-Blocker.plugin`，把 `script-path` 换成你自己的脚本地址（建议同样用 raw.githubusercontent）。
3. Loon 通过 URL 添加：`https://cdn.jsdelivr.net/gh/<你>/<仓库>@<COMMIT_SHA>/CEB-AD-Blocker.plugin`
4. 同上开启 MitM 并信任证书。

> 若只想要埋点拦截、不想托管脚本：删掉 `.plugin` 里的 `[Script]` 整段即可。

## 故障排查

### 症状：插件显示"已加载"但仍然有广告

99% 是 **Loon 缓存了旧 plugin** 或 **CDN 缓存了旧脚本**。表现：响应头里是旧版本号，或日志没有 `[光大去广告] v1`。

#### A. 强制刷新插件（推荐）

Loon 的插件缓存与 URL 一一对应。换一个新的 URL 即可让 Loon 当作新插件重拉——最简单的办法就是用 commit 固定地址（见上文"安装"），每次更新换哈希。

#### B. 确认脚本在跑但版本不对

Loon 日志出现 `Finished execute http-response script:光大去广告(开屏/弹窗)` 说明脚本在执行；此时若还有广告，看日志里打印的版本号即可判断是缓存问题还是规则漏判。
