---
title: Magic Resume 开源项目部署与 CI/CD 实践
shortTitle: 从代码更新，到应用交付。
summary: 基于第三方开源简历应用，进行页面适配，并实践镜像构建、容器部署与自动化交付。
category: opensource
categoryLabel: 开源项目部署
status: practice
statusLabel: 部署实践
role: 页面适配、部署配置与自动化交付
period: '2026'
tags: [Docker, Nginx, GitHub Actions, GHCR]
order: 2
featured: true
icon: git-branch
cover: none
links:
  - label: 访问部署站点
    url: https://resume.yuxinlei.cloud/
  - label: 查看代码仓库
    url: https://github.com/YYYYYYYYXL/magic-resume
updated: '2026-10-26'
---

## 项目背景

Magic Resume 是第三方开源简历制作应用。我在自己的服务器上进行非商业部署，并为公开站点调整说明文案、配置运行环境和交付流程。

**我不是上游项目的原作者，也不与原作者存在官方合作关系。** 这项实践的重点，是理解一个现有应用如何从源码更新走到可访问的服务。

## 我实际负责的工作

- 修改首页说明、标题与部分展示内容，准确说明上游来源及本站角色。
- 使用 Docker Compose 管理应用，配置 Nginx 反向代理与 HTTPS。
- 调整应用监听方式，让容器应用通过 Web 入口对外提供服务。
- 配置 GitHub Actions、GHCR 与服务器部署脚本，减少手工上传源码的重复操作。
- 在更新过程中查看容器状态和日志，并关注备份、镜像与其他服务的隔离。

## 技术实现

交付流程由本地代码更新开始：提交到代码仓库后，GitHub Actions 构建镜像并发布到 GHCR，服务器通过部署脚本拉取镜像并更新容器，Nginx 保持网站的 HTTPS 访问入口。

```text
代码更新 → GitHub Actions → GHCR 镜像
                              ↓
                       部署脚本与 Docker Compose
                              ↓
                       Nginx / HTTPS → 访客
```

GitHub Actions 负责自动化，GHCR 存储镜像，应用实际运行在自己的云服务器上。三者承担不同职责。

## 已有成果

完成过开源应用部署、文案适配及自动化交付配置，积累了 Docker、Nginx、HTTPS 与镜像更新的实际操作经验。

页面提供部署站点与代码仓库入口，方便进一步了解项目；不把上游产品功能和用户规模当作个人原创成果。

## 当前状态与下一步

**部署与维护实践。** 后续继续完善更新流程、日志排查和文档。当前个人网站改版不涉及更改此应用或它的部署配置。

## 相关材料

站点与仓库链接位于本页上方。开源署名与许可要求以对应上游仓库为准。
