---
title: "3X-UI 从零部署与节点配置"
description: "完整保留 Ubuntu 原生安装、HTTPS 管理入口、VLESS + REALITY、客户端导入与排障流程，部署参数统一使用明确标注的示例。"
order: 6
icon: "network"
tags: ["Ubuntu","3X-UI","Xray","Nginx"]
sources: ["3X-UI_从零部署与节点配置指南.md"]
---

> **公开教学示例，非真实部署配置。** 本文保留原教程的安装、配置、客户端导入、验证、维护与排障步骤，仅将部署参数替换为示例。示例输出不是本网站服务器的运行结果，验收清单也不代表已完成测试。
>
> 管理域名、IP、端口、随机路径和入站备注均为演示值。请在自己的环境中逐项替换；密码、UUID、密钥和 Short ID 应自行生成，不要复用或公开真实凭据。

| 参数 | 本文统一示例 | 实际使用时 |
| --- | --- | --- |
| 管理域名 | `panel.example.com` | 换成自己拥有并已解析的域名 |
| 服务器公网 IPv4 | `203.0.113.10` | 文档示例地址，不可用于实际连接 |
| 面板内部端口 | `22222/TCP` | 与面板及 Nginx 上游配置一致，仅本机监听 |
| 节点入站端口 | `11111/TCP` | 与客户端、安全组和防火墙规则一致 |
| 订阅服务端口 | `33333/TCP` | 仅作解释，本教程不使用、不开放 |
| 面板随机路径 | `/demo-7f3a9c2e/` | 虚构路径；自行生成并与 Nginx location 保持一致 |
| 入站备注 | `demo-reality` | 自定义名称，不是线上节点名称 |
| REALITY 目标 / SNI | `www.example.org:443` / `www.example.org` | 仅示意格式，不保证满足 REALITY 的 TLS 要求；部署前选用并核实兼容的目标站点 |

`example.com`、`example.org` 与上述公网 IPv4 都是文档示例；照抄它们不会得到可用的面板、证书或节点。所有端口示例均在合法范围内，但仍须检查自己服务器的端口占用情况。软件界面与安装脚本可能随版本变化，实际操作前核对文末官方资料。

> 本文记录一套基于 Ubuntu、3X-UI、Xray-core、VLESS + REALITY 的部署流程。目标是从一台新装的 Ubuntu 云服务器开始，完成面板安装、HTTPS 管理入口、节点入站、客户端创建、二维码导入和连通性验证。
>
> 本指南采用原生 systemd 安装方式，不使用 Docker。命令以 Ubuntu 为准。

## 1. 项目组成与网络拓扑

### 1.1 组件分工

- **3X-UI**：Web 管理面板，用于管理入站、客户端、流量统计和 Xray 配置。
- **Xray-core**：真正处理代理连接的核心程序。客户端连接的是 Xray 入站，不是 3X-UI 的 Web 面板。
- **Nginx**：反向代理，将管理域名的 HTTPS 请求转发到仅监听本机的 3X-UI 面板端口。
- **Certbot / Let's Encrypt**：为管理域名签发和续期 HTTPS 证书。
- **客户端软件**：Windows 使用 v2rayN；iPad 使用 V2Box。客户端导入 VLESS 分享链接或二维码后连接节点。

### 1.2 网络拓扑

```text
                         管理面板访问
管理员浏览器
    |
    | HTTPS :443
    v
panel.example.com
    |
    v
Nginx
    |
    | 反向代理到本机
    v
127.0.0.1:22222
    |
    v
3X-UI Web 面板
    |
    | 管理、生成和下发 Xray 配置
    v
Xray-core


                         节点代理访问
Windows v2rayN / iPad V2Box
    |
    | 本地代理入口或 iOS VPN 隧道
    v
客户端 Xray 核心
    |
    | VLESS + REALITY + TCP
    | 加密传输
    v
203.0.113.10:11111
    |
    v
服务器 Xray-core
    |
    | 以服务器作为公网出口访问目标
    v
目标网站 / 互联网
```

管理面板访问和节点代理访问是两条不同的链路：

- 管理面板通过 `Nginx -> 127.0.0.1:22222` 访问。
- 节点客户端直接连接服务器 Xray 的 `11111/TCP` 入站。
- `22222` 是面板端口，不是节点端口。
- `11111` 是节点入站端口，不是面板端口。

### 1.3 本教程的示例配置基线

以下配置仅用于贯穿教程的示例，不代表作者或任何线上服务器的真实配置。实际部署时应选择自己的可用端口和域名，重新生成随机路径、密码、UUID 与密钥。

- 操作系统：Ubuntu。
- 安装方式：官方安装脚本，原生 systemd 服务。
- 面板管理域名：`panel.example.com`。
- 面板监听地址：`127.0.0.1`。
- 面板端口：`22222`。
- 面板 Web Base Path：`/demo-7f3a9c2e/`（虚构示例，实际部署必须自行生成）。
- 面板 HTTPS：由 Nginx 反向代理，证书由 Let's Encrypt 签发。
- 节点协议：VLESS。
- 传输方式：TCP。
- 安全方式：REALITY。
- 节点端口：`11111/TCP`。
- REALITY 目标地址示例：`www.example.org:443`。
- SNI / Server Name 示例：`www.example.org`。
- Fingerprint：`chrome`。
- Flow：`xtls-rprx-vision`。
- 数据库：默认 SQLite，数据库文件位于 `/etc/x-ui/x-ui.db`。
- 服务名称：`x-ui.service`。
- 本指南不依赖订阅子服务器端口 `33333`；单个客户端可以直接使用 VLESS 分享链接或二维码。

不要把服务器 REALITY Private Key、面板密码、UUID、完整 VLESS 分享链接或完整订阅地址写入公开文档、公开仓库或截图。

---

## 2. 部署前准备

开始前需要准备：

1. 一台可以通过 SSH 登录的 Ubuntu 云服务器。
2. 服务器公网 IPv4 地址。
3. 一个用于管理面板的域名，例如 `panel.example.com`。
4. 域名 DNS 管理权限。
5. 云厂商安全组或防火墙的管理权限。
6. 一个可正常使用的 SSH 登录方式。

### 2.1 配置管理域名 DNS

在域名 DNS 控制台添加一条 A 记录：

- 主机记录：`panel`。
- 记录类型：`A`。
- 记录值：服务器公网 IPv4 地址。
- 解析线路：默认。
- TTL：使用默认值即可。

如果使用其他域名，将后续命令和 Nginx 配置中的 `panel.example.com` 替换为实际域名。

等待 DNS 生效后，在本地或服务器执行：

```bash
nslookup panel.example.com
```

返回的 IPv4 地址应当是这台服务器的公网 IPv4 地址。

如果配置了错误的 AAAA 记录，而服务器没有可用的 IPv6 服务，应删除或修正该 AAAA 记录，避免客户端优先连接错误的 IPv6 地址。

### 2.2 规划端口

本部署方案使用以下端口：

- `22/TCP`：SSH 管理端口。若服务器修改过 SSH 端口，应使用实际端口。
- `80/TCP`：Nginx HTTP 服务，以及 Certbot HTTP 验证。
- `443/TCP`：Nginx HTTPS 管理入口及服务器上的其他 HTTPS 网站。
- `11111/TCP`：Xray 的 VLESS + REALITY 入站。
- `22222/TCP`：3X-UI 面板内部端口，只允许本机访问，不向公网开放。
- `33333/TCP`：订阅子服务器可能使用的端口。本指南不使用订阅服务，不需要在公网开放。

不要将 `22222` 当作节点端口，也不要为了让 VLESS 节点工作而开放 `22222`。单个客户端通过二维码或 `vless://` 链接导入节点，不依赖订阅服务器。

部分版本或配置可能仍会启动订阅子服务器监听。安全组没有放行 `33333`，只代表公网访问受到阻挡，不代表监听进程已经停止。可用以下命令核实：

```bash
sudo ss -lntp | grep 33333
```

如果仍有输出，说明系统中仍有进程监听该端口。应从 3X-UI 对应的订阅服务设置中处理，并再次检查监听状态；不要为了关闭端口而直接删除 SQLite 数据库记录。

---

## 3. 更新 Ubuntu 并安装必要软件

通过 SSH 登录服务器。

更新软件包索引并升级已安装的软件：

```bash
sudo apt update
sudo apt upgrade -y
```

安装后续需要的工具：

```bash
sudo apt install -y curl ca-certificates nginx certbot python3-certbot-nginx
```

说明：

- `curl`：下载 3X-UI 官方安装脚本。
- `ca-certificates`：提供 HTTPS 证书信任链。
- `nginx`：反向代理管理面板。
- `certbot`：申请和续期 HTTPS 证书。
- `python3-certbot-nginx`：让 Certbot 自动识别和修改 Nginx 配置。

确认 Nginx 正常运行：

```bash
sudo systemctl status nginx --no-pager
```

如果 Nginx 尚未启动：

```bash
sudo systemctl enable --now nginx
```

如果服务器已经运行其他 Nginx 网站，不要覆盖原有站点配置。后续应单独创建 3X-UI 的站点配置文件。

---

## 4. 安装 3X-UI

### 4.1 使用官方安装脚本

进入 root shell：

```bash
sudo -i
```

执行 3X-UI 官方稳定版安装脚本：

```bash
bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
```

按照安装程序提示完成安装。

安装程序会安装 3X-UI、配置 systemd 服务，并生成面板登录凭据及 Web Base Path。安装完成后，立即记录以下信息并妥善保管：

- 管理员用户名。
- 管理员密码。
- 面板端口。
- Web Base Path。
- 面板访问地址。

不要把这些信息发到公开聊天、公开仓库或公开文档中。

退出 root shell：

```bash
exit
```

### 4.2 检查服务状态

```bash
sudo systemctl status x-ui --no-pager
```

查看是否设置开机自启：

```bash
sudo systemctl is-enabled x-ui
```

查看 3X-UI 管理菜单：

```bash
sudo x-ui
```

查看当前面板设置：

```bash
sudo x-ui settings
```

如果安装成功，服务应处于 `active (running)` 状态。

### 4.3 数据库位置

默认 SQLite 数据库：

```text
/etc/x-ui/x-ui.db
```

该数据库保存面板设置、入站、客户端及相关管理数据。数据库中包含敏感配置，备份文件必须限制访问权限。

本方案使用默认 SQLite，不需要为了安装 3X-UI 额外安装 PostgreSQL。日常通过 3X-UI 面板和 `x-ui` 管理命令即可，不需要额外安装系统的 `sqlite3` 命令行工具；只有需要手工查询或维护数据库时，才考虑安装它。

---

## 5. 配置 Nginx 反向代理和 HTTPS

本方案不把 3X-UI 面板端口直接暴露到公网，而是通过管理域名和 HTTPS 访问面板。

### 5.1 获取实际面板参数

从安装输出或以下命令中确认面板端口和 Web Base Path：

```bash
sudo x-ui settings
```

下面示例采用：

- 域名：`panel.example.com`。
- 面板端口：`22222`。
- Web Base Path：`/demo-7f3a9c2e/`。

必须把示例路径替换成服务器上真实的 Web Base Path。路径前后的斜杠应与面板设置保持一致。

### 5.2 创建 Nginx 站点配置

创建独立配置文件：

```bash
sudo nano /etc/nginx/sites-available/3x-ui-panel
```

写入以下内容，并替换域名、端口和随机路径：

```nginx
server {
    listen 80;
    server_name panel.example.com;

    location /demo-7f3a9c2e/ {
        proxy_pass http://127.0.0.1:22222;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

注意：

- `server_name` 必须是已经解析到本服务器的管理域名。
- `proxy_pass` 指向面板本机端口。
- `location` 必须与 3X-UI 的 Web Base Path 一致。
- 不要把面板密码、UUID 或 REALITY 私钥写进 Nginx 配置。

### 5.3 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/3x-ui-panel /etc/nginx/sites-enabled/3x-ui-panel
```

检查 Nginx 配置语法：

```bash
sudo nginx -t
```

只有出现配置测试成功后，才重新加载 Nginx：

```bash
sudo systemctl reload nginx
```

如果提示符号链接已经存在，不要重复创建；先检查 `/etc/nginx/sites-enabled/` 中是否已有对应链接。

### 5.4 申请 HTTPS 证书

执行：

```bash
sudo certbot --nginx -d panel.example.com
```

按照提示完成邮箱、服务条款和重定向选项。

完成后通过以下地址访问：

```text
https://panel.example.com/demo-7f3a9c2e/
```

如果页面无法打开，先检查：

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx -n 50 --no-pager
```

### 5.5 将面板限制为本机监听

确认 HTTPS 域名已经可以正常打开面板后，在 3X-UI 面板设置中将 Web Listen 设置为：

```text
127.0.0.1
```

面板端口设置为：

```text
22222
```

保存并按面板提示重启服务。

这样，面板只接受本机连接；外部用户通过 Nginx 的 HTTPS 入口访问。

检查监听状态：

```bash
sudo ss -lntp | grep 22222
```

预期应看到类似：

```text
127.0.0.1:22222
```

如果显示 `0.0.0.0:22222`、`*:22222` 或 `[::]:22222`，说明面板仍可能监听公网接口，应重新检查 Web Listen 设置。

### 5.6 加固面板

首次登录后完成以下事项：

1. 将管理员用户名和密码修改为强且唯一的凭据。
2. 启用 TOTP 双因素认证（2FA）。
3. 保留随机 Web Base Path，不使用 `/` 等简单路径。
4. 确认面板只监听 `127.0.0.1`。
5. 确认外部只能通过 HTTPS 管理域名访问。
6. 不在云安全组中开放面板内部端口 `22222`。

如果以后修改 Web Base Path，必须同步修改 Nginx 的 `location` 路径，否则管理域名会无法正确访问面板。

---

## 6. 配置云安全组和 Ubuntu 防火墙

### 6.1 云厂商安全组

在云厂商控制台配置入站规则：

- SSH 实际端口：只允许可信管理 IP 访问。
- TCP `80`：允许公网访问，用于 HTTP 和证书验证。
- TCP `443`：允许公网访问，用于 HTTPS 网站和面板。
- TCP `11111`：允许客户端连接 Xray 节点。
- TCP `22222`：不开放公网访问。
- TCP `33333`：本指南不使用，不开放公网访问。

如果服务器还有其他网站或服务，保留它们实际需要的端口，不要因为部署 3X-UI 而删除原有规则。

### 6.2 检查 UFW

先查看当前防火墙状态：

```bash
sudo ufw status verbose
```

如果使用 UFW，应先允许实际 SSH 端口，再允许网站和节点端口：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 11111/tcp
```

如果 SSH 使用非默认端口，应先放行实际 SSH 端口，例如：

```bash
sudo ufw allow 2222/tcp
```

只有确认 SSH 规则正确、不会锁住当前远程连接后，才启用 UFW：

```bash
sudo ufw enable
```

再次检查：

```bash
sudo ufw status numbered
```

不要在没有确认 SSH 端口的情况下直接启用防火墙。

---

## 7. 创建 VLESS + REALITY 入站

### 7.1 新建入站

登录 3X-UI 面板，进入“入站列表”，选择“添加入站”。

按照以下配置创建：

- 备注：`demo-reality`。
- 协议：`VLESS`。
- 监听端口：`11111`。
- 监听地址：按面板默认监听方式配置，确保 Xray 能从公网接口接收客户端连接。
- 总流量限制：根据实际需要设置。
- 到期时间：按实际需要设置。
- 启用：开启。

### 7.2 配置传输方式

选择：

```text
Network / 传输方式：TCP
```

TCP 传输不需要额外配置 WebSocket、gRPC 或 HTTP Upgrade。

### 7.3 配置 REALITY

安全方式选择：

```text
REALITY
```

配置以下项目：

**目标地址（Dest / Target）**

以下是格式示例，不是已验证可用的目标站点：

```text
www.example.org:443
```

目标地址必须是可正常访问、支持所需 TLS 特性的真实站点。部署前应确认服务器能够访问该站点。

**SNI / Server Names**

以下是格式示例，不是已验证可用的目标站点：

```text
www.example.org
```

SNI 必须与目标站点的证书域名相匹配。

**密钥**

在面板中生成 X25519 密钥对：

- Private Key：只保存在服务器端。
- Public Key：用于客户端配置，可以随 VLESS 分享链接发给客户端。

绝对不要把 Private Key 分享给客户端。

**Short ID**

在面板中生成十六进制 Short ID。客户端链接中的 Short ID 必须与服务器端配置的某个 Short ID 完全一致。

**Fingerprint**

设置为：

```text
chrome
```

**SpiderX**

使用面板生成或按配置填写。客户端分享链接中的相关参数必须与服务端配置匹配。

### 7.4 保存并启用入站

保存入站配置并确保状态为启用。

检查端口是否监听：

```bash
sudo ss -lntp | grep 11111
```

如果没有监听，检查入站是否启用、端口是否冲突，以及 Xray 日志是否存在配置错误。

查看服务日志：

```bash
sudo journalctl -u x-ui -n 100 --no-pager
```

---

## 8. 为每个人创建独立客户端

不要让多人长期共用同一个 UUID。每个使用者或设备应创建独立客户端，便于分别统计流量、限制配额和停用。

### 8.1 添加客户端

在 `demo-reality` 入站中选择添加客户端。

建议按以下原则填写：

- 邮箱 / Email：填写唯一标识，例如 `PC`、`iPad`、`Friend-A`。该字段主要用于面板内部识别，不要求是真实邮箱地址。
- UUID：使用面板生成的新 UUID。
- Flow：选择 `xtls-rprx-vision`。
- 流量上限：按使用需求设置，例如 10 GB、20 GB 或 50 GB。
- IP 限制：按使用场景设置；不需要限制时使用面板对应的默认值。
- HWID 限制：按使用场景设置。
- 过期时间：按实际授权期限设置。
- 备注：填写设备或使用者说明。
- 关联入站：选择 `demo-reality`。
- 启用：开启。

流量上限、IP 限制和 HWID 限制应以当前面板字段说明为准。不要因为字段填写了 `0` 就默认认为它代表某个固定含义；创建后应检查面板显示的剩余流量和限制状态。

### 8.2 Flow 必须匹配

本教程示例使用：

```text
xtls-rprx-vision
```

服务端客户端条目与分享链接中的 Flow 必须一致。若服务端启用了 Vision，而客户端链接没有正确携带 Flow，可能导致连接失败。

### 8.3 生成分享链接或二维码

保存客户端后，在客户端列表中打开二维码或分享链接。

分享链接通常以以下形式开头：

```text
vless://
```

将对应客户端的二维码或完整 VLESS 分享链接交给该客户端使用者。

注意：

- 一个客户端对应一个独立 UUID。
- 不要把服务器 REALITY Private Key 发给使用者。
- 不要把自己的管理员账号交给使用者。
- VLESS 分享链接本身包含可用于连接节点的凭据，应按密码保护。
- 如果分享链接泄露，可以在面板中禁用或删除对应客户端，并重新生成客户端凭据。

### 8.4 单个分享链接不需要订阅服务器

如果只是给一个设备导入一个节点，直接使用二维码或 `vless://` 分享链接即可。

不需要为了二维码导入而开放订阅子服务器端口 `33333`。只有明确部署和使用订阅服务时，才需要配置订阅服务器及其访问入口。

---

## 9. 客户端导入与连接

### 9.1 Windows：v2rayN

1. 安装并打开 v2rayN。
2. 复制 3X-UI 生成的完整 `vless://` 分享链接。
3. 在 v2rayN 主界面按 `Ctrl + V`，从剪贴板导入节点。
4. 确认列表中出现新节点。
5. 选择该节点并设为活动服务器。
6. 在系统代理设置中选择“自动配置系统代理”。
7. 路由选择“绕过大陆”或等效的规则模式。

Windows 系统代理只是把支持系统代理的软件请求交给本地代理入口；真正执行 VLESS、REALITY 和路由判断的是 v2rayN 启动的 Xray 核心。

关闭 Windows 系统代理后，普通应用通常不再通过系统代理入口访问节点。若启用了 TUN 模式，流量接管方式会不同。

### 9.2 iPad：V2Box

1. 打开 V2Box。
2. 使用二维码扫描或从分享链接导入节点。
3. 检查节点协议为 VLESS。
4. 保存节点。
5. 在路由设置中选择规则分流。
6. 将中国大陆域名和 IP、私有网络设置为 `direct`。
7. 将需要代理的其他流量设置为 `proxy`。
8. 启动隧道并允许 iPad 建立 VPN 配置。

V2Box 的隧道设置与 Windows 系统代理不是同一种工作方式。iPad 通过系统 VPN 隧道把符合规则的流量交给 V2Box 处理。

### 9.3 路由规则的基本目标

常见的分流目标：

```text
私有 IP / 私有域名
    -> DIRECT

中国大陆 IP / 域名
    -> DIRECT

其他未命中的目标
    -> PROXY
```

具体规则名称和匹配顺序以客户端当前版本为准。规则从上到下匹配时，应把需要优先处理的规则放在前面。

如果客户端使用全局代理，国内网站和应用也可能经过示例服务器，造成额外流量和延迟。

---

## 10. 验证节点是否正常

### 10.1 服务端验证

检查 3X-UI 服务：

```bash
sudo systemctl status x-ui --no-pager
```

检查节点端口：

```bash
sudo ss -lntp | grep 11111
```

检查面板端口：

```bash
sudo ss -lntp | grep 22222
```

预期结果：

- `11111/TCP`：Xray 对外监听，客户端可以连接。
- `22222/TCP`：只监听 `127.0.0.1`，由 Nginx 在本机反向代理访问。

### 10.2 客户端验证

客户端连接后：

1. 检查 v2rayN 或 V2Box 是否显示连接成功。
2. 使用浏览器访问一个 IP 查询网站。
3. 查询到的公网出口 IP 应是代理服务器的公网出口 IP，而不是客户端原本的公网出口 IP。
4. 访问国内网站，确认其按预期直连。
5. 访问需要代理的网站，确认其经过节点访问。
6. 在 3X-UI 客户端列表中检查对应客户端的上传、下载流量是否增加。

如果节点可以连接但某些网站打不开，应进一步检查客户端路由规则、DNS 和目标网站连通性。

---

## 11. 日常管理与维护

### 11.1 常用管理命令

打开 3X-UI 管理菜单：

```bash
sudo x-ui
```

查看面板设置：

```bash
sudo x-ui settings
```

查看服务状态：

```bash
sudo systemctl status x-ui --no-pager
```

查看最近日志：

```bash
sudo journalctl -u x-ui -n 100 --no-pager
```

实时跟踪日志：

```bash
sudo journalctl -u x-ui -f
```

重启 3X-UI：

```bash
sudo systemctl restart x-ui
```

检查监听端口：

```bash
sudo ss -lntp
```

重启服务会短暂中断现有节点连接。没有必要时不要频繁重启。

### 11.2 客户端管理

定期检查：

- 客户端是否仍然需要使用。
- 是否存在异常流量增长。
- 流量上限和剩余流量是否合理。
- 是否有客户端长期在线但无人使用。
- 分享链接是否被转发给其他人。
- 客户端是否已过期或应当停用。

发现分享链接泄露时，应禁用或删除对应客户端，而不是只修改客户端备注。

### 11.3 流量统计口径

3X-UI 的客户端流量统计用于记录经过对应客户端的代理上传量和下载量，通常按两者合计显示：

```text
客户端已用流量 = 客户端上传量 + 客户端下载量
```

云厂商流量包的统计口径可能不同。例如，某云厂商的流量包可能“仅统计服务器出流量”，应以自己的套餐说明为准。

以客户端通过节点下载文件为例：

```text
目标文件服务器
    |
    | 数据进入 VPS：服务器入流量
    v
VPS 上的 Xray
    |
    | 数据从 VPS 发给客户端：服务器出流量
    v
客户端设备
```

因此：

- 3X-UI 客户端统计的是该客户端经过代理的上传和下载数据。
- 云服务器流量包按云厂商规则统计服务器公网出流量。
- 下载文件时，VPS 向客户端发送的数据会计入服务器出流量。
- 上传文件时，VPS 向目标网站发送的数据也会计入服务器出流量。
- 两套统计范围不同，不保证数字完全一致。

如果某个客户端突然产生大量下载流量，应先确认是否正在下载文件、同步云盘、更新软件或进行测速，再判断是否异常。

### 11.4 数据库备份

3X-UI 默认 SQLite 数据库位于：

```text
/etc/x-ui/x-ui.db
```

数据库包含客户端、入站和密钥等敏感信息。备份时应限制权限，并存放在安全位置。

可在维护窗口暂停服务后备份：

```bash
backup_dir="/root/x-ui-backup-$(date +%F-%H%M%S)"
sudo systemctl stop x-ui
sudo cp -a /etc/x-ui "$backup_dir"
sudo chmod -R go-rwx "$backup_dir"
sudo systemctl start x-ui
```

同时保留 Nginx 站点配置和证书续期配置：

```text
/etc/nginx/sites-available/3x-ui-panel
/etc/letsencrypt/
```

不要把包含私钥、数据库或客户端 UUID 的备份上传到公开仓库。

### 11.5 更新 3X-UI

更新前先备份 `/etc/x-ui/` 数据。

通过管理菜单执行更新：

```bash
sudo x-ui
```

在菜单中选择更新选项，按照提示完成更新。

更新后检查：

```bash
sudo systemctl status x-ui --no-pager
sudo ss -lntp | grep 11111
sudo journalctl -u x-ui -n 100 --no-pager
```

确认面板可访问、入站正常监听、客户端可以重新连接后，再结束维护。

不要在没有备份的情况下随意切换开发版或降级旧版本。

---

## 12. 常见故障排查

### 12.1 面板域名打不开

依次检查：

```bash
nslookup panel.example.com
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo systemctl status x-ui --no-pager
sudo ss -lntp | grep 22222
```

重点检查：

- 域名 A 记录是否指向正确服务器。
- Nginx 的 `server_name` 是否正确。
- Nginx `location` 是否与 Web Base Path 完全一致。
- `proxy_pass` 端口是否与面板端口一致。
- 面板是否监听 `127.0.0.1:22222`。
- 证书是否有效。

### 12.2 客户端连接超时

检查：

1. 服务器入站是否启用。
2. Xray 是否监听 `11111/TCP`。
3. 云安全组是否允许 `11111/TCP`。
4. UFW 是否允许 `11111/TCP`。
5. 客户端填写的服务器地址和端口是否正确。
6. 服务器网络是否正常。

### 12.3 REALITY 握手失败

重点核对：

- 服务端 Private Key 与客户端 Public Key 是否属于同一密钥对。
- 客户端 Short ID 是否存在于服务端 Short IDs 列表。
- 客户端 SNI 是否与服务端 Server Names 匹配。
- Fingerprint 是否正确。
- 服务端和客户端 Flow 是否一致。
- 目标站点是否可以从服务器正常访问。
- 客户端核心版本是否兼容当前服务端 REALITY 配置。

不要把服务器 Private Key 填入客户端。

### 12.4 节点已导入但访问没有走代理

检查：

- v2rayN 是否已将节点设为活动服务器。
- Windows 是否开启自动配置系统代理。
- V2Box 是否启动 VPN 隧道。
- 客户端路由规则是否把目标流量分配到 `proxy`。
- 是否启用了 TUN 或其他会改变流量接管方式的设置。

### 12.5 客户端流量突然增加

先查看该客户端的实时速度和累计流量，再询问使用者是否正在下载文件、同步云盘、更新系统或测速。

Windows 可以运行：

```text
resmon
```

在资源监视器的“网络”选项卡中查看网络活动。由于代理流量可能集中显示为 Xray 进程的连接，必要时还要检查浏览器下载列表、扩展程序和后台同步软件。

---

## 13. 部署完成验收清单

全部完成后逐项核对：

- [ ] Ubuntu 软件包已更新。
- [ ] 3X-UI 已通过官方安装脚本安装。
- [ ] `x-ui.service` 处于运行状态并设置开机自启。
- [ ] 已记录并妥善保存面板登录凭据。
- [ ] 管理域名 A 记录指向服务器公网 IP。
- [ ] Nginx 反向代理可以访问 3X-UI。
- [ ] 管理域名 HTTPS 证书有效。
- [ ] 面板 Web Listen 为 `127.0.0.1`。
- [ ] 面板端口 `22222` 没有向公网开放。
- [ ] 管理员密码已修改并启用 2FA。
- [ ] 云安全组和 UFW 已放行 `11111/TCP`。
- [ ] VLESS + REALITY 入站已创建并启用。
- [ ] Xray 正在监听 `11111/TCP`。
- [ ] 已创建独立客户端 UUID。
- [ ] 客户端 Flow 为 `xtls-rprx-vision`。
- [ ] 已成功生成并导入 VLESS 分享链接或二维码。
- [ ] Windows v2rayN 或 iPad V2Box 可以成功连接。
- [ ] 客户端公网出口 IP 与服务器公网出口 IP 相符。
- [ ] 国内直连、其他流量代理的分流规则符合预期。
- [ ] 已完成数据库备份。
- [ ] 未向公网开放不需要的 `33333/TCP` 等端口。

---

## 14. 官方参考资料

以下链接用于核对安装命令、面板安全设置和 REALITY 参数。升级或重新部署前，应优先查看官方文档的最新说明。

- 3X-UI 官方 GitHub 仓库：<https://github.com/MHSanaei/3x-ui>
- 3X-UI 官方安装文档：<https://docs.sanaei.dev/zh/docs/guide/installation/>
- 3X-UI 首次登录与安全加固：<https://docs.sanaei.dev/zh/docs/guide/first-login/>
- 3X-UI REALITY 配置：<https://docs.sanaei.dev/docs/config/reality/>
- 3X-UI Nginx 反向代理：<https://docs.sanaei.dev/docs/operations/reverse-proxy/>

---

## 15. 安全注意事项

1. 只给可信任的使用者分配客户端。
2. 每个使用者或设备单独创建 UUID，不长期共用同一个客户端。
3. 不向客户端发送 REALITY Private Key。
4. 不公开面板管理员密码、随机 Web Base Path、数据库和完整分享链接。
5. 面板只通过 HTTPS 管理域名访问，内部端口只监听 `127.0.0.1`。
6. 云安全组只开放实际需要的端口。
7. 定期检查客户端流量和在线状态。
8. 发现分享链接泄露时，禁用或删除对应客户端。
9. 服务器备份和数据库文件按敏感数据保护。
10. 节点使用者的公网访问会从服务器出口发出，服务器公网 IP 会成为目标网站看到的来源 IP。应明确客户端使用范围和责任边界。
