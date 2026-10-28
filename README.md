# 于鑫磊的个人网站

基于 Astro 的黑蓝色个人作品集，网站地址为 https://yuxinlei.cloud/ 。页面由 Astro 构建为静态文件，通过 Nginx 提供访问，不需要运行期 Node.js 后端或数据库。

## 目录结构

- `v2/`：当前网站的源码、静态资源、内容和开发工具。
- `.github/workflows/deploy.yml`：GitHub Actions 构建与部署流程。
- `.github/scripts/publish-static.sh`：服务器上的静态文件发布、备份与失败恢复脚本。
- `resource/resume.pdf`：导航栏“查看简历”的原文件，开发时通过 `/resume.pdf` 访问，构建时输出同名静态 PDF，在新标签页中查看。更新时直接替换此文件，无需另存一份到 `public/`。
- `USER_CONTEXT.md`：本地背景资料，被 Git 忽略，不发布到网站。

旧版根目录 HTML、`assets-*`、`img/` 和旧静态预览脚本已移除。需要查看旧实现时，通过 Git 历史找回；当前网站使用的头像和配图已独立保存在 `v2/` 中。

## 本地开发

要求 Node.js 22.23.4+（或 24+）与 npm：

```powershell
cd D:\CodeRepository\personal-site\v2
npm ci
npm run dev
```

默认开发地址为 http://127.0.0.1:4321/ 。使用工作区本地运行时也可执行 `v2/start-preview.ps1`。开发端口可以另行指定，例如：

```powershell
npm run dev -- --port 4322
```

详细的内容维护、字体处理和本地运行方式见 [V2 使用说明](v2/README.md)，视觉规范见 [设计说明](v2/DESIGN.md)。

## 检查与构建

在 `v2/` 中执行：

```powershell
npm run check
npm run build
node scripts/codex_check-build.mjs
```

构建产物为 `v2/dist/`。依赖、本地运行时、构建结果和检查截图均不纳入 Git。

## 部署

沿用 GitHub Actions + SSH/rsync。推送 `main` 或手动触发部署流程后，工作流安装依赖、检查和构建 V2，再仅上传 `v2/dist/`。

静态文件由 Nginx 从 `/var/www/personal-site` 提供访问。发布脚本会验证目标路径、备份当前站点、同步新文件并检查 HTTPS 及页面路由；发布检查失败时恢复该次备份。备份位于站点目录之外，具体路径由 Actions 日志输出；`.well-known/` 证书验证文件保留。

本地清理旧源码不会删除服务器文件或服务器备份。静态网站更新不需要重载共享 Nginx，也不应修改 Magic Resume、3X-UI、DNS、其他站点证书或公共服务。部署凭据由 GitHub Secrets 管理，不写入仓库。
