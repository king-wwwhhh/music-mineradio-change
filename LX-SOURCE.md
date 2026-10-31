# Mineradio 2.2.0 + 外部音源（LX 自定义源）

在 [XxHuberrr/Mineradio](https://github.com/XxHuberrr/Mineradio) **v2.2.0**（commit `9402566`）之上，接入 LX 自定义音源（俗称「外部音源」）的补丁分支。

## 这个分支做了什么

| 提交 | 内容 |
| --- | --- |
| `f429aaa` | 移植 `services/lx-source-host.js` + `lx-search.js`（与 ww085213/Mineradio-LX-Music 逐字节一致），挂 9 条 `/api/lx-source/*` 路由；在网易云 / QQ / 酷狗 取流出口加「平台不可播 → 外部源兜底」 |
| `cfbaecc` | `prefer` 模式：默认优先走外部源（3.5s 预算 + 30s 负缓存 + 启动预热），`POST /api/lx-source/prefer` 运行时开关 |
| `d59376c` | 自包含「音源管理」面板（`public/js/modules/10-shell/06-lx-source-manager.js`）：列表 / 切换 / 启用停用 / 删除 / 导入（文件或 URL）/ prefer 开关 |
| `5b2a726` | 取流命中徽标 + 会话统计；服务端新增 `lxError` 标记，能区分「没开」与「开了但没取到」 |
| `d4bf48b` | 高码率档位保护（可选）：`MINERADIO_LX_PREFER_HIGH=protect` 时 `lossless/hires/jymaster` 等档位让给平台 |
| `9214b62` | 恢复默认：全档位外部优先（`preferHighMode=all`） |

## 运行

```bash
npm ci            # Electron 42.x；若 postinstall 未落地 dist，手动下载对应 electron zip 解压到 node_modules/electron/dist 并写 path.txt
npx electron .    # 或 node_modules/electron/dist/electron.exe .
```

## 接口

```
GET  /api/lx-source/status     当前源 / 已装列表 / prefer 状态
GET  /api/lx-source/prefer     读优先开关
POST /api/lx-source/prefer     {enabled:true|false}
POST /api/lx-source/import     {script,fileName} 或 {url}
POST /api/lx-source/select     {id}
POST /api/lx-source/toggle     {ids:[],enabled}
POST /api/lx-source/delete     {id} 或 {ids:[]}
POST /api/lx-source/resolve    {source,musicInfo,quality}
GET  /api/lx-source/search?q=
```

## 行为要点

- 判定在**每次取流时**发生，无成功缓存；失败 30s 负缓存。开关改完立即生效。
- 响应新增字段（不改既有语义）：`playbackSource:"lx"`、`lxResolver`、`lxQuality`、`lxOriginal`、`lxPrefer`、`lxPreferTried`、`lxError`。
- 高码率保护（可选）：第三方源普遍拿不到平台级码率，`MINERADIO_LX_PREFER_HIGH=protect` 让 `lossless/hires/jymaster/atmos` 优先走平台。
- 总开关：`MINERADIO_LX_FALLBACK=0` 完全回到原版行为；`MINERADIO_LX_FALLBACK_TRIAL=1` 允许替换 30s 试听。

## 风险与边界（务必阅读）

- **合规**：外部源通过第三方脚本取流，绕过平台鉴权。仅在平台已判不可播或缺歌场景使用，别分发源脚本，别当作长期方案。
- **安全**：音源脚本运行在 `vm` 白名单上下文（无 `require`/`fs`，`process` 为桩），但 `vm` **不是安全边界**，且沙箱内注入了宿主 `fetch`/`Buffer`，存在 `Function` 构造逃逸路径 —— 只导入信任的脚本。
- **音质**：实测同一源各档位返回容器——`exhigh` 为 MP3，`lossless/hires/jymaster` 为 FLAC，但 `hires`(flac24bit) 与 `jymaster`(master) 拿不到真 24bit/母带。
- **稳定性**：第三方线路随时失效（实测 `kg`/`kw` 曾全线 502），换源优于修源。

## 许可证

上游为 GPL-3.0-only；本分支同样遵循 GPL-3.0。移植的音源宿主代码来自同许可证的 Mineradio-LX-Music 分支。