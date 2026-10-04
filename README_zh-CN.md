# LeagueHub

[English](README.md) | **简体中文**

LeagueHub 是一个开箱即用的 iRacing 联赛网站模板。它基于 Astro 构建静态页面：配置站点和赛事、放入 iRacing 比赛结果后，即可生成自己的联赛网站，无需为每场比赛编写页面。

模板已实现：

- **联赛首页**：展示系列赛、最新赛果和接下来的比赛。
- **合作伙伴**：在每页底部展示可配置的赞助商 Logo 和链接。
- **系列赛页面**：展示赛程、锦标赛积分榜、最新比赛结果及可选的赛事介绍。
- **赛事文档**：自动发现 Markdown 文档，生成带章节目录、版本与生效日期的独立阅读页面。
- **比赛结果页面**：分别展示正赛、排位赛和练习赛成绩，并统计杆位、最快圈等数据。
- **自动计算积分**：按可配置的积分规则汇总车手成绩，支持名次调整、扣分和取消资格等处罚。
- **多赛事与静态构建**：新增系列赛只需添加配置和数据；构建时自动生成导航及对应页面。

仓库附带已完赛和未开赛两种虚拟示例，安装依赖后即可预览。要用于自己的联赛，请替换示例赛事，并修改站点信息、积分规则和比赛数据。

## 快速开始

需要 Node.js 22.12.0 或更新版本。

```bash
npm install
npm run dev
```

打开终端输出的本地地址，即可查看示例网站。准备自己的联赛时，先修改 `config/site.ts` 中的站点信息，再参照 `series/demo-gt3/` 或 `series/demo-upcoming/` 添加赛事配置和赛程；比赛结束后放入原始 iRacing 结果文件，并在对应轮次关联它。各文件的作用见下文。

运行检查并构建静态网站：

```bash
npm run check
npm run build
```

构建产物位于 `dist/`。可用 `npm run preview` 在本地预览构建结果。`npm run build` 本身也会先执行 Astro 检查。

发布到其他域名时，只需修改 `astro.config.mjs` 中的 `site`。页面 canonical、站点地图和 `robots.txt` 会使用同一个地址生成。

Favicon 是 `public/` 下独立的静态图片。在 `config/site.ts` 的 `site.favicon` 中配置路径，默认使用 `/favicon.png`。页面只引用该路径，不声明 `type` 或 `sizes`，由浏览器处理图片。更换品牌时需分别替换 Logo 和 favicon，并更新对应路径。Favicon 按原文件复制，不自动生成或调整尺寸。

## 数据与配置放在哪里

| 路径 | 用途 |
| --- | --- |
| `config/site.ts` | 站点名称、Logo、全站赛季、语言区域、展示时区、重点色及表格默认展示列 |
| `config/sponsors.ts` | 全站合作伙伴的名称、Logo、可选链接及显示顺序 |
| `config/points.ts` | 共享的名次积分、杆位、最快圈及可选自定义奖励规则 |
| `series/<slug>/config.ts` | 系列赛名称、路由、积分规则及可选的赛季名称、展示顺序、可见状态、展示覆盖、Logo 和证书范围 |
| `series/<slug>/series.json` | 车辆组别 `carClass` 与按顺序排列的赛程 `rounds` |
| `series/<slug>/drivers.json` | 可选的车手报名名称，以 iRacing `cust_id` 为键 |
| `series/<slug>/info.md` | 可选的赛事介绍和规则说明，仅用于展示 |
| `series/<slug>/documents/*.md` | 可选的赛事文档，自动生成独立页面，仅用于展示 |
| `series/<slug>/eventresult-*.json` | 未经修改的 iRacing 比赛结果 API 响应 |
| `series/<slug>/penalties/<roundId>.json` | 可选的该轮赛事仲裁决定 |

系列赛的 `config.ts` 默认导出配置，包含 `id`、`name`、`shortName`、`slug` 和 `pointsSystem`；`slug` 必须与目录名相同，`pointsSystem` 必须引用 `config/points.ts` 中的键。可用 `display` 覆盖全站表格展示选项。比赛结果行不应手工写入配置。

需要使用赛会登记名称时，在系列赛目录添加可选的 `drivers.json`：

```json
{
  "99000001": "张三",
  "99000002": "李四"
}
```

键是车手的 iRacing `cust_id`（用字符串填写），值可以是中文名、英文名或昵称。示例赛事中的名称为虚构示例，请替换为实际报名信息。名称会去除首尾空白；空白名称或非字符串值会导致构建报错。未配置的车手继续显示原始 `display_name`；省略整个文件则保留全部原名。映射对该系列赛所有轮次生效，覆盖正赛、排位、练习、积分榜、首页摘要和证书。车手 ID、积分、处罚、积分榜顺序和证书地址均保持不变。原始赛果 JSON 无需修改，更新映射后重新构建站点。

在 `config/site.ts` 的 `display` 中，`standingsLimit` 控制锦标赛积分榜默认显示人数，`latestResultsLimit` 控制最新比赛结果默认显示人数，两者默认均为 `10`。填写非负整数，`0` 表示显示全部；主页按配置限制显示人数，点击标题右侧的“查看完整积分榜”或“查看完整结果”进入独立页面查看完整名单。独立页面不受人数限制。可在单个系列赛的 `config.ts` 中覆盖，例如：

```ts
display: {
  standingsLimit: 15,
  latestResultsLimit: 5,
},
```

修改配置后重新构建站点。

`config/points.ts` 中的 `custom` 是特殊积分示例：P1–P10 分别得 32、24、18、14、12、10、8、6、4、2 分；杆位和最快圈各得 1 分；名次提升最多和事故最少的车手各得 1 分；P11 起（含 P11）完赛车手各得 1 分。两项单人奖励并列时由正式名次更靠前者获得，名次提升须大于零。特殊奖励以处罚后的正式名次计算，取消资格者得零分。要启用该规则，在对应系列赛的 `config.ts` 中设置 `pointsSystem: 'custom'`。

其他特殊规则可通过新增积分方案的 `customBonus(race)` 实现，返回以车手 ID 为键的对象。每位获奖车手必须返回 `{ reason: string, points: number }[]`，例如 `{ '12345': [{ reason: '名次提升最多', points: 1 }, { reason: '事故最少', points: 1 }] }`。无需自定义奖励时省略 `customBonus` 即可。

正赛结果支持查看积分明细，按处罚后的正式结果计分。

在 `config/site.ts` 中设置 `site.timeZone`（如 `Pacific/Auckland`），赛事日期和时间都按该时区显示；`series.json` 中的 `date` 继续使用带 `Z` 或时区偏移量的 ISO 8601 时间戳。修改配置后须重新构建站点。

系列赛配置可设置 `seasonName`，显示在首页对应赛事卡片和赛事页；未填写或仅包含空白字符时，该赛事不显示赛季名称。首页栏目标题和页脚使用独立的全站赛季名称。可设置数值 `order` 控制赛事在首页及导航中的顺序，值越小越靠前；省略时按 `0` 处理，同序按目录路径排序。设置 `visible: false` 可从首页的赛事、最新赛果、接下来举行以及顶部导航中隐藏该赛事；默认展示。隐藏仅影响这些列表，赛事页及结果页仍会生成，可通过直达链接访问。

Logo 资源放在 `public/series/`，在系列赛配置中使用站点根路径（如 `logo: '/series/demo-gt3.svg'`）。它会显示在首页赛事列表和系列赛页头；未配置时显示文字。全站顶部导航始终使用文字。

每页底部的合作伙伴由 `config/sponsors.ts` 中的 `sponsors` 数组控制。每项填写 `name` 和 `logo`，可选填 `url` 与数值 `order`（越小越靠前）；图片放在 `public/sponsors/`，用 `/sponsors/文件名.svg` 引用。每家只需一份 Logo，所有 Logo 在两种站点主题下使用统一的浅灰底板。有 `url` 时卡片可点击；数组为空时整个区域隐藏。仓库中的三个 `DEMO` 项及 Logo 仅供预览，上线前请替换。

`info.md` 可写联盟宗旨、报名条件、赛制、车辆、奖励、直播和规则。存在该文件时，系列赛页面自动显示“赛事信息”及页内导航。用于计算的积分规则或条件仍须写在结构化配置中，不能只写在介绍文字里。

### 赛事文档

保留 `info.md` 作为赛事主页介绍。需要单独分享的资料、公告或规则说明，放在 `series/<slug>/documents/<文档名>.md`，不需要修改配置或手工注册路由。例如：

```markdown
---
title: 赛事资料阅读指南
summary: 介绍赛事资料的阅读入口。
order: 10
version: "1.0"
effectiveDate: "2026-07-01"
---

## 赛事资料

这里填写正文。

### 阅读入口

这里填写章节内容。
```

`title` 必填，为非空字符串；`summary`、`version` 和 `effectiveDate` 可省略，填写时须为非空字符串。`version` 请加引号，避免 YAML 将版本号解释为数值。`effectiveDate` 使用带引号的 `YYYY-MM-DD` 有效日期，按原值展示，不做时区转换；它不会控制发布时间或计算生效时点。`order` 为可选有限数值，默认 `0`，越小越靠前；同序按文件名排序。无效元数据会在构建时报告文件路径。

构建自动生成 `/racing/<slug>/documents/<文档名>`，文件名不含 `.md`，建议使用稳定的英文小写与连字符。仅发现 `documents/` 直属的 `.md` 文件。有文档时，赛事主页显示“赛事文档”页内导航与列表；目录不存在或没有文档时不显示。隐藏赛事的文档页仍会生成，可通过直达链接访问。

文档页复用站点导航、主题和页脚，显示摘要及可选元数据，并提供返回赛事链接。正文 Markdown 标题自动生成章节目录，重复标题也使用 Astro 生成的独立锚点；无标题时隐藏目录。页面已有文档标题，正文建议从 `##` 开始。手机上目录放在正文前，表格和代码块可在各自区域横向滚动。

文档与 `info.md` 均只用于内容展示，不改变积分、处罚或任何赛事计算。新增、编辑或删除文档后运行 `npm run check` 和 `npm run build`，再用 `npm run preview` 检查赛事主页、文档链接、章节跳转与手机布局。仓库的 `series/demo-gt3/documents/` 包含完整元数据与精简公告两个示例。

### 赛程与结果文件

`series.json` 中每轮可通过 `resultFile` 引用同目录下的原始结果文件，填写文件名时**不带 `.json`**。例如：

```json
{
  "carClass": "GT3",
  "rounds": [
    {
      "id": "round-1",
      "round": 1,
      "name": "第 1 轮 · Spa-Francorchamps",
      "track": "Spa-Francorchamps",
      "layout": "Grand Prix",
      "date": "2026-07-05T10:00:00Z",
      "resultFile": "eventresult-demo-01"
    }
  ]
}
```

未举行的轮次不要填写 `resultFile`；赛程中第一轮没有结果的比赛会被视为下一场比赛。替换或增加结果文件后，重新构建即可更新正式成绩、积分榜、赛事进度和首页内容，无需手工整理结果。

### 分站名次证书

在每个系列赛的 `config.ts` 中使用 `certificates` 设置证书范围：

```ts
certificates: 'off',       // 关闭；不填写时也默认关闭
certificates: { top: 5 },  // 前 N 名；N 可以是任意正整数
certificates: 'all',       // 所有取得正式名次的车手
```

示例 GT3 赛事设置为前 5 名。仅正赛结果页会在符合条件的名次下方显示公开的“查看证书”链接；点击后在新标签页打开 PDF，可通过浏览器的 PDF 工具下载。按处罚后的正式名次判断，取消资格或没有正式名次的车手不会获得证书。PDF 使用 `config/site.ts` 的 `site.accent` 重点色，优先放入该系列赛的 `logo`，没有时使用 `site.logo`。每次构建自动生成对应 PDF；更新比赛结果或处罚文件后重新运行 `npm run build` 即可。生成 PDF 使用的 Noto Sans CJK 字体及其许可见 `assets/fonts/`。

### 处罚文件

仲裁决定放在 `series/<slug>/penalties/<roundId>.json`，原始结果文件保持不变。支持名次后退、扣除积分和取消资格；完整 JSON 格式见 [赛事处罚说明](series/penalties.md)。

名次调整及取消资格在计算积分前生效。取消资格的车手该轮得零分（包括杆位和最快圈奖励），其圈速也不参与官方最快圈及相应统计。

## 管理系列赛

### 添加

1. 新建 `series/<slug>/`，参照现有赛事添加默认导出的 `config.ts`，确保 `slug` 与目录名一致。需要 Logo 时，将资源放入 `public/series/` 并在配置中引用。
2. 添加 `series.json`，填写 `carClass` 和 `rounds`；需要介绍时添加 `info.md`，需要独立文档时添加 `documents/*.md`。
3. 将已完成比赛的原始 `eventresult-*.json` 放入该目录，并在对应轮次设置 `resultFile`。如有处罚，再添加 `penalties/<roundId>.json`。
4. 运行 `npm run build`，检查生成的页面。

`src/lib/data.ts` 自动发现 `series/*/config.ts`；页面还会读取同目录可选的 `info.md`，`src/lib/documents.ts` 自动发现 `documents/*.md`。可见赛事的导航、首页赛事列表、最新赛果、后续比赛，以及所有赛事的系列赛页、文档页和已有比赛的结果页均随构建生成，无需修改全局配置。

### 删除或归档

删除对应的 `series/<slug>/` 目录，或将其移到 `series/` 之外进行归档。下次构建时，该赛事的页面、首页内容和导航入口不再生成。

### 随仓库提供的示例

- `series/demo-gt3/`：**DEMO / 虚拟数据**，包含 20 名虚拟车手、12 轮模拟结果、每轮三个场次及独立处罚文件，用于验证页面、积分与处罚流程，不代表真实赛事。
- `series/demo-upcoming/`：**DEMO / 虚拟数据**，只有 6 轮已公布赛程，没有结果文件。用于验证未开赛时的进度、下一场比赛、空积分榜和“即将举行”赛程；此时不生成结果页或“比赛结果”页内导航。

## 结果如何生成

```text
原始 iRacing JSON → 适配器 → 处罚 → 正式正赛结果 → 积分 → 积分榜
```

`src/lib/iracing-adapter.ts` 解析 Practice（练习赛）、Qualifying（排位赛）和 Race（正赛）。只有正赛参与处罚、锦标赛积分及官方最快圈统计；排位赛数据还用于确定正赛杆位。练习赛和排位赛不会改变当前轮次或下一场比赛的判定。

适配器将 iRacing 的万分之一秒转换为显示文字和毫秒，将从零开始的有效名次转换为从一开始的名次（`-1` 仍表示无有效名次）。正赛保留发车和完赛名次、组别名次、领跑圈数、状态及原始退赛原因；计时场次保留车手、车号、赛车、最快圈和与场次最快圈的差距，无有效圈速显示“—”。车手以 iRacing `cust_id` 标识。

`getStaticPaths()` 根据自动发现的配置和赛程生成页面。默认结果地址 `/racing/<slug>/results/<roundId>` 展示正赛；有相应场次数据时，另生成 `/qualifying` 和 `/practice` 子页面。三个场次共用比赛页头与切换导航，正赛表还显示发车位。

主要实现位于 `src/lib/`：`data.ts` 串联数据加载，`penalties.ts` 处理处罚，`points.ts` 计算积分，`standings.ts` 汇总积分榜。`src/components/` 提供共用的导航、卡片、表格和结果页区块；`src/pages/` 定义首页、系列赛页及结果页路由。页面组件不直接依赖 iRacing API 字段。
