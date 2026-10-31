---
title: "Hydra 与 Kali Linux"
description: "授权实验环境中的口令安全测试工具、参数与使用记录。"
order: 5
icon: "shield-check"
tags: ["Kali Linux","Hydra","安全测试"]
sources: ["Hydra_Kali_使用指南.md"]
---

> 来源：Kali Linux 官方工具页面  
> https://www.kali.org/tools/hydra/  
> 整理日期：2026-10-04  
>
> 本文用于授权环境中的安全测试、实验靶场和学习。不要对未授权的主机、账号或服务进行口令尝试。

---

## 一、Hydra 是什么

Hydra 是一个并行化的网络登录口令测试工具，主要用于测试网络服务的账号/密码安全性。

它可以针对多种远程登录服务进行用户名和密码组合测试，例如：

- SSH
- FTP
- HTTP / HTTPS
- HTTP GET / POST 表单
- MySQL
- PostgreSQL
- MSSQL
- SMB / SMB2
- RDP
- VNC
- Telnet
- SMTP
- POP3
- IMAP
- LDAP
- Redis
- SOCKS5
- SNMP
- XMPP

Hydra 的特点是：

- 支持大量网络协议
- 可以并行执行多个登录尝试
- 可以使用单个用户名、单个密码
- 可以使用用户名文件、密码字典
- 可以直接读取 `用户名:密码` 组合文件
- 可以保存结果
- 可以恢复中断的会话
- 可以针对多个目标执行测试

---

## 二、安装 Hydra

Kali Linux 中通常已经自带 Hydra。

如果没有安装：

```bash
sudo apt install hydra
```

查看版本和帮助：

```bash
hydra -h
```

官方页面当前展示的版本为：

```text
Hydra v9.7
```

---

## 三、Hydra 的基本命令结构

Hydra 最常见的命令结构是：

```bash
hydra [用户名参数] [密码参数] [其他参数] 协议://目标
```

例如：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

含义：

```text
hydra
│
├── -l test
│   └── 指定单个用户名 test
│
├── -P passwords.txt
│   └── 从 passwords.txt 中读取密码
│
└── ssh://192.168.1.100
    ├── ssh     → 要测试的服务
    └── 192.168.1.100 → 目标主机
```

Hydra 的核心就是确定四件事：

```text
用户名
   ↓
密码
   ↓
目标地址
   ↓
目标服务
```

然后 Hydra 根据这些信息组合登录尝试。

---

## 四、用户名参数

### 1. `-l`：指定一个用户名

格式：

```bash
-l 用户名
```

例如：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

表示：

```text
用户名固定为 test
密码从 passwords.txt 中逐个读取
```

---

### 2. `-L`：读取用户名列表

格式：

```bash
-L 用户名文件
```

例如：

```bash
hydra -L users.txt -P passwords.txt ssh://192.168.1.100
```

假设：

```text
users.txt
```

内容为：

```text
admin
root
test
user
```

Hydra 会从这个文件中读取多个用户名。

注意：

```text
-l = 单个用户名
-L = 用户名字典
```

大小写不能混淆。

---

## 五、密码参数

### 1. `-p`：指定一个密码

格式：

```bash
-p 密码
```

例如：

```bash
hydra -L users.txt -p password123 ssh://192.168.1.100
```

表示：

```text
用户名从 users.txt 中读取
密码固定为 password123
```

---

### 2. `-P`：读取密码字典

格式：

```bash
-P 密码文件
```

例如：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

如果：

```text
passwords.txt
```

内容为：

```text
123456
password
admin123
qwerty
test123
```

Hydra 会逐个尝试这些密码。

注意：

```text
-p = 单个密码
-P = 密码字典
```

---

## 六、用户名和密码的四种常见组合

### 固定用户名 + 密码字典

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

适合：

```text
已知用户名
未知密码
```

---

### 用户名字典 + 固定密码

```bash
hydra -L users.txt -p password123 ssh://192.168.1.100
```

适合：

```text
未知用户名
已知或需要测试某个默认密码
```

---

### 用户名字典 + 密码字典

```bash
hydra -L users.txt -P passwords.txt ssh://192.168.1.100
```

Hydra 会尝试用户名和密码的组合。

例如：

```text
admin + 123456
admin + password
admin + qwerty

root + 123456
root + password
root + qwerty
```

---

### `-C`：直接读取 `用户名:密码`

格式：

```bash
-C 文件
```

文件内容：

```text
admin:admin123
root:root123
test:test123
```

使用：

```bash
hydra -C accounts.txt ssh://192.168.1.100
```

这种方式不会把所有用户名和所有密码交叉组合，而是直接使用文件中已经写好的账号密码对。

---

## 七、指定服务和目标

Hydra 常见的目标格式：

```bash
协议://IP
```

例如：

```bash
ssh://192.168.1.100
```

```bash
ftp://192.168.1.100
```

```bash
mysql://192.168.1.100
```

也可以使用域名：

```bash
ssh://example.local
```

---

## 八、指定端口

### `-s`

如果服务没有运行在默认端口，可以使用：

```bash
-s PORT
```

例如 SSH 默认端口是：

```text
22
```

如果实验环境将 SSH 放在：

```text
2222
```

可以写：

```bash
hydra -l test -P passwords.txt -s 2222 ssh://192.168.1.100
```

也可以在目标中指定端口：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100:2222
```

---

## 九、控制并发数量

### `-t`

格式：

```bash
-t TASKS
```

表示：

```text
针对单个目标同时运行多少个连接任务
```

Hydra 9.7 默认值为：

```text
16
```

例如：

```bash
hydra -l test -P passwords.txt -t 6 ssh://192.168.1.100
```

表示最多使用 6 个并行任务。

Kali 官方页面给出的 SSH 示例就是：

```bash
hydra -l root -P /usr/share/wordlists/metasploit/unix_passwords.txt -t 6 ssh://192.168.1.123
```

其中：

```text
-l root
```

固定用户名 root。

```text
-P /usr/share/wordlists/metasploit/unix_passwords.txt
```

使用 Kali 自带的密码字典。

```text
-t 6
```

使用 6 个并行任务。

```text
ssh://192.168.1.123
```

目标是该主机上的 SSH 服务。

并发数并不是越高越好。

过高可能导致：

- 服务拒绝连接
- 连接超时
- 实验环境负载过高
- IDS / IPS 或登录保护机制触发
- 测试结果不稳定

---

## 十、找到有效账号后停止

### `-f`

```bash
-f
```

当针对一个目标找到一组有效账号密码后停止。

例如：

```bash
hydra -l test -P passwords.txt -f ssh://192.168.1.100
```

---

### `-F`

主要配合多个目标使用。

```bash
-F
```

找到有效登录后全局停止测试。

官方帮助中说明：

```text
-f → 对每台主机分别停止
-F → 全局停止
```

---

## 十一、保存测试结果

### `-o`

格式：

```bash
-o 文件名
```

例如：

```bash
hydra -l test -P passwords.txt -o result.txt ssh://192.168.1.100
```

找到的有效账号密码会保存到：

```text
result.txt
```

---

### `-b`

控制输出格式。

支持：

```text
text
json
jsonv1
```

例如：

```bash
hydra -l test -P passwords.txt -o result.json -b json ssh://192.168.1.100
```

---

## 十二、查看运行过程

Hydra 提供三种常见输出级别。

### `-v`

Verbose：

```bash
-v
```

显示较详细的运行信息。

---

### `-V`

显示每一次用户名和密码尝试：

```bash
-V
```

例如：

```bash
hydra -l test -P passwords.txt -V ssh://192.168.1.100
```

实验学习时非常直观，但密码字典较大时会产生大量终端输出。

---

### `-d`

Debug：

```bash
-d
```

用于显示调试信息。

一般排查模块、连接或协议问题时使用。

---

## 十三、连接超时与尝试间隔

### `-w`

控制等待服务器响应的时间。

官方默认值：

```text
32 秒
```

---

### `-W`

设置同一线程两次连接之间等待多久。

---

### `-c`

设置每次登录尝试之间的全局等待时间。

使用 `-c` 时 Hydra 会强制：

```text
-t 1
```

也就是单线程运行。

---

## 十四、SSL / TLS

### `-S`

```bash
-S
```

表示使用 SSL 连接。

不过很多协议本身也具有带 TLS 的服务名称，例如：

```text
ftps
https
imaps
pop3s
smtps
telnets
```

应优先根据实际服务模块选择正确协议。

---

## 十五、IPv4 与 IPv6

### IPv4

```bash
-4
```

Hydra 默认使用 IPv4。

---

### IPv6

```bash
-6
```

IPv6 地址要使用方括号。

例如：

```bash
hydra -C accounts.txt -6 pop3s://[2001:db8::1]:143
```

---

## 十六、多目标测试

### `-M`

格式：

```bash
-M targets.txt
```

`targets.txt` 中每行一个目标。

例如：

```text
192.168.1.10
192.168.1.11
192.168.1.12
```

使用：

```bash
hydra -L users.txt -P passwords.txt -M targets.txt ssh
```

官方帮助中也给出了这种写法。

---

### `-T`

当使用：

```bash
-M
```

测试多个目标时：

```bash
-T TASKS
```

控制所有目标合计的并发连接数。

官方默认值：

```text
64
```

区别：

```text
-t → 单个目标的并发任务数
-T → 多目标情况下总并发任务数
```

---

## 十七、特殊密码尝试

### `-e`

Hydra 支持额外尝试三种情况：

```bash
-e nsr
```

三个字母分别表示：

```text
n = null
    尝试空密码

s = same
    尝试“用户名 = 密码”

r = reverse
    尝试用户名反转作为密码
```

例如用户名：

```text
admin
```

可能额外测试：

```text
空密码
admin
nimda
```

例如：

```bash
hydra -l admin -P passwords.txt -e nsr ssh://192.168.1.100
```

---

## 十八、Hydra 自己生成密码

Hydra 不一定必须使用密码字典，也可以使用：

```bash
-x
```

生成字符组合。

基本格式：

```bash
-x MIN:MAX:CHARSET
```

其中：

```text
MIN
```

最短密码长度。

```text
MAX
```

最长密码长度。

```text
CHARSET
```

使用的字符集合。

查看详细帮助：

```bash
hydra -x -h
```

这种方式组合数量可能增长得非常快，因此在学习时应控制长度和字符范围。

---

## 十九、用户优先循环

### `-u`

默认情况下 Hydra 的组合顺序主要围绕密码进行。

使用：

```bash
-u
```

后会以用户为主要循环维度。

官方说明中指出，使用 `-x` 时会隐式启用这一模式。

---

## 二十、恢复中断任务

### `-R`

```bash
hydra -R
```

恢复之前中止或崩溃的 Hydra 会话。

---

### `-I`

```bash
-I
```

忽略已经存在的恢复文件，不等待恢复提示。

---

## 二十一、查看特定协议模块帮助

### `-U`

不同协议的登录过程不同。

因此遇到特殊协议时，不应该只死记命令，而应该先查看模块帮助。

基本方式：

```bash
hydra -U 服务名
```

例如：

```bash
hydra -U ssh
```

或：

```bash
hydra -U http-post-form
```

Hydra 会显示该模块需要的额外参数。

这是学习 Hydra 时非常重要的一条：

```text
先确定目标服务
        ↓
查看对应模块帮助
        ↓
再构造命令
```

---

## 二十二、常见协议示例

以下示例只用于你自己的实验机、靶场或明确授权环境。

---

### SSH

固定用户名 + 密码字典：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

带详细输出：

```bash
hydra -l test -P passwords.txt -V ssh://192.168.1.100
```

指定并发：

```bash
hydra -l test -P passwords.txt -t 4 ssh://192.168.1.100
```

---

### FTP

Kali 官方帮助中的示例：

```bash
hydra -l user -P passlist.txt ftp://192.168.0.1
```

含义：

```text
用户名：user
密码：passlist.txt
协议：FTP
目标：192.168.0.1
```

---

### IMAP

官方示例：

```bash
hydra -L userlist.txt -p defaultpw imap://192.168.0.1/PLAIN
```

表示：

```text
用户名 → userlist.txt
密码   → defaultpw
服务   → IMAP
认证方式 → PLAIN
```

---

### 多台 SSH 主机

官方示例：

```bash
hydra -L logins.txt -P pws.txt -M targets.txt ssh
```

表示：

```text
logins.txt
      ↓
用户名列表

pws.txt
      ↓
密码列表

targets.txt
      ↓
目标主机列表

ssh
      ↓
所有目标测试 SSH 服务
```

---

## 二十三、Kali 自带字典与 Hydra

Kali 中：

```bash
/usr/share/wordlists/
```

是常用字典入口。

例如 Kali 官方 Hydra 示例使用：

```bash
/usr/share/wordlists/metasploit/unix_passwords.txt
```

命令：

```bash
hydra -l root \
-P /usr/share/wordlists/metasploit/unix_passwords.txt \
-t 6 \
ssh://192.168.1.123
```

如果使用其他字典，只需要把：

```bash
-P 字典路径
```

改成对应文件即可。

---

## 二十四、pw-inspector：筛选密码字典

Hydra 软件包还提供：

```bash
pw-inspector
```

它不是直接执行登录测试，而是用于筛选密码字典。

例如官方示例：

```bash
pw-inspector \
-i /usr/share/wordlists/nmap.lst \
-o /root/passes.txt \
-m 6 \
-M 10
```

含义：

```text
-i /usr/share/wordlists/nmap.lst
```

输入文件。

```text
-o /root/passes.txt
```

输出文件。

```text
-m 6
```

密码最短长度 6。

```text
-M 10
```

密码最长长度 10。

因此：

```text
原始字典
   ↓
pw-inspector
   ↓
根据规则筛选
   ↓
更小的密码字典
   ↓
Hydra
```

---

### pw-inspector 的字符规则

```text
-l
```

要求包含小写字母。

```text
-u
```

要求包含大写字母。

```text
-n
```

要求包含数字。

```text
-p
```

要求包含可打印符号。

```text
-s
```

要求包含其他特殊字符。

```text
-c MINSETS
```

要求至少满足多少种字符集合。

---

## 二十五、hydra-wizard

Hydra 还提供：

```bash
hydra-wizard
```

它是命令行向导。

启动：

```bash
hydra-wizard
```

向导会依次询问：

```text
1. 要测试什么服务
2. 目标是什么
3. 用户名或用户名字典
4. 密码或密码字典
5. 是否测试空密码、用户名等特殊情况
6. 目标端口
```

最后生成并执行对应的 Hydra 命令。

对于刚开始接触 Hydra 的用户，`hydra-wizard` 可以帮助理解命令参数之间的关系。

---

## 二十六、xHydra 图形界面

Hydra 还有 GTK 图形界面：

```text
xhydra
```

安装：

```bash
sudo apt install hydra-gtk
```

启动：

```bash
xhydra
```

本质上：

```text
xHydra
   ↓
图形界面
   ↓
最终仍然调用 Hydra
```

学习阶段建议优先掌握命令行版，因为命令行参数能更清楚地反映 Hydra 的工作逻辑。

---

## 二十七、常见参数速查表

| 参数 | 作用 |
|---|---|
| `-l LOGIN` | 指定单个用户名 |
| `-L FILE` | 从文件读取用户名 |
| `-p PASS` | 指定单个密码 |
| `-P FILE` | 从文件读取密码 |
| `-C FILE` | 读取 `用户名:密码` 文件 |
| `-s PORT` | 指定非默认端口 |
| `-S` | 使用 SSL 连接 |
| `-t TASKS` | 单目标并发任务数 |
| `-T TASKS` | 多目标总并发任务数 |
| `-M FILE` | 从文件读取多个目标 |
| `-f` | 单目标找到有效账号后停止 |
| `-F` | 多目标测试中找到有效账号后全局停止 |
| `-o FILE` | 保存结果 |
| `-b FORMAT` | 指定输出格式 |
| `-v` | 详细输出 |
| `-V` | 显示每一次登录尝试 |
| `-d` | 调试模式 |
| `-w TIME` | 等待响应时间 |
| `-W TIME` | 每线程连接之间的等待时间 |
| `-c TIME` | 全局登录尝试间隔 |
| `-e nsr` | 测试空密码、用户名作密码、反转用户名 |
| `-x` | 根据规则生成密码组合 |
| `-u` | 以用户名为主要循环 |
| `-R` | 恢复之前的会话 |
| `-I` | 忽略已有恢复文件 |
| `-4` | IPv4 |
| `-6` | IPv6 |
| `-U` | 查看协议模块帮助 |
| `-m OPT` | 指定模块特有选项 |
| `-h` | 显示完整帮助 |

---

## 二十八、Hydra 的使用逻辑

不要把 Hydra 理解成一个“输入一条固定命令就完事”的工具。

更正确的使用思路是：

```text
确认目标服务
        ↓
确认目标端口
        ↓
确认登录方式
        ↓
准备用户名
        ↓
准备密码 / 密码字典
        ↓
查看对应 Hydra 模块
        ↓
设置合理并发
        ↓
执行测试
        ↓
观察结果
```

例如：

```text
192.168.1.100
        ↓
22 端口开放
        ↓
SSH 服务
        ↓
已知用户名 test
        ↓
准备 passwords.txt
        ↓
hydra -l test -P passwords.txt ssh://192.168.1.100
```

这才是 Hydra 真正的基本工作流程。

---

## 二十九、最需要掌握的命令

如果只是学习 Hydra，优先掌握下面这些。

查看帮助：

```bash
hydra -h
```

固定用户名 + 密码字典：

```bash
hydra -l test -P passwords.txt ssh://192.168.1.100
```

用户名字典 + 密码字典：

```bash
hydra -L users.txt -P passwords.txt ssh://192.168.1.100
```

固定用户名 + 固定密码：

```bash
hydra -l test -p password123 ssh://192.168.1.100
```

指定端口：

```bash
hydra -l test -P passwords.txt -s 2222 ssh://192.168.1.100
```

显示每次尝试：

```bash
hydra -l test -P passwords.txt -V ssh://192.168.1.100
```

保存结果：

```bash
hydra -l test -P passwords.txt -o result.txt ssh://192.168.1.100
```

查看模块帮助：

```bash
hydra -U ssh
```

恢复任务：

```bash
hydra -R
```

---

## 三十、一句话理解 Hydra

Hydra 本身不会“破解加密算法”。

它做的事情更接近：

```text
准备候选用户名和密码
        ↓
按照目标协议真正发起登录
        ↓
服务器判断登录成功或失败
        ↓
Hydra 自动重复这个过程
        ↓
找到有效的用户名 + 密码组合
```

所以 Hydra 属于：

```text
在线口令测试 / 网络登录测试工具
```

而不是：

```text
离线 Hash 破解工具
```

像 John the Ripper、Hashcat 更常用于针对已经获得的密码 Hash 进行离线破解，两类工具的工作位置不同。

---

### 参考资料

Kali Linux 官方 Hydra 页面：

https://www.kali.org/tools/hydra/

Hydra 官方项目：

https://github.com/vanhauser-thc/thc-hydra
