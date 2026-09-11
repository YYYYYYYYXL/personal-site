# personal-site 项目说明、维护与完整删除手册

## 1. 项目介绍

`personal-site` 是部署在 Ubuntu 服务器上的个人静态网站。

项目不运行独立后端服务，不使用 Docker，不使用 Node.js 后端，也没有数据库。HTML、CSS、JavaScript 和图片等静态文件由 Nginx 直接读取并返回给浏览器。

项目目录：

```text
/var/www/personal-site
```

公网域名：

```text
yuxinlei.cloud
www.yuxinlei.cloud
```

访问链路：

```text
浏览器
  |
  v
yuxinlei.cloud / www.yuxinlei.cloud
  |
  v
Nginx :443
  |
  v
/var/www/personal-site
  |
  v
index.html / CSS / JavaScript / 图片
```

---

## 2. 项目技术栈

### 前端

项目属于静态 Web 项目。

主要内容：

```text
HTML
CSS
JavaScript
图片和其他静态资源
```

### Web 服务

使用：

```text
Nginx
```

Nginx 直接读取：

```text
/var/www/personal-site
```

主要配置：

```nginx
root /var/www/personal-site;
index index.html;
```

Nginx 站点配置：

```text
/etc/nginx/sites-available/personal-site
/etc/nginx/sites-enabled/personal-site
```

域名：

```text
yuxinlei.cloud
www.yuxinlei.cloud
```

### HTTPS

使用：

```text
Let's Encrypt
Certbot
```

证书目录：

```text
/etc/letsencrypt/live/yuxinlei.cloud/
```

证书文件：

```text
fullchain.pem
privkey.pem
```

续期配置：

```text
/etc/letsencrypt/renewal/yuxinlei.cloud.conf
```

证书存档：

```text
/etc/letsencrypt/archive/yuxinlei.cloud/
```

---

## 3. 项目结构

### 主项目目录

```text
/var/www/personal-site
```

典型结构：

```text
/var/www/personal-site
  |
  +--> index.html
  |
  +--> CSS
  |
  +--> JavaScript
  |
  +--> 图片
  |
  +--> 其他静态资源
```

### 独立备份目录

项目目录以外存在：

```text
/var/www/personal-site-backups
```

已记录的备份：

```text
/var/www/personal-site-backups/personal-site-20260907-101933
/var/www/personal-site-backups/personal-site-20260907-103932
/var/www/personal-site-backups/personal-site-20260907-110717
```

删除主项目目录不会自动删除这些备份。

### 项目目录以外的资源

```text
/etc/nginx/sites-available/personal-site
/etc/nginx/sites-enabled/personal-site

/etc/letsencrypt/live/yuxinlei.cloud/
/etc/letsencrypt/archive/yuxinlei.cloud/
/etc/letsencrypt/renewal/yuxinlei.cloud.conf

yuxinlei.cloud DNS
www.yuxinlei.cloud DNS
```

### 不存在的项目运行资源

当前项目不使用：

```text
Docker 容器
Docker 镜像
Docker Volume
Docker 网络
Node.js 后端
独立应用端口
MySQL
MariaDB
PostgreSQL
MongoDB
Redis
PM2
Supervisor
```

---

## 4. 日常维护重点

### 检查站点文件

```bash
ls -la /var/www/personal-site
```

### 检查首页

```bash
ls -l /var/www/personal-site/index.html
```

### 检查 Nginx 配置

```bash
cat /etc/nginx/sites-available/personal-site
```

### 检查 Nginx 语法

```bash
sudo nginx -t
```

### 重载 Nginx

仅在配置检查通过后执行：

```bash
sudo systemctl reload nginx
```

### 检查 HTTPS 证书

```bash
sudo certbot certificates
```

### 检查备份

```bash
ls -lah /var/www/personal-site-backups
```

### 检查公网入口

```bash
ss -tulnp | grep -E ':80|:443'
```

### 维护原则

- 修改静态文件不需要重启 Nginx
- 修改 Nginx 配置后必须先 `nginx -t`
- 不删除整个 `/var/log/nginx/`
- 不因为该项目是静态站点就卸载 Nginx
- 不删除 Docker，因为 Docker 被 `magic-resume` 使用
- 不关闭 80/443，因为其他 Web 项目也依赖这两个端口
- 证书通过 Certbot 管理，不直接删除证书文件
- `/var/www/personal-site-backups` 与主项目目录分开管理

---

## 5. 完全删除项目

以下流程用于把 `personal-site` 从服务器中完整移除，同时不破坏其他项目。

### 第一步：确认项目文件和备份

主目录：

```bash
ls -la /var/www/personal-site
```

备份：

```bash
ls -lah /var/www/personal-site-backups
```

删除前先决定备份是否需要保留。

如果目标是“项目完全从服务器清除”，最终需要同时处理：

```text
/var/www/personal-site
/var/www/personal-site-backups
```

### 第二步：停用 Nginx 站点

删除启用链接：

```bash
sudo rm -f /etc/nginx/sites-enabled/personal-site
```

检查：

```bash
sudo nginx -t
```

通过后：

```bash
sudo systemctl reload nginx
```

然后删除站点配置：

```bash
sudo rm -f /etc/nginx/sites-available/personal-site
```

再次检查：

```bash
sudo nginx -t
```

### 第三步：删除 HTTPS 证书

先检查证书：

```bash
sudo certbot certificates
```

确认 `yuxinlei.cloud` 证书不再被其他站点使用后：

```bash
sudo certbot delete --cert-name yuxinlei.cloud
```

再次检查：

```bash
sudo certbot certificates
```

该证书可能同时覆盖：

```text
yuxinlei.cloud
www.yuxinlei.cloud
```

不要直接手工删除：

```text
/etc/letsencrypt/live/yuxinlei.cloud/
/etc/letsencrypt/archive/yuxinlei.cloud/
/etc/letsencrypt/renewal/yuxinlei.cloud.conf
```

### 第四步：删除主项目目录

确认备份或远程副本已经保留后：

```bash
sudo rm -rf /var/www/personal-site
```

确认：

```bash
test ! -e /var/www/personal-site && echo "personal-site directory removed"
```

### 第五步：处理独立备份

如果决定全部删除：

```bash
sudo rm -rf /var/www/personal-site-backups
```

确认：

```bash
test ! -e /var/www/personal-site-backups && echo "personal-site backups removed"
```

如果需要保留备份，则不要执行这一步。

### 第六步：删除 DNS 记录

在 DNS 管理平台删除：

```text
yuxinlei.cloud
www.yuxinlei.cloud
```

只删除与当前服务器绑定的对应解析记录。

### 第七步：检查外部资源

检查并按需清理：

```text
GitHub 或 Gitee 仓库
GitHub Actions
GitHub Secrets
Deploy Key
Cloudflare
CDN
外部监控
搜索引擎站长平台
对象存储
其他云服务
```

只处理属于 `personal-site` 的专属资源。

### 第八步：最终复查

项目目录：

```bash
ls -la /var/www
```

Nginx：

```bash
ls -l /etc/nginx/sites-enabled/
ls -l /etc/nginx/sites-available/
sudo nginx -t
```

证书：

```bash
sudo certbot certificates
```

确认没有 Docker 误操作：

```bash
docker ps -a
docker images
```

最终应不存在：

```text
/var/www/personal-site

如果选择彻底清除备份：
/var/www/personal-site-backups

/etc/nginx/sites-available/personal-site
/etc/nginx/sites-enabled/personal-site

yuxinlei.cloud 对应 Certbot 证书
yuxinlei.cloud DNS
www.yuxinlei.cloud DNS
```

### 不要随项目删除的公共组件

不要删除：

```text
Nginx
Docker
Docker Compose
containerd
Certbot
Python 3
SSH
80 / 443 公网规则
magic-resume 的容器、镜像、网络
panel.yuxinlei.cloud 的 Nginx 配置
其他项目的 HTTPS 证书
```

---

## 6. 删除完成后的服务器状态

删除 `personal-site` 后，以下项目仍应正常工作：

```text
magic-resume
x-ui + Xray
Nginx
HTTPS
SSH
```

80 和 443 仍是服务器公共 Web 入口，不因删除 `personal-site` 而关闭。
