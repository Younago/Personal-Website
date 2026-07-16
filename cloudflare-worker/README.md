# AI Playtest Feedback Triage — 后端部署说明

这个文件夹里的两个文件（`playtest-feedback-worker.js` + `wrangler.toml`）是网站上
"AI Playtest 反馈归纳"这个演示小工具的后端。网站本身还是纯静态托管在 GitHub Pages
上，没有变化；这个 Worker 是唯一需要额外托管的部分，用来在服务端调用大模型（把 API
key/调用逻辑藏在后端，不暴露在网页源码里）。

用的是 Cloudflare Workers AI —— 免费账号自带每日免费额度，不需要额外绑定信用卡或
申请其他平台的 API key。

## 部署步骤（大概 5-10 分钟，只需要做一次）

1. **注册 Cloudflare 账号**（如果还没有）：打开 https://dash.cloudflare.com/sign-up，
   免费账号即可，不需要绑定域名。

2. **安装 Wrangler**（Cloudflare 官方的部署工具）。在电脑上打开终端/命令行，运行：
   ```
   npm install -g wrangler
   ```
   （需要先装 Node.js，如果没有可以去 https://nodejs.org 下载安装包）

3. **登录**：
   ```
   wrangler login
   ```
   会打开浏览器，用你刚注册/已有的 Cloudflare 账号登录并授权。

4. **进入这个文件夹并部署**：
   ```
   cd cloudflare-worker
   wrangler deploy
   ```
   第一次部署时 Wrangler 可能会提示要不要自动开通 Workers AI，选是即可。

5. 部署成功后，终端会打印出一个类似这样的网址：
   ```
   https://playtest-feedback-worker.<你的子域名>.workers.dev
   ```
   复制这个网址。

6. **把网址填进网站代码**：打开仓库里的 `js/ai-feedback.js`，找到最上面这一行：
   ```js
   var AI_TOOL_ENDPOINT = "";
   ```
   把引号里填成你刚才复制的网址，比如：
   ```js
   var AI_TOOL_ENDPOINT = "https://playtest-feedback-worker.your-name.workers.dev";
   ```
   保存。

7. **检查跨域设置**：`playtest-feedback-worker.js` 顶部有一行：
   ```js
   const ALLOWED_ORIGIN = "https://gogo.fyi";
   ```
   如果你的网站最终域名不是 `gogo.fyi`，记得改成实际域名，改完要重新 `wrangler deploy`
   一次才会生效。

8. **通过 GitHub Desktop 提交并推送** `js/ai-feedback.js` 的改动，`gogo.fyi` 更新后
   这个工具就是真的能用的了。

## 关于免费额度和滥用防护

- Cloudflare Workers AI 每天有免费的调用额度，个人网站的访客量正常情况下用不完。
- 网页这边已经加了一个简单的"每天最多用 8 次"的前端限制（存在浏览器 localStorage
  里），主要是防止同一个人反复点导致额度浪费，不是安全机制（技术上可以被绕过）。
- 如果想要更严格的防刷（比如按 IP 限流），推荐直接在 Cloudflare 控制台里配置：
  进入你的账号 → Security → WAF → Rate limiting rules，针对这个 Worker 的路由设置
  一个"每个 IP 每分钟最多 N 次请求"的规则——不需要改代码，控制台点几下就行。

## 以后想换成别的模型/平台？

`playtest-feedback-worker.js` 里唯一需要改的地方是这一行：
```js
const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", { ... });
```
（原来用的 `llama-3.1-8b-instruct` 在 2026-05-30 被 Cloudflare 下线了，部署时如果报
`This model was deprecated` 类似的错，说明又有模型下线了，去下面的模型列表页面挑一个
还在用的换上就行——用 `wrangler tail <worker-name>` 能看到这类具体报错原因。）
Cloudflare Workers AI 目录里还有其他文本模型可以替换着试（保持 `messages` 格式不变
即可），具体可用模型列表见 Cloudflare 官方文档：
https://developers.cloudflare.com/workers-ai/models/
