# GPT with Taste for EnsoCode

把 [NB-Corp/gpt-with-taste](https://github.com/NB-Corp/gpt-with-taste) 的行为配方做成 EnsoCode 插件预设。选上之后，模型会自己拿主意处理普通决定，少写自我辩护和免责声明，收到子代理结果时先消化成下一步行动，再汇报给你。

配方是为 GPT 推理系列（GPT-6.1 Sol、GPT-6 Astra）写的，其他模型也能用，但效果没有经过验证。

## 安装

在 EnsoCode 的插件设置里选「从链接安装」，填：

```
https://github.com/MrDgbot/enso-gpt-with-taste
```

或者克隆仓库后选「从文件夹安装」，选仓库根目录。

装好后，预设列表里会出现只读预设「GPT with Taste」。

## 使用

**直接用**：在输入框的预设菜单里选「GPT with Taste」。

**叠加自己的 MCP、技能或角色**：插件预设是只读的。新建一个自定义预设，在里面叠加「GPT with Taste」，再勾选需要的 MCP 和技能，做法和叠加 pstack 一样。也可以先退出 EnsoCode，再用脚本生成这个预设：

```bash
python3 scripts/add-preset.py                          # 名为 Taste，带上所有已配置的 MCP
python3 scripts/add-preset.py --mcp semble --mcp fast-context-mcp --role-from PPP
```

脚本按名字查找预设，已存在就更新，不会重复添加；写入前会把 `settings.json` 备份到同目录。EnsoCode 运行时会用内存里的设置覆盖这个文件，所以脚本检测到 EnsoCode 在运行就会拒绝执行。

**子代理**：这个预设额外提供两个子代理类型，派发时用 `agent_type` 指定：

| 类型 | 用途 |
|---|---|
| `taste:sub` | 按主会话的任务说明干活，返回主会话能直接用的结果 |
| `taste:independent` | 独立任务或第二意见，不接收主会话的提醒 |

内置的 `worker`、`scout` 等类型不带这套提示词。

## 和上游的区别

上游在每次用户输入、每个子代理结果之后，单独插一段 Steer 提醒。EnsoCode 插件只能往系统提示词末尾追加内容，如果每一轮换不同的 Steer，提示缓存每次都会失效。所以这里把三段 Steer 固定写进系统提示词尾部：

| 文件 | 内容 | 用在 |
|---|---|---|
| `prompts/main.md` | Main + User Steer + Agent Steer | 预设的系统提示词尾部 |
| `prompts/sub.md` | Sub + Sub Steer | `taste:sub` |
| `prompts/independent.md` | Independent | `taste:independent` |

插件本身没有代码，也不需要任何权限。

## 同步上游

`.github/workflows/sync-upstream.yml` 每天运行一次，也可以在 Actions 页面手动触发。它会拉取上游 `master` 并重新生成 `prompts/`；如果有变化，就把补丁版本号加一，然后提交。EnsoCode 检查更新时读的是 `enso-plugin.json` 里的版本号，所以从 URL 安装的用户会收到更新提示。

本地手动同步：

```bash
node scripts/build.mjs           # 克隆上游最新版并生成
node scripts/build.mjs --bump    # 同上，有变化时把版本号加一
node scripts/build.mjs ../gpt-with-taste   # 用本地的上游仓库
```

只需要 Node.js 22+ 和 git。`PROVENANCE.md` 记录了当前提示词对应的上游 commit。

提示词要改的话，改上游的 `recipe/`。这里的 `prompts/` 是生成出来的，手动修改会在下次同步时被覆盖。

## 许可

本仓库使用 MIT 许可。`prompts/` 里的配方来自 NB-Corp/gpt-with-taste，同样是 MIT，原许可文本见 `THIRD_PARTY_LICENSE`。
