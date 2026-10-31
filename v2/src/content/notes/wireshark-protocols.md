---
title: "Wireshark 与网络协议"
description: "从抓包界面与过滤器，到 TCP、DNS、TLS 和常见协议的理解。"
order: 4
icon: "network"
tags: ["Wireshark","TCP/IP","DNS"]
sources: ["Wireshark与常用网络协议学习笔记_最终版.md"]
---

本文整理 Wireshark 抓包分析中常用的协议知识，并把“协议原理”和“Wireshark 中重点观察的字段”放在一起。

---

## 1. Wireshark 基础

### 1.1 Wireshark 是什么

Wireshark 可以理解成“网络显微镜”。

电脑联网时，数据会经过网卡，以一个个网络数据包（Packet）的形式传输。Wireshark 可以把经过指定网络接口的数据包捕获下来，并展示：

- 源 MAC / 目标 MAC
- 源 IP / 目标 IP
- 协议类型
- 源端口 / 目标端口
- TCP Flags
- DNS 查询与响应
- ICMP 请求与响应
- TLS 握手
- 其他协议字段

### 1.2 什么叫抓包

抓包就是：

> 捕获经过某个网络接口的数据包，并保存或显示出来进行分析。

例如 Windows 当前通过 Wi-Fi 上网：

```text
浏览器
  ↓
Windows 网络协议栈
  ↓
Wi-Fi 网卡
  ↓
路由器
  ↓
互联网
```

如果 Wireshark 监听 Wi-Fi 网卡，就能看到经过该网卡的数据。

Wireshark 一般不是“截断”流量，而是观察并复制一份数据用于分析。

### 1.3 Windows 抓包与 Npcap

Windows 上 Wireshark 实际抓取网卡流量主要依赖 Npcap。

常见安装组件说明：

- Wireshark：安装
- TShark：建议安装
- Npcap：必须安装
- USBPcap：当前不用
- 802.11 Monitor Mode：当前不用
- WinPcap API-compatible Mode：当前不用
- Restrict Npcap to administrators：当前不用

### 1.4 Wireshark 三个主要区域

#### Packet List：上方数据包列表

常见列：

```text
No.   Time   Source   Destination   Protocol   Length   Info
```

重点：

- `No.`：数据包编号
- `Time`：抓包后的相对时间
- `Source`：源地址
- `Destination`：目标地址
- `Protocol`：协议
- `Length`：长度
- `Info`：Wireshark 对该包的简要解释

#### Packet Details：中间协议详情

一个包通常按层展开：

```text
Frame
└─ Ethernet II
   └─ Internet Protocol Version 4
      └─ TCP / UDP / ICMP
         └─ DNS / TLS / HTTP ...
```

这是当前学习最重要的区域。

#### Packet Bytes：下方原始字节

显示十六进制原始数据。

普通协议分析中通常不需要直接阅读原始十六进制字节。

### 1.5 No. 左边的竖线 / 箭头

这是 Wireshark 根据数据分析后画出的“相关包关系线”，不是协议本身的字段。

它可能帮助表示：

- 请求与响应
- 同一 TCP Conversation
- ACK 对应关系
- 重传关系
- 数据重组关系

---

## 2. Wireshark 常用过滤器

### 2.1 按协议过滤

```text
icmp
arp
dns
tcp
udp
tls
```

### 2.2 按 IP 过滤

源或目标只要包含该 IP：

```text
ip.addr == 8.8.8.8
```

只看发往某 IP：

```text
ip.dst == 8.8.8.8
```

只看从某 IP 发来：

```text
ip.src == 8.8.8.8
```

### 2.3 TCP + 指定 IP

```text
tcp and ip.addr == 203.0.113.10
```

### 2.4 TCP + 指定端口

```text
tcp.port == 443
```

组合：

```text
tcp and ip.addr == 203.0.113.10 and tcp.port == 443
```

### 2.5 只看带 SYN 的 TCP 包

```text
tcp.flags.syn == 1
```

注意：

这个过滤器只能看到带 SYN 的包，例如：

```text
SYN
SYN,ACK
```

第三次握手通常只有 ACK，因此会被过滤掉。

---

## 3. Ethernet II（二层）


### 3.1 Ethernet II 主要解决什么

核心：

> MAC 地址负责“当前这一跳把帧交给谁”。

### 3.2 Wireshark 中重点看什么

展开：

```text
Ethernet II
```

重点字段：

```text
Source
Destination
```

例如：

```text
Src MAC = bc:03:58:8c:49:8e
Dst MAC = 58:69:6c:a5:9d:93
```

### 3.3 同网段与跨网段

#### 同网段

例如：

```text
自己：192.168.1.10/24
目标：192.168.1.20/24
```

目标 MAC 通常就是目标主机自己的 MAC。

#### 跨网段

例如：

```text
自己：10.31.92.50
目标：8.8.8.8
```

目标 IP 仍然是：

```text
8.8.8.8
```

但 Ethernet 目标 MAC 通常是：

```text
默认网关 MAC
```

核心记忆：

> IP 管最终目的地，MAC 管当前这一跳。

### 3.4 为什么经过路由器后 MAC 会变化

路由器收到帧后：

1. 去掉当前 Ethernet 头
2. 查看目标 IP
3. 查路由表
4. 选择下一跳
5. 重新封装新的二层头

所以不同链路上的 MAC 会变化。

IP 一般保持端到端不变，除非经过 NAT 等机制。

### 3.5 IG bit

`IG = Individual / Group`

```text
IG = 0
→ Individual
→ 单播地址

IG = 1
→ Group
→ 组播地址
```

该字段用于区分单播与组地址。

### 3.6 LG bit

常见也叫 U/L bit：

```text
LG = 0
→ 全球厂商管理地址

LG = 1
→ 本地管理地址
```

本地管理地址常见于：

- 虚拟机
- 虚拟网卡
- 手动修改 MAC
- Wi-Fi 随机 MAC
- 部分 VPN / 虚拟网络

该字段用于区分全球管理地址与本地管理地址。

---

## 4. IPv4（三层）


### 4.1 IPv4 主要解决什么

核心：

> IP 地址表示数据最终要去哪里。

### 4.2 Wireshark 中重点看什么

展开：

```text
Internet Protocol Version 4
```

重点：

- Version
- Header Length
- Total Length
- Identification
- Flags
- Fragment Offset
- TTL
- Protocol
- Source Address
- Destination Address

### 4.3 Version

```text
Version: 4
```

表示这是 IPv4。

### 4.4 Header Length

例如：

```text
Header Length: 20 bytes (5)
```

这里 `(5)` 表示 5 个 32-bit 单位：

```text
5 × 4 bytes = 20 bytes
```

### 4.5 Total Length

例如：

```text
Header Length = 20 bytes
Total Length = 60 bytes
```

那么 IPv4 负载：

```text
60 - 20 = 40 bytes
```

### 4.6 TTL

TTL = Time To Live。

在现代 IPv4 网络中更适合理解为：

> 这个包还允许经过多少个三层路由跳。

例如：

```text
初始 TTL = 128

经过路由器 A → 127
经过路由器 B → 126
经过路由器 C → 125
```

主要作用：

> 防止路由环路导致数据包无限游荡。

当 TTL 减到 0：

- 路由器丢弃数据包
- 通常返回 ICMP Time Exceeded

一般：

```text
经过普通二层交换机
→ TTL 不变

经过路由器 / 三层转发
→ TTL 减 1
```

### 4.7 Flags 与 Fragment Offset

这些字段共同描述 IPv4 分片状态。

IPv4 分片相关：

```text
Flags
├─ DF
├─ MF
└─ Reserved

Fragment Offset
```

#### DF = Don't Fragment

```text
DF = 0
→ 允许分片

DF = 1
→ 不允许分片
```

#### MF = More Fragments

```text
MF = 1
→ 后面还有分片

MF = 0
→ 后面没有更多分片
```

#### Fragment Offset

表示当前分片在原始 IP 包中的位置。

#### Identification

多个分片拥有相同 Identification：

> 表示它们属于同一个原始 IPv4 数据包。

可以归纳为：

```text
Identification
→ 哪些分片属于同一个原始包

DF
→ 能不能分片

MF
→ 后面还有没有分片

Fragment Offset
→ 当前分片原来的位置
```

补充说明：

- Offset 的 8-byte 单位计算
- IPv4 分片重组算法细节

### 4.8 Protocol

例如：

```text
Protocol: ICMP
```

表示 IPv4 里面装的是 ICMP。

常见：

```text
ICMP
TCP
UDP
```

### 4.9 补充说明

- DSCP 每一种取值
- ECN 细节
- Header Checksum 算法
- IPv4 首部每一个 bit

---

## 5. ICMP


### 5.1 ICMP 是什么

ICMP 主要用于：

- 网络状态检测
- 网络错误通知

最常见就是：

```text
ping
```

### 5.2 Ping

```text
客户端 → 目标
ICMP Echo Request

目标 → 客户端
ICMP Echo Reply
```

### 5.3 Wireshark 中重点看什么

过滤：

```text
icmp
```

展开：

```text
Internet Control Message Protocol
```

重点：

- Type
- Code
- Identifier
- Sequence Number
- Data

### 5.4 Type

普通 ping：

```text
Type 8
→ Echo Request

Type 0
→ Echo Reply
```

### 5.5 Sequence Number

例如：

```text
Request seq=394
Reply   seq=394
```

说明这两个是一对。

判断请求和响应时：

> 不要只数行数，要看 Sequence Number。

### 5.6 抓到重复 Request 的情况

实际抓包中出现过：

```text
Request seq=394
Request seq=394
Reply   seq=394
```

这不一定代表真正发送两次。

Windows + Npcap + 网络驱动 / 虚拟网络组件可能导致同一发送包被捕获两次。

判断时可比较：

- Source
- Destination
- Sequence Number
- Identifier
- Length
- 时间差

如果完全相同且时间极近，很可能是重复捕获。

### 5.7 其他需要认识的 ICMP

```text
Destination Unreachable
Time Exceeded
```

其中 `Time Exceeded` 与 TTL 密切相关。

---

## 6. ARP


### 6.1 ARP 解决什么问题

核心：

> 已知 IPv4 地址，找到当前二层网络中对应的 MAC 地址。

记成：

```text
ARP
IP → MAC
```

### 6.2 典型 ARP Request

```text
Who has 192.168.1.1?
Tell 192.168.1.10
```

大白话：

> 谁是 192.168.1.1？请告诉 192.168.1.10。

### 6.3 典型 ARP Reply

```text
192.168.1.1 is at aa:bb:cc:dd:ee:ff
```

意思：

> 192.168.1.1 对应的 MAC 是 aa:bb:cc:dd:ee:ff。

### 6.4 Wireshark 中重点看什么

过滤：

```text
arp
```

重点字段：

- Opcode
- Sender MAC Address
- Sender IP Address
- Target MAC Address
- Target IP Address

### 6.5 广播 ARP

经典 ARP Request 的 Ethernet 目标 MAC：

```text
ff:ff:ff:ff:ff:ff
```

表示：

> 当前广播域里的设备都听一下。

### 6.6 单播 ARP

实际抓包中也可能出现目标 MAC 已经是具体设备的 ARP Request。

这通常可能是：

> 网关或设备已经知道原来的 IP-MAC 对应关系，现在使用单播 ARP 验证 / 刷新邻居信息。

因此：

> ARP Request 不一定永远是广播。

### 6.7 跨网段时 ARP 找谁

访问外网：

```text
目标 IP = 8.8.8.8
```

电脑不会 ARP 查：

```text
8.8.8.8 的 MAC
```

而是 ARP 查：

```text
默认网关的 MAC
```

因为数据的第一跳必须先交给网关。

---

## 7. DNS


### 7.1 DNS 解决什么问题

```text
DNS
域名 → IP
```

### 7.2 域名不只是浏览器地址栏里的域名

除了：

```text
www.example.com
```

程序内部还经常访问：

```text
api.example.com
img.example.com
static.example.com
login.example.com
```

这些全部是域名。

实际抓包中出现过：

```text
api5-normal-hl.doubao.com
```

这类通常是应用程序使用的子域名 / API 域名。

### 7.3 DNS 一般使用 UDP 53

DNS Response 可能表现为：

```text
Source Port: 53
Destination Port: 客户端临时端口
```

表示 DNS 服务器从 53 端口返回结果。

### 7.4 Wireshark 中重点看什么

过滤：

```text
dns
```

展开：

```text
Domain Name System
```

重点：

```text
Queries
Answers
```

### 7.5 Queries

表示：

> 客户端问了什么。

例如：

```text
Queries
└─ api5-normal-hl.doubao.com
   Type: A
```

意思：

> 查询该域名对应的 IPv4 地址。

### 7.6 Answers

表示：

> DNS 服务器返回了什么。

可能直接：

```text
A → 203.0.113.10
```

也可能：

```text
域名 A
↓ CNAME
域名 B
↓ CNAME
域名 C
↓ A
最终 IPv4
```

### 7.7 常见 DNS 记录

```text
A
→ IPv4

AAAA
→ IPv6

CNAME
→ 域名别名
```

### 7.8 一个实际解析链

```text
api5-normal-hl.doubao.com
        ↓ CNAME
api5-normal-hl.doubao.com.c.dsa.cdnbuild.net
        ↓ CNAME
17-online-creative-doubao-v6.s.dsa.cdnbuild.net
        ↓
A → 203.0.113.10
A → 203.0.113.10
A → 203.0.113.10
```

一次 Query 可以对应多个 Answer。

### 7.9 Transaction ID

DNS Query 与 Response 使用相同 Transaction ID，以便匹配请求与响应。

### 7.10 DNS TTL 与 IPv4 TTL 不一样

DNS 中：

```text
Time to live: 170
```

表示：

> 这条 DNS 记录允许缓存多久。

必须区分：

```text
IPv4 TTL
→ 防止路由环路

DNS TTL
→ DNS 缓存有效期
```

---

## 8. TCP【重点章节】


### 8.1 TCP 是什么

TCP 是面向连接、可靠的传输层协议。

重要特点：

- 面向连接
- 双向通信
- 有序
- 有确认
- 有重传
- 使用 Seq / Ack 保证可靠性
- 使用端口区分应用程序

### 8.2 TCP 端口

TCP 包中：

```text
Source Port
Destination Port
```

例如：

```text
客户端：
Source Port = 64400
Destination Port = 443
```

表示：

> 客户端使用临时端口 64400 连接服务器的 HTTPS 端口 443。

服务器回复：

```text
Source Port = 443
Destination Port = 64400
```

### 8.3 TCP Flags

常见重要标志位：

```text
SYN
ACK
FIN
RST
```

本质上都是 1 bit：

```text
0 = 未设置
1 = 设置
```

#### SYN

```text
SYN = 1
```

表示：

> 同步序列号 / 建立连接。

初学可以理解成：

> “我要建立 TCP 连接。”

注意第二次握手服务器也会 `SYN=1`。

#### ACK Flag

```text
ACK = 1
```

表示：

> Acknowledgment Number 字段有效，我正在确认之前收到的内容。

不要混淆：

```text
ACK
→ Flag，只有 0 / 1

Acknowledgment Number
→ 一个具体数字
```

#### FIN

```text
FIN = 1
```

表示：

> 我这一方向已经没有更多数据要发送，准备关闭自己的发送方向。

#### RST

```text
RST = 1
```

表示：

> 当前 TCP 连接无效 / 被拒绝 / 被强制终止。

区别：

```text
FIN
→ 正常关闭

RST
→ 立即重置 / 拒绝 / 异常终止
```

---

### 8.4 三次握手

假设：

```text
客户端初始 Seq = x
服务端初始 Seq = y
```

#### 第一次

```text
客户端 → 服务端

SYN = 1
Seq = x
```

意思：

> 我要建立 TCP 连接，我的初始序列号是 x。

#### 第二次

```text
服务端 → 客户端

SYN = 1
ACK = 1
Seq = y
Ack = x + 1
```

含义：

```text
ACK=1
→ 我正在确认客户端的 SYN

Ack=x+1
→ 客户端的 x 我已经收到，下一步期待 x+1

SYN=1
→ 服务端也同步自己的序列号

Seq=y
→ 服务端自己的初始序列号
```

#### 第三次

```text
客户端 → 服务端

ACK = 1
Seq = x + 1
Ack = y + 1
```

意思：

> 服务端你的 SYN 我也收到，下一步期待 y+1。

#### 三次握手图

```text
客户端                              服务端

SYN=1
Seq=x
        ------------------------>

                         SYN=1
                         ACK=1
                         Seq=y
                         Ack=x+1
        <------------------------

ACK=1
Seq=x+1
Ack=y+1
        ------------------------>

            TCP连接建立
```

---

### 8.5 Seq 与 Ack 的核心理解

必须牢牢记住：

```text
Seq
= 我自己的序列号

Ack
= 我期待对方下一个发送的序列号
```

两个方向分开：

```text
客户端自己的 Seq
→ 服务端用 Ack 确认

服务端自己的 Seq
→ 客户端用 Ack 确认
```

### 8.6 为什么 SYN 会让 Ack +1

SYN 本身会消耗一个序列号。

例如：

```text
客户端：
SYN
Seq=0
```

服务器收到后：

```text
Ack=1
```

意思：

> 序列号 0 的 SYN 已收到，下一次期待 1。

---

### 8.7 为什么必须三次握手

核心不是“必须凑够三次”，而是：

> 双方都需要最终确认两个方向的数据都能正常送达，并同步双方初始序列号。

#### 第一次之后

服务端知道：

```text
客户端 → 服务端
这个方向能通
```

客户端还不能确认双向情况。

#### 第二次之后

客户端知道：

```text
客户端 → 服务端 ✅
服务端 → 客户端 ✅
```

但服务端还不知道：

> 自己刚才发的 SYN+ACK 到底有没有成功到客户端。

#### 第三次之后

服务端收到客户端 ACK 后，也知道：

```text
客户端 → 服务端 ✅
服务端 → 客户端 ✅
```

双方信息对等。

#### 为什么不是两次

只有：

```text
SYN
SYN+ACK
```

服务端无法确定自己的 SYN+ACK 有没有真的到客户端。

#### 为什么不是四次

逻辑上可以是：

```text
1. SYN
2. ACK
3. SYN
4. ACK
```

但服务端的：

```text
ACK + SYN
```

可以放在同一个 TCP 包里：

```text
SYN
SYN+ACK
ACK
```

所以三次已经足够，没有必要多一次。

---

### 8.8 Wireshark 中怎么看三次握手

过滤：

```text
tcp and ip.addr == 目标IP
```

然后看 Info：

```text
[SYN]
[SYN, ACK]
[ACK]
```

例如：

```text
客户端 → 服务器
64400 → 443 [SYN]

服务器 → 客户端
443 → 64400 [SYN, ACK]

客户端 → 服务器
64400 → 443 [ACK]
```

注意：

```text
[TCP Retransmission] [SYN]
```

不算一个新的握手阶段。

---

### 8.9 TCP 数据阶段 Seq / Ack

这是 TCP 可靠传输的核心。

假设三次握手结束后：

```text
客户端下一 Seq = 1001
服务端下一 Seq = 5001
```

客户端发送：

```text
Seq = 1001
Len = 500
Ack = 5001
```

意思：

> 我这次的数据从字节 1001 开始，一共 500 字节；同时我期待服务端下一段从 5001 开始。

这 500 字节覆盖：

```text
1001 ~ 1500
```

服务端收到后：

```text
Ack = 1501
```

意思：

> 1001~1500 已收到，下一次期待 1501。

#### 核心公式

普通数据阶段：

```text
下一次 Seq
=
当前 Seq + Len
```

接收方确认：

```text
Ack
=
对方 Seq + 对方 Len
```

#### 示例

```text
客户端：
Seq=1001
Len=500

服务端：
Ack=1501
```

客户端继续：

```text
Seq=1501
Len=300
```

服务端：

```text
Ack=1801
```

---

### 8.10 Seq 不是“第几个包”

`Seq` 主要表示：

> TCP 字节流中的字节编号。

不是：

```text
第1个包
第2个包
第3个包
```

---

### 8.11 一个 TCP 包可以同时有 Seq 和 Ack

TCP 是全双工。

例如：

```text
Seq=1501
Ack=6001
Len=300
```

含义：

> 我从 1501 开始发送 300 字节；同时你发来的数据我已经收到 6000，下一步期待 6001。

---

### 8.12 TCP 累计确认

TCP Ack 通常是累计确认。

例如客户端连续发送：

```text
Seq=1001 Len=500
Seq=1501 Len=500
Seq=2001 Len=500
```

如果服务端都收到，可以直接：

```text
Ack=2501
```

意思：

> 2501 之前连续的数据全部收到。

---

### 8.13 TCP 超时重传

核心：

> 某段需要被确认的数据，在等待时间内没有得到对应确认，就重新发送那一段数据。

不一定是重新发 SYN。

#### 建立连接阶段

```text
发 SYN
没收到 SYN+ACK
→ 重传 SYN
```

#### 数据阶段

```text
发 Seq=1000 Len=500
没收到对应 Ack
→ 重传 Seq=1000 Len=500
```

#### RTO

TCP 的重传超时时间叫：

```text
RTO
Retransmission Timeout
```

RTO 不是永远固定，会根据网络延迟动态估算。

---

### 8.14 快速重传

TCP 不一定必须等超时。

如果连续收到多个重复 Ack，例如：

```text
Ack=1000
Ack=1000
Ack=1000
```

发送方可能判断：

> 某段数据丢失。

然后提前重传。

这叫：

```text
Fast Retransmit
快速重传
```

当前阶段：

> 知道概念即可。

---

### 8.15 TCP Retransmission 在 Wireshark 中怎么看

Wireshark 可能直接显示：

```text
[TCP Retransmission]
```

看到它时首先想到：

> 某个 TCP 数据可能没有被正常确认，于是发生重传。

但不能看到 `Retransmission` 就直接断定网络一定丢包。

原因包括：

- 抓包点可能重复捕获
- Windows / Npcap / 虚拟网络驱动可能让同一个发送包出现两次
- Wireshark 是基于已抓到的数据进行推断

需要结合：

- Seq
- Len
- Ack
- 时间差
- IP
- 端口

一起判断。

---

### 8.16 Duplicate ACK

Wireshark 可能显示：

```text
[TCP Dup ACK]
```

表示重复确认。

常见含义：

> 接收方仍然在等待同一个序列号。

可能对应：

- 某段数据丢失
- 数据乱序
- 抓包环境异常

当前阶段：

> 认识即可，后续做 TCP 丢包分析时再深入。

---

### 8.17 RST 强制重置

RST 可以理解成：

> 不走正常 FIN 关闭流程，这条连接立即无效。

常见场景：

#### 目标端口没人监听

客户端：

```text
SYN
```

服务器可能：

```text
RST,ACK
```

常见对应：

```text
Connection refused
```

#### 应用程序异常 / 强制关闭

已经建立连接后：

- 程序崩溃
- 强制退出
- 强制关闭 socket

可能发 RST。

#### 收到不存在连接的 TCP 包

系统发现本机没有对应连接，可能回复 RST。

#### 防火墙 / 中间设备主动重置

可能包括：

- 防火墙
- 代理
- 负载均衡
- 安全设备

所以：

> RST 不一定百分之百来自服务器应用本身。

---

### 8.18 FIN 与四次挥手

TCP 是全双工。

两个方向可以分别关闭，因此逻辑上需要：

```text
FIN
ACK
FIN
ACK
```

#### 典型流程

```text
客户端 → 服务端
FIN

服务端 → 客户端
ACK

服务端 → 客户端
FIN

客户端 → 服务端
ACK
```

#### FIN 的意义

```text
FIN=1
```

表示：

> 我这一方向已经没有更多数据要发了。

不是：

> 整个 TCP 连接瞬间全部消失。

---

### 8.19 为什么实际抓包可能只有三个报文

服务端的：

```text
ACK
+
FIN
```

可以合并成：

```text
FIN,ACK
```

所以实际可能看到：

```text
客户端 → 服务端
FIN,ACK

服务端 → 客户端
FIN,ACK

客户端 → 服务端
ACK
```

虽然只有 3 个报文，但逻辑动作仍然是：

```text
FIN
ACK
FIN
ACK
```

实际抓包中曾看到：

```text
84 客户端 → 服务端 [FIN,ACK]

85 [TCP Retransmission] [FIN,ACK]

86 服务端 → 客户端 [FIN,ACK]

87 客户端 → 服务端 [ACK]
```

真正关闭主线：

```text
84
86
87
```

85 是重传 / 重复捕获，不算新的挥手阶段。

---

### 8.20 为什么第一次挥手常见 FIN,ACK

第一次主动关闭的一方经常发送：

```text
FIN,ACK
```

其中：

```text
FIN
→ 我这边不准备继续发送数据

ACK
→ 我同时确认你之前发送的数据
```

这里的 ACK 不是“第二次挥手”。

TCP 建立后，大多数正常 TCP 报文都会带 ACK。

---

---

---

---

## 9. UDP

### 9.1 UDP 是什么

UDP（User Datagram Protocol）是无连接的传输层协议。

和 TCP 对比：

```text
TCP
→ 先建立连接
→ 有 Seq / Ack
→ 有确认和重传
→ 保证有序字节流

UDP
→ 不先建立连接
→ 没有 TCP 那套 Seq / Ack
→ UDP 本身不负责确认
→ UDP 本身不负责重传
→ UDP 本身不保证顺序
```

UDP 可以直接发送数据：

```text
客户端 → 服务端
UDP Data
```

不需要三次握手。

### 9.2 “UDP 不可靠”是什么意思

“UDP 不可靠”是指：

> UDP 协议自身不提供 TCP 那套可靠传输机制。

这不等于“使用 UDP 的应用一定不可靠”。例如 QUIC 运行在 UDP 上，但 QUIC 自己实现了可靠传输、重传、拥塞控制等机制。

### 9.3 Wireshark 中重点看什么

过滤：

```text
udp
```

展开：

```text
User Datagram Protocol
```

主要字段：

```text
Source Port
Destination Port
Length
Checksum
```

### 9.4 Source Port / Destination Port

以 DNS 为例：

```text
客户端 → DNS服务器
Source Port: 63763
Destination Port: 53
```

回复则可能是：

```text
Source Port: 53
Destination Port: 63763
```

端口用于区分通信两端的应用程序/服务。

### 9.5 Length

UDP Header 固定为 8 字节。

例如：

```text
UDP Length = 100 bytes
```

则：

```text
UDP Header = 8 bytes
UDP Data   = 92 bytes
```

### 9.6 Checksum

Checksum 用来检测：

> UDP 报文在传输过程中是否发生比特错误。

大致过程：

```text
发送方：
UDP内容
↓
计算 Checksum
↓
随报文一起发送

接收方：
收到 UDP 内容
↓
重新计算
↓
和报文中的 Checksum 比较
```

如果不一致，说明数据可能发生错误。

Checksum 是错误检测机制，不是加密，也不是身份认证。

### 9.7 常见 UDP 应用

```text
DNS
→ 常见 UDP 53

DHCP
→ UDP 67 / 68

QUIC / HTTP/3
→ UDP 443

实时语音 / 视频
→ 经常使用 UDP
```

实时通信通常更看重低延迟；某些场景下，迟到的旧数据甚至比直接丢弃更影响体验。

---

## 10. DHCP

### 10.1 DHCP 是什么

DHCP = Dynamic Host Configuration Protocol。

作用：

> 自动给客户端提供网络配置参数。

常见包括：

```text
IPv4 地址
子网掩码
默认网关
DNS 服务器
租约时间
```

### 10.2 DHCP 使用 UDP

经典端口：

```text
DHCP Server → UDP 67
DHCP Client → UDP 68
```

### 10.3 DORA 四步

第一次获取地址时的经典流程：

```text
Discover
↓
Offer
↓
Request
↓
ACK
```

含义：

```text
Discover
→ 有没有 DHCP Server？我需要网络配置。

Offer
→ 我可以给你这个 IP 和这些参数。

Request
→ 我申请/确认使用这个 IP。

ACK
→ 批准，你可以使用这些配置。
```

### 10.4 0.0.0.0 → 255.255.255.255

客户端还没有确认一个可正常使用的 IPv4 地址时，可能出现：

```text
Source IP      = 0.0.0.0
Destination IP = 255.255.255.255
```

其中：

```text
0.0.0.0
→ 当前没有可正常使用的源 IPv4 地址

255.255.255.255
→ 本地广播
```

意思可以理解为：

> 我现在还不能正常单播，请能够处理 DHCP 的设备接收这个广播。

### 10.5 Request / ACK 与续租

实际网络中，不是每次都完整出现 DORA。

已经有地址的客户端在续租或重新确认租约时，常见：

```text
DHCP Request
DHCP ACK
```

所以只看到 Request / ACK 并不异常。

### 10.6 DHCP 租约

DHCP 分配的 IP 通常是“租给”客户端一段时间，而不是永久归该设备所有。

常见字段：

```text
Option 51
IP Address Lease Time
```

租约到期之前，客户端会尝试续租。

### 10.7 DHCP Relay

如果真正的 DHCP Server 不在客户端所在广播域，广播不能直接跨普通路由器转发，因此可以使用 DHCP Relay：

```text
客户端
↓
DHCP Relay
↓
远端 DHCP Server
```

实际抓包中出现过：

```text
Relay agent IP address: 10.31.0.1
DHCP Server Identifier: 10.6.20.12
```

这说明收到 DHCP 报文的网络设备和真正的 DHCP Server 可能不是同一台设备。

### 10.8 DHCP Request 中的固定字段

#### Client IP address

例如：

```text
Client IP address: 0.0.0.0
```

表示客户端没有在这个字段里使用一个已确认的地址。

#### Your (client) IP address

这个字段主要由 DHCP Server 在回复中填写，表示分配/确认给客户端的地址。

#### Next server IP address

主要与 BOOTP、网络启动等场景有关。

#### Relay agent IP address

如果经过 DHCP Relay，这里可能出现中继地址。

#### Client MAC address

例如：

```text
bc:03:58:8c:49:8e
```

用于标识申请配置的客户端网卡。

#### Magic Cookie: DHCP

这是 DHCP Options 的固定识别标记，表示后面的内容按 DHCP Options 格式解析。

### 10.9 常见 DHCP Options

#### Option 53：DHCP Message Type

表示当前 DHCP 报文类型，例如：

```text
Discover
Offer
Request
ACK
NAK
```

#### Option 61：Client Identifier

客户端标识符，DHCP Server 可以用它区分客户端。

#### Option 50：Requested IP Address

例如：

```text
Option (50) Requested IP Address (10.31.92.50)
```

表示：

> 客户端希望使用 10.31.92.50。

#### Option 12：Host Name

客户端主机名/计算机名。

#### Option 81：Client Fully Qualified Domain Name

客户端 FQDN，可用于 DHCP 与 DNS 联动等场景。

#### Option 60：Vendor Class Identifier

客户端声明自己的厂商/类型/环境，服务器可以据此提供不同配置。

#### Option 55：Parameter Request List

这个字段表示：

> 客户端希望 DHCP Server 返回哪些参数。

实际抓包中曾请求：

```text
(1)   Subnet Mask
(3)   Router
(6)   Domain Name Server
(15)  Domain Name
(31)  Perform Router Discover
(33)  Static Route
(43)  Vendor-Specific Information
(44)  NetBIOS over TCP/IP Name Server
(46)  NetBIOS over TCP/IP Node Type
(47)  NetBIOS over TCP/IP Scope
(119) Domain Search
(121) Classless Static Route
(249) Private/Classless Static Route (Microsoft)
(252) Private/Proxy autodiscovery
(114) DHCP Captive-Portal
```

常用含义：

```text
Option 1
→ Subnet Mask

Option 3
→ Router / 默认网关

Option 6
→ DNS Server

Option 15
→ Domain Name

Option 119
→ Domain Search

33 / 121 / 249
→ 路由信息

252
→ 自动代理发现 / WPAD 相关

114
→ Captive Portal / 网络认证门户
```

#### Option 255：End

表示 DHCP Options 到这里结束。

### 10.10 DHCP ACK 中常见配置

服务器真正给了什么，要看 ACK 中的 Options。

常见：

```text
Option 1
→ Subnet Mask

Option 3
→ Default Gateway

Option 6
→ DNS Server

Option 51
→ Lease Time

Option 53
→ DHCP Message Type = ACK

Option 54
→ DHCP Server Identifier
```

必须区分：

```text
Request 的 Option 55
= 客户端想要什么

ACK 里的 Options
= 服务器实际给了什么
```

---

## 11. TLS 与 HTTPS

### 11.1 HTTPS 和 TLS 的关系

可以直接记：

```text
HTTPS = HTTP over TLS
```

传统 HTTPS 协议栈：

```text
HTTP
↓
TLS
↓
TCP
↓
IP
```

HTTP 负责：

- GET / POST
- Header
- Body
- Status Code
- Web API / 网页内容

TLS 负责：

- 加密
- 完整性保护
- 服务器身份认证
- 密钥协商

### 11.2 传统 HTTPS 通信流程

```text
TCP 三次握手
↓
TLS 握手
↓
建立加密通道
↓
HTTP 请求 / 响应通过 TLS 加密传输
```

Wireshark 常直接看到：

```text
TCP
TLS Client Hello
TLS Server Hello
TLS Application Data
```

而不会直接显示加密后的：

```text
GET
POST
HTTP Header
HTTP Body
网页正文
密码
```

### 11.3 HTTP/3 的情况

HTTP/3 不使用传统的 TCP/TLS 分层，而是：

```text
HTTP/3
↓
QUIC
↓
UDP
```

QUIC 中集成 TLS 1.3 的安全机制。

### 11.4 Client Hello

Client Hello 可以理解成：

> 客户端把自己的 TLS 能力清单发给服务器。

Wireshark 中可过滤：

```text
tls
```

实际抓包中出现过：

```text
Client Hello (SNI=opt.doubao.com)
```

#### Server Name / SNI

例如：

```text
server_name = opt.doubao.com
```

SNI = Server Name Indication。

作用：

> 客户端虽然连接的是一个 IP，但告诉服务器真正想访问哪个域名。

因为一个 IP 可能同时托管多个域名。

DNS、TCP、TLS 可以串起来：

```text
DNS
opt.doubao.com
↓
解析到某个 IP

TCP
连接 该IP:443

TLS Client Hello
SNI=opt.doubao.com
```

#### Supported Versions

客户端告诉服务器自己支持哪些 TLS 版本，例如：

```text
TLS 1.3
TLS 1.2
```

TLS 1.3 为兼容旧设备，某些旧式 Version 字段可能仍显示旧值，因此判断现代 TLS 版本协商时要重点看：

```text
supported_versions
```

#### Cipher Suites

客户端发送自己支持的加密套件清单，服务器从共同支持的方案中选择。

#### Key Share

TLS 1.3 中非常重要。

实际抓包可能看到：

```text
key_share
x25519
```

可以理解为：

```text
客户端 Key Share
+
服务端 Key Share
↓
双方各自计算
↓
得到相同共享秘密
↓
派生 TLS 会话密钥
```

`x25519` 是常见的密钥交换参数组。

#### Supported Groups

表示客户端支持哪些密钥交换参数组。

#### Signature Algorithms

表示客户端支持哪些数字签名算法，与证书和身份认证相关。

#### ALPN

ALPN = Application-Layer Protocol Negotiation。

作用：

> 协商 TLS 建好后，上面运行哪个应用层协议。

例如：

```text
h2
→ HTTP/2

http/1.1
→ HTTP/1.1
```

#### JA3 / JA4

Wireshark 可能根据 Client Hello 计算 TLS 指纹 JA3 / JA4，用于根据 TLS 特征识别客户端类型或做安全分析。

### 11.5 Server Hello

Client Hello 表示：

> “我支持这些能力。”

Server Hello 表示：

> “好，我们使用其中这一套。”

Server Hello 会确定实际采用的：

- TLS 版本
- 密码套件
- 密钥协商参数

### 11.6 Certificate

TLS 服务器通过证书证明自己的身份。

证书涉及：

- 域名身份
- 证书颁发机构
- 数字签名
- 公钥信息

客户端会检查证书是否可信、域名是否匹配等。

### 11.7 TLS Application Data

TLS 握手完成后，Wireshark 中会大量出现：

```text
Application Data
```

对于 HTTPS 来说，这通常就是：

> 已被 TLS 加密的 HTTP 请求和响应。

---

## 12. HTTP

### 12.1 HTTP 是什么

HTTP 是应用层协议，用来定义：

> 客户端如何请求 Web 资源，服务器如何返回响应。

普通 HTTP 是明文协议。

常见端口：

```text
HTTP  → TCP 80
HTTPS → TCP 443（传统 HTTPS）
```

### 12.2 HTTP Request 结构

可以粗略分成：

```text
HTTP Request
├─ Request Line
├─ Headers
└─ Body
```

实际抓包示例：

```text
POST /mmtls/000048e2 HTTP/1.1
Host: szextshort.weixin.qq.com
Content-Length: 503
Content-Type: application/octet-stream
User-Agent: MicroMessenger Client

[Body 数据]
```

### 12.3 GET

GET 主要用于：

> 获取资源。

例如：

```text
GET /index.html HTTP/1.1
```

### 12.4 POST

POST 主要用于：

> 向服务器提交数据。

例如：

```text
POST /mmtls/000048e2 HTTP/1.1
```

### 12.5 Host + Path

例如：

```text
Host: szextshort.weixin.qq.com
Path: /mmtls/000048e2
```

可组合成大致目标：

```text
http://szextshort.weixin.qq.com/mmtls/000048e2
```

### 12.6 常见 Header

```text
Host
Content-Type
Content-Length
User-Agent
Connection
Accept
```

#### Host

请求的服务器域名。

#### Content-Type

Body 数据类型，例如：

```text
application/octet-stream
```

表示通用二进制数据。

#### Content-Length

例如：

```text
Content-Length: 503
```

表示 Body 长度为 503 字节。

#### User-Agent

表示客户端类型。

实际抓包中出现：

```text
User-Agent: MicroMessenger Client
```

说明请求来自微信相关客户端。

### 12.7 HTTP Body

Body 是请求或响应真正携带的数据区域。

如果 Content-Type 是二进制类型，Wireshark 可能只显示 Data，而不是可读文本。

### 12.8 HTTP 状态码

第一位表示大类：

```text
1xx
→ 信息性响应

2xx
→ 成功

3xx
→ 重定向

4xx
→ 客户端请求相关问题

5xx
→ 服务器处理问题
```

常见：

```text
200 OK
→ 请求成功

206 Partial Content
→ 返回资源的一部分

301 / 302
→ 重定向

403 Forbidden
→ 服务器拒绝访问

404 Not Found
→ 资源不存在

500 Internal Server Error
→ 服务器内部错误
```

实际抓包中出现过：

```text
HTTP/1.1 200 OK
HTTP/1.0 302 Found
HTTP/1.1 206 Partial Content
HTTP/1.1 403 Forbidden
```

### 12.9 HTTP 与 HTTPS 在 Wireshark 中的区别

普通 HTTP：

```text
GET
POST
Host
Header
Body
```

通常可以直接看到。

HTTPS：

```text
HTTP
↓
TLS 加密
```

通常只看到：

```text
TLS Application Data
```

而不是 HTTP 明文。

---

## 13. IPv6

### 13.1 IPv6 是什么

IPv6 = Internet Protocol Version 6。

它和 IPv4 的核心职责类似：

> 给网络设备提供 IP 地址，并负责跨网络寻址和转发。

### 13.2 IPv4 与 IPv6 地址空间

IPv4：

```text
32 bit
2^32 ≈ 43 亿个地址
```

IPv6：

```text
128 bit
2^128 个地址
```

IPv6 地址空间远大于 IPv4。

### 13.3 IPv6 地址格式

完整 IPv6 地址由 8 组十六进制数组成，每组 16 bit。

例如：

```text
2001:0db8:0000:0000:0000:ff00:0042:8329
```

可以压缩为：

```text
2001:db8::ff00:42:8329
```

连续的全 0 组可以用 `::` 压缩。

一个 IPv6 地址中通常只能使用一次 `::`，否则无法确定省略了多少组。

### 13.4 Link-Local Address

常见：

```text
fe80::xxxx:xxxx:xxxx:xxxx
```

这是链路本地地址，主要在当前本地链路中使用。

Windows `ipconfig` 中经常能看到：

```text
Link-local IPv6 Address
```

### 13.5 IPv6 不使用 ARP

IPv4：

```text
ARP
IPv4 → MAC
```

IPv6 不使用 ARP，而使用：

```text
NDP
Neighbor Discovery Protocol
```

NDP 基于 ICMPv6，用于邻居发现等功能。

可以粗略对应：

```text
IPv4：ARP → 找邻居 MAC
IPv6：NDP → 邻居发现
```

### 13.6 Hop Limit

IPv6 使用：

```text
Hop Limit
```

它的作用基本等价于 IPv4 TTL：

> 每经过一个路由器减 1，到 0 时丢弃，防止数据包无限循环。

### 13.7 Next Header

IPv6 使用：

```text
Next Header
```

说明后面是什么协议，作用类似 IPv4 的 `Protocol`。

例如：

```text
Next Header = TCP
Next Header = UDP
Next Header = ICMPv6
```

### 13.8 Wireshark 中的 IPv6 层次

典型：

```text
Ethernet II
└─ Internet Protocol Version 6
   └─ TCP / UDP / ICMPv6
      └─ TLS / DNS / HTTP ...
```

因此 IPv6 替代的是 IP 层，上面的 TCP、UDP、TLS、DNS 等协议仍然可以继续使用。

---

## 14. 协议之间的整体关系

### 14.1 传统 HTTPS 通信

```text
应用程序
   ↓
DNS：域名 → IP
   ↓
ARP：本地下一跳 IPv4 → MAC
   ↓
Ethernet II：当前这一跳怎么送
   ↓
IPv4：最终要去哪个 IPv4
   ↓
TCP：建立可靠连接
   ↓
TLS：建立加密通道
   ↓
HTTP：请求和响应
```

在网络包里表现为多层封装：

```text
Ethernet II
└─ IPv4
   └─ TCP
      └─ TLS
         └─ HTTP（加密后表现为 TLS Application Data）
```

### 14.2 DNS over UDP

```text
Ethernet II
└─ IPv4
   └─ UDP
      └─ DNS
```

### 14.3 DHCP

```text
Ethernet II
└─ IPv4
   └─ UDP
      └─ DHCP
```

### 14.4 Ping

```text
Ethernet II
└─ IPv4
   └─ ICMP
```

### 14.5 IPv6 网络

```text
Ethernet II
└─ IPv6
   └─ TCP / UDP / ICMPv6
      └─ TLS / DNS / HTTP ...
```

IPv4 使用 ARP 处理本地 IPv4 邻居映射；IPv6 使用 NDP。

---

## 15. Wireshark 常见现象速查

看到：

```text
ARP
```

通常表示 IPv4 与本地 MAC 映射/邻居验证。

看到：

```text
DNS
```

通常表示域名解析。

看到：

```text
ICMP Echo Request / Reply
```

通常表示 Ping 请求 / 应答。

看到：

```text
TCP [SYN]
```

通常表示正在尝试建立 TCP 连接。

看到：

```text
[SYN]
[SYN,ACK]
[ACK]
```

通常表示 TCP 三次握手。

看到：

```text
[FIN,ACK]
```

通常表示某一方正在正常关闭自己的发送方向，同时确认之前收到的数据。

看到：

```text
RST
```

通常表示 TCP 连接被拒绝、强制重置或异常终止。

看到：

```text
TCP Retransmission
```

表示 Wireshark 判断某段 TCP 数据被重新发送，需要结合 Seq、Ack、时间和抓包点判断是否是真实丢包。

看到：

```text
TCP Dup ACK
```

表示接收方重复确认同一个位置，可能和丢包、乱序或抓包环境有关。

看到：

```text
Client Hello
```

表示 TLS 客户端正在发送能力清单并开始 TLS 握手。

看到：

```text
Server Hello
```

表示 TLS 服务器正在确定双方实际采用的 TLS 参数。

看到：

```text
TLS Application Data
```

通常表示 TLS 加密通道已经建立，正在传输加密后的应用数据。

看到：

```text
HTTP GET / POST
```

表示当前 HTTP 请求可以被 Wireshark 直接解析。

看到：

```text
DHCP Request
```

通常表示客户端正在申请、确认或续租网络配置。

看到：

```text
DHCP ACK
```

表示网络侧已确认并下发/续租 DHCP 参数。

看到：

```text
目标 IP 是外网 IP
目标 MAC 是网关 MAC
```

这是正常跨网段通信：

> IP 负责最终目的地，MAC 负责当前这一跳。
