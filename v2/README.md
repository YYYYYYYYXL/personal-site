# 于鑫磊的个人网站 V2

黑蓝色、深夜工作室主题的 Astro 静态个人站，生产域名为 `https://yuxinlei.cloud/`。

## 开发

使用 Node.js 22.23.4+（或 24+）与 npm。Astro 固定为 6.4.8；依赖树中的 undici 要求高于旧版系统 Node，因此此工程把最低开发版本设为 22.23.4。

```powershell
cd D:\CodeRepository\personal-site\v2
npm ci
npm run dev
```

打开 `http://127.0.0.1:4321/`。本次工作区另有从 Node.js 官方下载并通过 SHA256 校验的 `.tools/node.exe`，已被 Git 忽略，不修改系统环境。使用该运行时可执行：

```powershell
.\start-preview.ps1
```

## 检查和构建

```powershell
npm run check
npm run build
node scripts/codex_check-build.mjs
npm run preview
```

如当前系统 Node 太旧，可使用本地运行时：

```powershell
.\.tools\node.exe node_modules/astro/bin/astro.mjs check
.\.tools\node.exe node_modules/astro/bin/astro.mjs build
.\.tools\node.exe scripts/codex_check-build.mjs
.\start-preview.ps1 -Mode preview
```

构建产物位于 `dist/`，纯静态，无运行期后端。结构、颜色、组件和内容依据见 `DESIGN.md`。

## 内容维护

- `src/data/profile.ts`：公开身份信息、联系方式、关注方向和技术实践。
- `src/content/projects/*.md`：项目元信息与正文；schema 位于 `src/content.config.ts`。
- `src/styles/global.css`：设计变量、共用组件与移动端断点。
- `src/components/` 与 `src/layouts/`：导航、项目卡、按钮、页脚与页面骨架。
- `src/assets/`：原头像、深夜工作室插画和研究主题插画，Astro 构建时生成 WebP 和响应式尺寸。
- 没有接入占位简历 PDF，也没有复制旧站的指纹脚本、jQuery、评论嵌入和粒子动画。

首页“能力与实践”展示服务器部署、Linux、计算机网络三张接近正方形的配图卡，内容维护在 `src/data/capabilities.ts`。项目列表使用独立项目配图卡，仅显示标题、简介与技术栈，不显示分类和状态标签。列表保留关键词搜索和 URL 查询参数，数量提示仅供读屏工具使用。详情页保留真实背景、职责与状态并提供页内目录。联系入口统一指向独立 `/contact/` 页面。移动导航支持 Escape、点击外部关闭与键盘焦点；无 JavaScript 时仍可访问导航和完整项目列表。

标题使用霞鹜文楷的本地子集 Xinlei WenKai，正文与导航使用本地 Noto Sans SC 可变字体。页面有短暂淡入切换、滚动入场和筛选反馈；系统开启“减少动态效果”时取消这些动效。内容维护后如需更新标题字形，安装 Python 的 `fonttools` 与 `brotli` 后运行 `python -B scripts/prepare-heading-font.py`。普通开发、构建与部署直接使用 `public/fonts/` 中的成品，无需 Python；许可证随静态产物保留。

## 内容状态

- 图像去噪：进行中；未展示历史 PSNR/SSIM 为最终结果；真实截图与最终实验材料待补充。
- Magic Resume：明确第三方开源来源与本人部署、适配、交付职责；此阶段没有操作该服务。
- 商品分析：只读检查本地 README、清洗函数、Django API 和 Vue 页面后整理；没有运行或改动其工程，没有虚构实时采集、数据规模或业务收益。
- 个人网站 V2：持续完善，保留 AI 协作与原创贡献边界。

两张新插画通过内置 Image Gen 生成。`night-studio.png` 为黑蓝深夜编程工作室背景，保留原头像人物特征，左侧留出阅读空间；`image-research.png` 为光学薄片、图像与颗粒构成的研究主题视觉。它们均非真实工作环境、系统截图或实验结果。按界面精简要求，装饰性角标已移除；研究插画的性质保留在替代文本和项目正文中。原始生成提示词保存在 `ASSETS.md`。

## 部署边界

保留仓库中的旧 HTML 和旧静态资源。生产发布沿用 `.github/workflows/deploy.yml` 的 GitHub Actions + SSH/rsync，不迁移 Sites 托管，不操作 Magic Resume、3X-UI、DNS 或 Nginx 配置。

`main` 推送或手动触发后，工作流安装依赖、类型检查、构建、校验内部链接与素材，再仅上传 `v2/dist/`。远端脚本 `.github/scripts/publish-static.sh` 验证目标目录、备份旧站、同步静态文件并检查 HTTPS 及所有内容路由；发布检查失败时自动恢复该次备份。备份路径在 Actions 日志中输出。保留 `.well-known/` 证书验证文件，静态文件更新不重载共享 Nginx。

私有背景档案、依赖、开发缓存与本地测试素材均被 `.gitignore` 排除，不能提交为网站产物。发布只触及个人站点的静态目录；确认浏览器中的页面后再继续后续改版。
