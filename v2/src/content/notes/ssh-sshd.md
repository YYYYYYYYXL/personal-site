---
title: "SSH 与 SSHD"
description: "远程登录、密钥认证、Windows / Linux 服务配置与故障排查。"
order: 1
icon: "terminal-window"
tags: ["SSH","Linux","Windows"]
sources: ["SSH与SSHD完整知识整理_合并版.md"]
---

## 1. SSH 与 SSHD 基础概念

### SSH

SSH（Secure
Shell）是一种远程登录协议，用于通过网络安全地连接另一台机器。

基本结构：

    客户端
    ssh 命令
        ↓
    网络
        ↓
    服务端
    sshd 服务

SSH不是Linux专属：

-   Linux → Linux
-   Windows → Linux
-   Linux → Windows
-   Windows → Windows

均可以使用。

------------------------------------------------------------------------

### SSHD

sshd（SSH daemon）是 SSH 服务端程序。

作用：

-   监听 SSH 连接请求
-   验证用户身份
-   创建远程终端
-   提供 SCP/SFTP 文件传输能力

Linux：

    sshd

Windows：

    OpenSSH SSH Server (sshd)

------------------------------------------------------------------------

## 2. SSH 登录命令

### 基本格式

``` bash
ssh 用户名@IP地址
```

例如：

``` bash
ssh root@192.168.1.100
```

说明：

-   ssh：启动SSH客户端
-   用户名：目标机器用户
-   IP：目标机器地址

------------------------------------------------------------------------

### 指定端口

SSH默认端口：

    22

指定端口：

``` bash
ssh 用户名@IP -p 端口
```

例如：

``` bash
ssh root@服务器IP -p 2222
```

说明：

-   `-p` 是 ssh 客户端参数
-   服务器修改端口后需要指定

------------------------------------------------------------------------

## 3. SCP 文件传输

scp基于SSH协议。

### 上传文件

本机 → 远程：

``` bash
scp 文件 用户名@IP:目标路径
```

例如：

``` bash
scp test.txt root@192.168.1.100:/root/
```

------------------------------------------------------------------------

### 下载文件

远程 → 本机：

``` bash
scp 用户名@IP:远程文件 本地路径
```

------------------------------------------------------------------------

## 4. Windows OpenSSH Server

### 查看SSH服务

PowerShell：

``` powershell
Get-Service sshd
```

状态：

    Running

表示服务运行。

    Stopped

表示服务停止。

------------------------------------------------------------------------

### 启动服务

``` powershell
Start-Service sshd
```

------------------------------------------------------------------------

### 停止服务

``` powershell
Stop-Service sshd
```

------------------------------------------------------------------------

### 设置开机启动

``` powershell
Set-Service -Name sshd -StartupType Automatic
```

------------------------------------------------------------------------

## 5. sshd 配置文件

### 配置文件作用

sshd_config 是 SSH 服务端配置文件。

控制：

-   SSH监听端口
-   登录方式
-   密码认证
-   用户权限

Windows默认位置：

    C:\ProgramData\ssh\sshd_config

Linux：

    /etc/ssh/sshd_config

------------------------------------------------------------------------

## 6. 使用 sshd -t 检查配置

命令：

``` powershell
sshd -t
```

作用：

检查 SSH 服务端配置文件语法。

正常：

    没有任何输出

表示配置正确。

------------------------------------------------------------------------

## 7. sshd_config 不存在故障处理

### 故障现象

执行：

``` powershell
sshd -t
```

出现：

    __PROGRAMDATA__\ssh/sshd_config:
    No such file or directory

含义：

OpenSSH Server 找不到配置文件。

不是：

-   密码错误
-   用户错误
-   防火墙问题
-   SSH密钥问题

------------------------------------------------------------------------

### 第一步：检查配置目录

执行：

``` powershell
dir C:\ProgramData\ssh
```

正常应该有：

    sshd_config

以及：

    ssh_host_rsa_key
    ssh_host_ed25519_key

------------------------------------------------------------------------

### 第二步：查看默认模板

进入：

``` powershell
cd C:\Windows\System32\OpenSSH
```

查看：

``` powershell
dir
```

寻找：

    sshd_config_default

------------------------------------------------------------------------

### 第三步：复制默认配置

执行：

``` powershell
copy .\sshd_config_default C:\ProgramData\ssh\sshd_config
```

生成：

    C:\ProgramData\ssh\sshd_config

------------------------------------------------------------------------

### 第四步：生成服务器密钥

如果缺少：

    ssh_host_rsa_key
    ssh_host_ed25519_key

执行：

``` powershell
ssh-keygen -A
```

作用：

生成 SSH 服务端身份密钥。

------------------------------------------------------------------------

### 第五步：重新检查并启动

检查：

``` powershell
sshd -t
```

启动：

``` powershell
Start-Service sshd
```

确认：

``` powershell
Get-Service sshd
```

显示：

    Running

------------------------------------------------------------------------

### 如果没有 sshd_config_default

可能：

-   OpenSSH Server安装异常
-   Windows组件安装不完整

解决：

重新安装：

    设置
    → 应用
    → 可选功能
    → OpenSSH Server

或者：

``` powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~203.0.113.10
```

------------------------------------------------------------------------

## 8. SSH密钥体系

SSH有三类容易混淆的密钥。

### ① 服务端主机密钥

位置：

    C:\ProgramData\ssh\

例如：

    ssh_host_rsa_key
    ssh_host_ed25519_key

作用：

证明服务器身份。

------------------------------------------------------------------------

### ② 用户公钥认证

位置：

    ~/.ssh/authorized_keys

作用：

免密码登录。

------------------------------------------------------------------------

### ③ 用户密码认证

SSH也可以：

    用户名 + 密码

登录。

不需要提前配置公钥。

------------------------------------------------------------------------

## 9. Windows 用户与SSH登录

查看用户名：

``` powershell
whoami
```

例如：

    DESKTOP\Tom

用户名：

    Tom

查看：

``` powershell
$env:USERNAME
```

------------------------------------------------------------------------

查看账户：

``` powershell
net user 用户名
```

------------------------------------------------------------------------

### 创建SSH专用用户

``` powershell
net user sshuser 密码 /add
```

例如：

``` powershell
net user sshuser Test123456 /add
```

登录：

``` powershell
ssh sshuser@IP
```

------------------------------------------------------------------------

## 10. Radmin VPN + SSH

Radmin VPN提供虚拟局域网。

结构：

    Windows A
     |
     | Radmin IP
     |
    Windows B
     |
     | sshd

要求：

1.  两台加入同一个Radmin网络
2.  可以ping通
3.  sshd运行
4.  用户密码正确

连接：

``` powershell
ssh 用户名@RadminIP
```

------------------------------------------------------------------------

## 11. SSH故障排查流程

### 第一步：网络

``` powershell
ping IP
```

失败：

检查网络。

------------------------------------------------------------------------

### 第二步：端口

``` powershell
Test-NetConnection IP -Port 22
```

查看：

    TcpTestSucceeded

True：

端口正常。

------------------------------------------------------------------------

### 第三步：服务

``` powershell
Get-Service sshd
```

必须：

    Running

------------------------------------------------------------------------

### 第四步：配置

``` powershell
sshd -t
```

错误：

优先检查：

    C:\ProgramData\ssh\sshd_config

------------------------------------------------------------------------

### 第五步：认证

检查：

-   用户名
-   密码
-   密钥配置

------------------------------------------------------------------------

## 12. Windows 与 Linux SSH 对比

  项目       Linux                  Windows
  ---------- ---------------------- ---------------------------------------------------------
  服务端     sshd                   OpenSSH SSH Server
  客户端     ssh                    ssh
  文件传输   scp                    scp
  配置文件   /etc/ssh/sshd_config   C:`\ProgramData`{=tex}`\ssh`{=tex}`\sshd`{=tex}\_config
  服务管理   systemctl              PowerShell

------------------------------------------------------------------------

## 13. 本次Windows SSH故障案例总结

实际排查流程：

    SSH连接失败
            ↓
    Radmin VPN检查
            ↓
    ping成功
            ↓
    网络正常
            ↓
    检查sshd服务
            ↓
    发现sshd启动失败
            ↓
    执行 sshd -t
            ↓
    发现 sshd_config 不存在
            ↓
    复制默认配置文件
            ↓
    生成服务器密钥
            ↓
    启动sshd
            ↓
    SSH连接

核心思想：

    网络通
     ↓
    端口通
     ↓
    sshd运行
     ↓
    配置文件正确
     ↓
    用户认证成功
     ↓
    SSH登录成功
