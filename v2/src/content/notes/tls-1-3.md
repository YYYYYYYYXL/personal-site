---
title: "TLS 1.3：从握手到加密通信"
description: "三份 TLS 笔记合并整理，串联密钥交换、证书认证、密钥派生与 Wireshark 观察。"
order: 2
icon: "lock-key"
tags: ["TLS 1.3","HTTPS","密码学"]
sources: ["TLS_1.3学习笔记_整改扩展版.md","TLS_1.3学习笔记_教科书版.md","TLS_1.3学习笔记_最终版.md"]
---

> 整合教科书版、整改扩展版和最终版。以整改扩展版的章节与术语为主，保留数学示例、抓包路线与协议对照，补入最终版的证书链讲解及教科书版复习主线，避免重复铺陈三个版本。

> 本文以 TLS 1.3 为主，按照“基础概念 → 握手协商 → 密钥建立 → 身份认证 → 握手确认 → 加密通信 → Wireshark 实测 → 通用应用案例”的顺序整理。
>
> 本版结合 Wireshark 抓包学习整理，重点统一 Shared Secret、Traffic Secret、Traffic Key、HKDF、IV/Nonce、Certificate Verify、Finished 等术语。
>
> ABG 数学模型只用于帮助理解经典 ECDHE 的核心思想；实际抓包中的 X25519MLKEM768 属于更复杂的混合密钥建立方案，不能机械等同于简单的 A=aG、B=bG。

---

## 第一章 TLS 的作用与整体位置

### 1.1 TLS 是什么

TLS（Transport Layer Security）不是某一种加密算法，而是一套安全通信协议。

TLS 主要解决三个问题：

- **机密性**：别人抓到数据后看不懂内容。
- **身份认证**：客户端确认自己连接的确实是目标服务器。
- **完整性**：发现通信内容有没有被中途修改。

传统 HTTPS 可以理解为：

```text
HTTP
↓
TLS
↓
TCP
↓
IP
↓
Ethernet
```

其中：

- HTTP 负责“请求什么、返回什么”。
- TLS 负责“HTTP 数据如何安全传输”。
- TCP 负责“可靠地把 TLS 数据传过去”。

因此：

```text
HTTPS = HTTP over TLS
```

### 1.2 TLS 1.3 的整体主线

TLS 1.3 可以先记成：

```text
TCP 建立连接
↓
Client Hello
↓
Server Hello
↓
双方建立共享秘密并派生握手密钥
↓
Encrypted Extensions
↓
Certificate
↓
Certificate Verify
↓
Finished
↓
Application Data
```

后面的章节会按这条主线展开。

---

## 第二章 TLS 中必须先分清的密码学概念

如果不先分清本章这些概念，后面很容易把“证书公钥”“Key Share”“共享秘密”“会话密钥”“Cipher Suite”混在一起。

### 2.1 公钥与私钥

一组非对称密钥通常由：

```text
私钥
+
公钥
```

组成。

可以先记：

```text
私钥
→ 自己保密

公钥
→ 可以公开
```

公钥密码学的设计目标是：

```text
已知私钥
→ 可以计算对应公钥

已知公钥
→ 很难在现实可行的计算量内反推出私钥
```

算法和公式本身通常是公开的。

安全性不依赖“别人不知道算法”，而依赖：

> 即使攻击者知道算法、参数和公钥，也无法在现实可行的计算量内求出私钥。

---

### 2.2 Hash

Hash 可以理解成：

> 给一大段数据生成一个固定长度的“数字指纹”。

形式可以写成：

```text
原始数据
↓
Hash
↓
固定长度摘要
```

例如为了讲解方便，假设：

```text
Hash(一大段握手内容) = 65
```

真实 TLS 中使用的 Hash 结果远比 `65` 长，例如 SHA-256 会产生 256 bit 的结果。

Hash 的重要特点之一是：

> 原始内容哪怕只变化一点，Hash 结果通常也会明显变化。

因此 Hash 很适合用于判断：

> “我现在看到的内容，和原来被签名的内容是不是同一份？”

---

### 2.3 数字签名

数字签名解决的是：

> “某个持有私钥的人，如何在不公开私钥的情况下证明这段内容确实是他签的？”

可以先理解为：

```text
服务器：
数据的 Hash
+
私钥
↓
生成数字签名

客户端：
数字签名
+
对应公钥
+
同一份数据
↓
验证签名
```

如果验证成功，可以确认：

- 生成签名的一方确实掌握对应私钥；
- 被签名的数据与当前验证的数据一致。

数字签名的完整数学玩具例子见第七章。

---

### 2.4 密钥交换算法

密钥交换算法解决的是：

> “客户端和服务器怎么在网络上不直接传最终秘密的情况下，得到同一个共享秘密？”

TLS 1.3 常见的密钥交换相关方案包括：

```text
X25519
secp256r1
```

它们的用途不是直接加密网页内容，而是：

```text
建立共享秘密
↓
再派生 TLS 使用的密钥
```

ABG 数学例子见第五章。

---

### 2.5 Cipher Suite

Cipher Suite 解决的是：

> “已经进入 TLS 1.3 以后，记录层用什么对称加密算法保护数据，并使用哪一种 Hash 算法参与握手摘要和密钥派生？”

TLS 1.3 常见 Cipher Suite：

```text
TLS_AES_128_GCM_SHA256
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
```

例如本次 Wireshark 抓包中服务器选择：

```text
TLS_AES_256_GCM_SHA384
```

可以拆成：

```text
AES_256_GCM
→ 真正负责对 TLS Record 做对称加密和完整性认证

SHA384
→ 用于 Transcript Hash、HKDF 密钥派生、Finished 等相关计算
```

非常重要：

```text
Hash ≠ 加密
```

Hash 不能把结果“解密回原文”。AES-GCM 才是在流量密钥参与下把明文变成密文，并允许拥有正确密钥的一方恢复原文。

#### TLS 1.3 中 Cipher Suite 不再负责什么

TLS 1.2 时代的 Cipher Suite 名字经常把：

```text
密钥交换
身份认证
对称加密
Hash
```

都写进一个很长的名字。

TLS 1.3 把这些职责拆开了。

例如：

```text
TLS_AES_256_GCM_SHA384
```

并不会告诉你密钥交换一定是 X25519，也不会告诉你证书一定使用 RSA 或 ECDSA。

这些分别由：

```text
supported_groups / key_share
→ 密钥交换方案

signature_algorithms / 证书
→ 身份认证和签名方案

Cipher Suite
→ 对称加密算法 + Hash 算法
```

决定。

#### 密钥交换算法和 Cipher Suite 的区别

```text
密钥交换算法
→ 解决“共享秘密怎么得到”

Cipher Suite
→ 解决“密钥有了以后，TLS Record 怎么保护”
```

最短记忆：

```text
X25519
→ 造出双方共有的秘密

HKDF
→ 从秘密继续派生流量密钥

AES-GCM
→ 用流量密钥加密真正的数据
```

---

### 2.6 Shared Secret、Traffic Secret 与 Traffic Key

通过密钥交换首先得到：

```text
Shared Secret
共享秘密
```

共享秘密的特点：

```text
客户端有
服务器有
网络上从未直接发送这个值
```

但是 TLS 1.3 不会简单地：

```text
Shared Secret
→ 直接作为 AES 密钥加密所有数据
```

TLS 1.3 使用一套 **Key Schedule（密钥派生流程）**，核心工具是 HKDF。

可以先按下面的层次理解：

```text
Shared Secret
↓
TLS 1.3 Key Schedule / HKDF
↓
不同用途的 Traffic Secret
↓
继续派生
↓
Traffic Key + IV
↓
AES-GCM
↓
保护对应阶段、对应方向的数据
```

常见的 Traffic Secret 包括：

```text
client_handshake_traffic_secret
server_handshake_traffic_secret

client_application_traffic_secret
server_application_traffic_secret
```

它们不是“四把直接拿给 AES 的钥匙”，而是中间的秘密材料。

真正交给记录层加密算法的是从它们继续派生出来的：

```text
traffic key
IV
```

#### “会话密钥”这个词为什么容易误导

日常科普里经常把 TLS 连接中使用的秘密统称为“会话密钥”。

这样说不算完全错误，但容易让人误以为：

```text
整条 TLS 连接只有一把总密钥
```

TLS 1.3 实际上会按：

```text
阶段：握手阶段 / 应用数据阶段
方向：客户端→服务器 / 服务器→客户端
```

分开派生不同的流量秘密和流量密钥。

因此本笔记后面尽量使用更准确的词：

```text
Shared Secret
Traffic Secret
Traffic Key
```

而不是把所有东西都叫“会话密钥”。

---

### 2.7 对称加密和 Hash 必须分开

对称加密的目标：

> 让没有密钥的人看不懂数据，而拥有正确密钥的人可以恢复原文。

例如：

```text
明文
+
Traffic Key
+
Nonce
↓
AES-256-GCM
↓
密文
```

接收方：

```text
密文
+
对应 Traffic Key
+
对应 Nonce
↓
AES-256-GCM
↓
明文
```

Hash 的目标则不同：

```text
数据
↓
SHA-384
↓
固定长度摘要
```

Hash 不是可逆加密。

在本次 Cipher Suite：

```text
TLS_AES_256_GCM_SHA384
```

中：

```text
AES-256-GCM
→ 加密并认证 TLS Record

SHA-384
→ 参与 Transcript Hash、HKDF、Finished 等计算
```

---

### 2.8 IV 与 Nonce

AES-GCM 加密时不只需要 Key，还需要每次加密使用的 Nonce。

可以先理解成：

```text
明文 + Key + Nonce
↓
AES-GCM
↓
密文 + Authentication Tag
```

Nonce 的核心要求：

> 同一把 Key 下，Nonce 不能重复使用。

TLS 1.3 会从 Traffic Secret 中派生出：

```text
Traffic Key
IV
```

每条 TLS Record 又有自己的序号。

实际使用时大致是：

```text
派生出的 IV
XOR
当前 Record Sequence Number
↓
这一条 Record 使用的 Nonce
```

因此：

```text
IV
→ 一个由 TLS Key Schedule 派生出的基础值

Nonce
→ 每一条 Record 真正交给 AEAD 加密算法使用的唯一值
```

不要把 IV、Nonce、Traffic Key 当成同一种东西。

---

## 第三章 TLS 中存在的两套公私钥

TLS 1.3 中最容易混淆的地方之一，就是同时出现了两套不同用途的公私钥。

### 3.1 Key Share 临时公私钥

作用：

> 用来建立本次连接的共享秘密。

客户端：

```text
临时私钥 a
↓
临时公钥 A
```

服务器：

```text
临时私钥 b
↓
临时公钥 B
```

双方会公开交换：

```text
A
B
```

但不会公开：

```text
a
b
```

这套密钥主要属于：

```text
Key Share
密钥交换
共享秘密
```

相关内容见第五章。

---

### 3.2 证书长期公私钥

作用：

> 用来证明服务器身份。

服务器自己保存：

```text
证书对应私钥 S
```

服务器证书中包含：

```text
证书对应公钥 P
```

这套密钥主要用于：

```text
Certificate
Certificate Verify
数字签名
服务器身份认证
```

相关内容见第六章和第七章。

---

### 3.3 两套密钥的核心区别

```text
Key Share 临时密钥对
→ 解决“这次连接怎么得到共享秘密”

证书长期密钥对
→ 解决“这个服务器到底是谁”
```

后面看到 `Key Share` 时，不要想到证书公钥。

看到 `Certificate Verify` 时，也不要拿 Key Share 的临时私钥去理解。

---

## 第四章 Client Hello 与 Server Hello：协商阶段

### 4.1 TCP 是 TLS 的传输基础

传统 HTTPS 一般先完成 TCP 三次握手：

```text
SYN
↓
SYN, ACK
↓
ACK
```

TCP 建立之后，TLS 握手消息通过这个 TCP 连接传输。

在 Wireshark 中可以看到类似：

```text
Ethernet II
↓
IPv4
↓
TCP
↓
TLS
```

#### 通俗比喻

TCP 像：

> 先把电话线路接通。

TLS 接下来才是在电话线上商量：

> “我们用什么安全规则、怎么得到密钥、你到底是谁？”

---

### 4.2 Client Hello 的作用

Client Hello 可以理解为：

> 客户端向服务器提交“能力清单 + 本次连接信息 + 已准备好的公开密钥交换材料”。

最值得看的字段：

| 字段 | 作用 |
|---|---|
| SNI / server_name | 我要访问哪个域名 |
| supported_versions | 我支持哪些 TLS 版本 |
| cipher_suites | 我支持哪些 TLS 1.3 数据保护方案 |
| supported_groups | 我支持哪些密钥交换 Group |
| key_share | 我已经按某些 Group 生成好的公开密钥交换材料 |
| signature_algorithms | 我能验证哪些签名算法 |
| ALPN | TLS 建好后，我支持 h2、http/1.1 等哪些上层协议 |
| Random | 本次 Client Hello 中的随机字段，也是握手消息的一部分 |

这些字段不是都让服务器“选一个”。例如 SNI 是告诉服务器目标域名。

---

### 4.3 SNI

SNI（Server Name Indication）作用：

> 告诉服务器客户端想访问哪个域名。

同一个 IP 可以托管多个域名，因此只有目标 IP 往往不够。

例如：

```text
Client Hello
server_name = example.com
```

SNI 是 Client Hello 中的公开信息。在传统 TLS 1.3 中，它通常可以被旁观者看到；ECH 属于另一个更高级的话题，本笔记暂不展开。

---

### 4.4 Supported Versions

客户端列出自己支持的 TLS 版本，例如：

```text
TLS 1.3
TLS 1.2
```

服务器从双方都支持的版本中选择最终版本。

TLS 1.3 抓包中经常还能看到：

```text
legacy_version = TLS 1.2 (0x0303)
```

这不表示实际协商成 TLS 1.2。

TLS 1.3 的真正协商结果应看：

```text
supported_versions
```

---

### 4.5 Cipher Suites

客户端在 Client Hello 中列出自己支持的 Cipher Suites。

例如：

```text
TLS_AES_256_GCM_SHA384
TLS_AES_128_GCM_SHA256
...
```

这相当于：

> “这些 TLS 1.3 记录层加密 + Hash 组合我都支持。”

服务器之后选择其中一个。

本次抓包中最终选择的是：

```text
TLS_AES_256_GCM_SHA384
```

因此：

```text
AES-256-GCM
→ 后续记录层的对称加密和认证

SHA-384
→ 握手摘要、HKDF、Finished 等所使用的 Hash
```

---

### 4.6 Supported Groups

Supported Groups 表示：

> 客户端支持哪些密钥交换 Group / 数学方案。

本次抓包中曾看到：

```text
X25519MLKEM768
x25519
secp256r1
secp384r1
```

它解决的是：

```text
共享秘密要使用哪一种密钥交换机制建立？
```

它不负责：

```text
直接加密 HTTP 数据
直接发送 Shared Secret
直接发送客户端私钥
```

#### 和 Key Share 的关系

Supported Groups 是“能力列表”：

```text
这些方案我都会
```

Key Share 是“我已经真正为本次握手准备好的公开材料”：

```text
这些方案我已经提前算好公开交换数据了
```

客户端不一定为 Supported Groups 中的每一个 Group 都携带 Key Share。

---

### 4.7 Key Share

Key Share 的核心结构可以先记成：

```text
Group 名称
+
该 Group 对应的 Key Exchange 公开数据
```

例如普通 X25519 的简化模型：

```text
客户端临时私钥：a
客户端公开值：A = aG
```

则 Client Hello 中可以理解为：

```text
Key Share Entry
Group: x25519
Key Exchange: A
```

其中：

```text
a
→ 永远留在客户端，不发送

A
→ 可以公开，放进 key_share 发送
```

客户端可以携带一个或多个 Key Share Entry。

例如：

```text
key_share
├─ X25519MLKEM768 + 对应公开交换材料
└─ x25519 + 对应公开交换材料
```

服务器只需要选择一个实际使用的 Group，并返回自己在该 Group 下的 key_share。

#### 关于 X25519MLKEM768

本次实际抓包中服务器选择过：

```text
X25519MLKEM768
```

它是混合密钥建立方案，不能简单等同于一份 `A=aG / B=bG`。

本笔记中的 ABG 模型主要用于理解经典 Diffie-Hellman / ECDHE 的核心思想：

> 私有值不发送，只交换公开材料，最后双方各自在本地得到相同秘密。

理解 Reality 抓包时，要记住真实的 `X25519MLKEM768 key_share` 内容比 ABG 玩具模型复杂。

---

### 4.8 Signature Algorithms

Client Hello 还会告诉服务器：

> “这些数字签名算法我能够验证。”

它主要服务于后面的服务器身份认证，例如 Certificate Verify。

不要把它和 key_share 混淆：

```text
key_share
→ 建立 Shared Secret

signature_algorithms
→ 服务器之后用什么签名方案证明身份
```

---

### 4.9 ALPN

ALPN（Application-Layer Protocol Negotiation）表示：

> TLS 建好以后，上层准备运行什么应用层协议。

客户端可能发送：

```text
h2
http/1.1
```

意思是：

```text
我支持 HTTP/2
我也支持 HTTP/1.1
```

TLS 1.3 中，服务器最终选择的 ALPN 一般在后面的：

```text
Encrypted Extensions
```

中返回，而不是 Server Hello 里返回。

---

### 4.10 Server Hello 到底选择什么

Server Hello 的核心任务是：

> 把这次 TLS 连接最关键的基础参数正式确定下来，并返回服务器的公开密钥交换材料。

TLS 1.3 中最核心的三项：

```text
1. TLS Version
2. Cipher Suite
3. Key Share / Group
```

本次抓包可以概括为：

```text
TLS Version
→ TLS 1.3

Cipher Suite
→ TLS_AES_256_GCM_SHA384

Key Share Group
→ X25519MLKEM768

Server key_share
→ 服务器在该 Group 下生成的公开交换材料
```

如果使用普通 X25519 的 ABG 简化模型：

```text
服务器临时私钥：b
服务器公开值：B = bG

Server Hello key_share
→ Group: x25519
→ Key Exchange: B
```

注意：

```text
b
```

绝不会被发送。

#### Server Hello 不负责选择什么

```text
SNI
→ 客户端告诉服务器目标域名，不是服务器“选域名”

ALPN
→ TLS 1.3 一般在 Encrypted Extensions 中返回最终选择
```

因此可以把 Hello 阶段压缩成：

```text
Client Hello：
“我支持这些 TLS 版本、Cipher Suite、Group；这是我准备好的 key_share；我要访问这个域名。”

Server Hello：
“这次使用 TLS 1.3、这个 Cipher Suite、这个 Group；这是我的 key_share。”
```

到 Server Hello 完成时，双方已经拥有足够的公开交换材料和各自本地私有材料，可以进入 Shared Secret 与 TLS Key Schedule。

---

## 第五章 Key Share 与共享秘密

这一章只讲：

> 客户端和服务器怎样只交换公开值，却最终算出同一个共享秘密。

### 5.1 ABG 数学模型

先有一个公开参数：

```text
G
```

G 是公开的，所有人都可以知道。

客户端秘密生成：

```text
临时私钥 a
```

并计算：

```text
A = aG
```

其中：

```text
A
```

就是客户端发送给服务器的临时公开值。

服务器秘密生成：

```text
临时私钥 b
```

并计算：

```text
B = bG
```

服务器把：

```text
B
```

发送给客户端。

所以网络上公开的是：

```text
G
A
B
```

真正保密的是：

```text
a
b
```

---

### 5.2 客户端如何得到共享秘密

客户端知道：

```text
自己的私钥 a
服务器公钥 B
```

因为：

```text
B = bG
```

所以客户端计算：

```text
aB
= a(bG)
= abG
```

客户端得到：

```text
abG
```

---

### 5.3 服务器如何得到同一个共享秘密

服务器知道：

```text
自己的私钥 b
客户端公钥 A
```

因为：

```text
A = aG
```

所以服务器计算：

```text
bA
= b(aG)
= abG
```

服务器也得到：

```text
abG
```

因此：

```text
客户端结果 = abG
服务器结果 = abG
```

双方拥有相同 Shared Secret。

---

### 5.4 为什么攻击者不能直接得到 Shared Secret

攻击者可以抓到：

```text
G
A
B
```

但是不知道：

```text
a
b
```

要想得到客户端私钥，就要尝试：

```text
A = aG

已知：
A
G

求：
a
```

这属于椭圆曲线密码学中的困难问题。

核心直觉：

```text
a
↓
A = aG
容易

A + G
↓
反推出 a
极难
```

所以：

> 双方没有把 Shared Secret 发到网络上，而是各自在本地计算出了同一个结果。

#### 通俗比喻

双方各自有一份只有自己知道的秘密配方：

```text
客户端秘密配方 a
服务器秘密配方 b
```

他们只把“加工后的公开结果” A、B 给对方。

每一方都使用：

```text
自己的秘密
+
对方公开结果
```

最终做出相同的成品。

旁观者虽然看到了双方交换的公开结果，却不知道任何一方的秘密配方。

---

### 5.5 从 Shared Secret 进入 TLS 1.3 Key Schedule

得到 Shared Secret 后，TLS 1.3 并不会把它直接拿给 AES 使用。

也不是：

```text
Shared Secret 很大
→ 把前面一段切给客户端
→ 把后面一段切给服务器
```

真实思路是：

```text
Shared Secret
+
TLS 1.3 规定的标签、上下文、握手摘要
↓
HKDF
↓
计算出新的 Secret
```

即：**通过密码学函数重新计算出不同用途的新秘密值，而不是把一个大秘密物理切开。**

TLS 1.3 的 Key Schedule 比下图更复杂，但学习主线可以先压缩成：

```text
密钥交换得到的 Shared Secret
↓
TLS 1.3 Key Schedule / HKDF
↓
client_handshake_traffic_secret
server_handshake_traffic_secret
↓
派生 handshake traffic key + IV
↓
保护握手后半段

继续 Key Schedule
↓
client_application_traffic_secret
server_application_traffic_secret
↓
派生 application traffic key + IV
↓
保护真正的应用数据
```

这里最重要的是“方向 + 阶段”两个维度：

| 阶段 | 客户端→服务器 | 服务器→客户端 |
|---|---|---|
| 握手阶段 | Client Handshake Traffic Key | Server Handshake Traffic Key |
| 应用阶段 | Client Application Traffic Key | Server Application Traffic Key |

客户端和服务器都会各自在本地算出这套对应值。

例如：

```text
客户端算出的 client application key
=
服务器算出的 client application key
```

这把 key 只负责：

```text
客户端 → 服务器
```

反方向使用另一把 server application key。

---

### 5.6 双方怎么保证派生算法完全一样

因为规则不是双方临时发明的，而是 TLS 1.3 标准提前规定好的。

握手阶段又进一步确定了本次连接所需参数。

例如服务器选择：

```text
TLS 1.3
TLS_AES_256_GCM_SHA384
```

于是双方都知道：

```text
Key Schedule 框架
→ TLS 1.3 规定的 HKDF 流程

Hash
→ SHA-384

记录层 AEAD
→ AES-256-GCM
```

因此双方拥有：

```text
相同 Shared Secret
+
相同握手消息
+
相同 TLS 1.3 Key Schedule
+
相同 SHA-384
+
相同 Label / Context
```

同样输入经过同样确定性算法，就得到相同对应结果。

---

### 5.7 Transcript Hash：把“这一次握手”绑定进密钥计算

TLS 1.3 中很多密码学计算都不是只看 Shared Secret。

还会计算：

```text
Transcript Hash
```

它可以先理解为：

```text
Client Hello
+
Server Hello
+
之后已经发生的握手消息
↓
按顺序拼接并做 Hash
↓
这一次握手过程的摘要
```

例如 Client Hello 和 Server Hello 中的：

```text
Random
key_share
TLS 版本信息
Cipher Suite 信息
各种扩展
```

都属于握手消息内容，因此会间接影响 Transcript Hash。

非常重要：

```text
临时私钥 a、b
Shared Secret
```

不会作为明文出现在 Transcript 中。

Transcript Hash 的意义之一是：

> 不只让密钥依赖“共同秘密”，还让密钥和“本次具体握手”绑定。

---

### 5.8 Traffic Secret、Traffic Key、IV 的关系

不要把三个词混成一个：

```text
Traffic Secret
→ 中间秘密材料

Traffic Key
→ 真正作为 AES-GCM Key 参数使用

IV
→ 从 Traffic Secret 派生出的基础值，用来构造每条 Record 的 Nonce
```

可以写成：

```text
Traffic Secret
↓
HKDF-Expand-Label
├─ Traffic Key
└─ IV
```

然后每条 TLS Record：

```text
Traffic Key
+
该 Record 对应的 Nonce
+
明文
↓
AES-GCM
↓
密文 + Authentication Tag
```

所以“派生密钥用于什么”可以直接回答：

```text
握手 Traffic Key
→ 保护握手后半段

应用 Traffic Key
→ 保护 HTTP 等真正业务数据
```

不同方向使用不同 Key，避免所有数据共用一把总钥匙。

---

## 第六章 Certificate：服务器先拿出“身份证”

### 6.1 证书的作用

服务器接下来需要解决：

> “客户端为什么应该相信我是目标服务器？”

所以服务器发送：

```text
Certificate
```

证书里一般包含：

```text
域名信息
服务器长期公钥
有效期
签发者 CA
CA 的数字签名
……
```

证书中的公钥属于第三章所说的：

```text
证书长期公钥
```

不要和第五章的 Key Share 临时公钥混淆。

---

### 6.2 证书从哪里来

服务器运营方通常会先生成：

```text
证书私钥
+
对应公钥
```

私钥留在服务器自己手里。

服务器不会把私钥交给 CA。

申请证书时，会把：

```text
域名
公钥
申请信息
```

等内容提交给 CA。

CA 还会验证申请者是否真的控制这个域名。

常见验证方式包括：

```text
HTTP 验证
DNS 验证
TLS 验证
```

验证成功后，CA 才会签发证书。

---

### 6.3 CA 到底在证明什么

普通域名验证证书的核心是：

> CA 证明“某个经过验证的域名控制者，把这个公钥绑定到了这个域名上”。

因此证书不是简单：

```text
域名 + 公钥
→ 自动生成
```

而更接近：

```text
申请者提交域名和公钥
↓
CA 验证域名控制权
↓
CA 对证书内容做数字签名
↓
证书签发
```

---

### 6.4 一个证书一定只对应一个域名吗

不一定。

一个证书可以保护：

```text
example.com
```

也可以同时保护：

```text
example.com
www.example.com
api.example.com
```

这些域名通常记录在：

```text
SAN
Subject Alternative Name
```

也可以有通配符：

```text
*.example.com
```

所以：

```text
证书
和
域名
```

不是严格一对一关系。

---

### 6.5 通俗比喻

Certificate 可以理解成：

> 服务器拿出一张由可信机构签发的身份证。

但是：

> 光有“身份证照片”还不够。

因为证书本身可以被任何人复制。

所以后面还需要 `Certificate Verify`，证明：

> “我不只是拿到了一张证书，我真的拥有证书对应的私钥。”

---

## 第七章 客户端如何验证 Certificate

本章只回答：

> “这张证书本身是否可信？”

不要和下一章“服务器是否真的持有证书私钥”混在一起。

### 7.1 检查域名是否匹配

假设客户端访问：

```text
https://example.com
```

那么证书允许的域名中必须包含：

```text
example.com
```

如果证书只属于：

```text
attacker.com
```

即使这张证书本身是真的，也不能用于证明服务器是 `example.com`。

---

### 7.2 检查有效期

证书通常包含：

```text
Not Before
Not After
```

客户端要检查当前时间是否处于有效期内。

---

### 7.3 检查 CA 签名和证书链

网站证书通常不是直接由 Root CA 签发。

常见结构：

```text
Root CA
↓
Intermediate CA
↓
example.com
```

客户端验证：

```text
example.com 证书
是不是 Intermediate CA 签的？
```

再验证：

```text
Intermediate CA
是不是 Root CA 签的？
```

最后检查：

```text
Root CA
是不是已经存在于本机可信根证书库？
```

如果一路验证到受信任的 Root CA：

```text
可信 Root CA
↓
可信 Intermediate CA
↓
可信 example.com 证书
```

证书链成立。

---

### 7.4 通俗比喻

可以把证书链理解成层层盖章：

```text
最高可信机构
↓
给中间机构授权
↓
中间机构再给网站出具证明
```

客户端本来就信任最高层机构。

因此只要整个签发关系能一路验证到这个可信根，就可以建立信任。

---

### 7.5 验证完证书后仍然缺什么

即使客户端已经确认：

```text
这是一张真的 example.com 证书
```

仍然不能直接证明：

```text
眼前这个服务器就是证书真正持有者
```

因为攻击者也可以复制公开的证书。

因此下一章需要：

```text
Certificate Verify
```

---


### 补充：证书链的直观理解

假设网站证书是：

```text
example.com
```

它可能不是 Root CA 直接签的，而是：

```text
Root CA
↓
Intermediate CA
↓
example.com
```

客户端会依次检查：

```text
example.com 的证书
是不是 Intermediate CA 签的？
```

再检查：

```text
Intermediate CA
是不是 Root CA 签的？
```

最后：

```text
这个 Root CA
是不是已经在系统/浏览器可信根证书库里？
```

如果能一路验证到可信 Root CA，证书链就成立。

---

#### 通俗比喻

可以把证书链理解成：

```text
学校盖章
↓
学院盖章
↓
辅导员证明你是这个班的学生
```

你不一定直接认识辅导员，但你信任学校。

只要整个证明链能一路追溯到你已经信任的机构，就可以建立信任。

---

## 第八章 Certificate Verify：服务器证明自己真的持有私钥

本章只回答：

> “服务器怎样证明证书确实属于自己，而又不把私钥发送出来？”

### 8.1 核心逻辑

Certificate Verify 要解决：

> “服务器不只发来了一张公开证书，它还要证明自己真的掌握这张证书对应的私钥。”

服务器拥有：

```text
证书对应私钥 S
```

客户端从服务器证书中得到：

```text
证书对应公钥 P
```

服务器不会发送私钥，而是使用私钥生成数字签名。

TLS 1.3 可以先简化理解成：

```text
之前的握手消息
↓
Transcript Hash
↓
加入 TLS 1.3 规定的 CertificateVerify 上下文
↓
服务器使用证书私钥签名
↓
Certificate Verify 中发送 Signature
```

客户端：

```text
同样的握手消息
↓
算出同样的 Transcript Hash

然后使用：
证书公钥
+
服务器发来的 Signature
+
本地得到的待验证内容
↓
执行签名验证算法
↓
通过 / 不通过
```

这里不是：

```text
“用公钥把签名解密出原文”
```

更准确的说法是：

```text
使用公钥执行数字签名验证
```

验证成功能够说明：

```text
1. 对方掌握证书对应的私钥
2. Certificate Verify 所覆盖的握手上下文与客户端看到的一致
```

#### Certificate Verify 不依赖什么

不要误解为服务器把这些秘密塞进签名：

```text
客户端临时私钥 a
服务器临时私钥 b
Shared Secret
```

这些秘密不会直接写入 Certificate Verify。

它签的是“本次握手 Transcript 的摘要及 TLS 规定的上下文”。

---

### 8.2 为什么使用 Transcript Hash

TLS 握手消息很多，如果每个密码学步骤都重新处理整串消息会很笨重。

因此 TLS 会维护一个不断更新的 Transcript Hash。

可以先理解为：

```text
Hash(
  ClientHello
  || ServerHello
  || EncryptedExtensions
  || Certificate
  || ...
)
```

得到固定长度摘要。

因此：

```text
任何已经纳入 Transcript 的握手内容发生变化
↓
Transcript Hash 变化
↓
Certificate Verify / Finished 等后续验证无法正常通过
```

玩具数学例子仍然使用一个极小的 Hash 数字帮助理解，但真实 TLS 的 Transcript Hash 使用本次 Cipher Suite 对应的 Hash，例如本次连接中的 SHA-384。

---

### 8.3 玩具版 RSA 参数

为了直观看懂签名和验证，使用一个非常小的 RSA 玩具例子：

服务器证书里公开：

```text
n = 3233
e = 17
```

服务器秘密保存：

```text
d = 2753
```

其中：

```text
(n, e)
```

可以看成公钥参数。

```text
d
```

是私钥参数。

真实 TLS 中可能使用 RSA-PSS、ECDSA、EdDSA 等签名算法；这里用小 RSA 只是为了看清数学关系。

---

### 8.4 服务器生成签名

假设握手内容的 Hash：

```text
H = 65
```

服务器使用私钥：

```text
d = 2753
```

做玩具版签名：

```text
Signature
=
65^2753 mod 3233
```

得到：

```text
Signature = 588
```

服务器发送：

```text
Certificate Verify
Signature = 588
```

这里发送的是：

```text
588
```

不是：

```text
私钥 2753
```

私钥始终没有离开服务器。

---

### 8.5 客户端验证签名

客户端自己也拥有同样的握手内容。

所以客户端自己计算：

```text
Hash(握手内容)
=
65
```

然后从证书中取得服务器公钥：

```text
n = 3233
e = 17
```

再验证服务器发送的：

```text
Signature = 588
```

计算：

```text
588^17 mod 3233
=
65
```

于是客户端得到两个数字：

```text
自己根据握手内容算出的 Hash
=
65

用服务器公钥验证签名得到
=
65
```

比较：

```text
65 == 65
```

验证成功。

---

### 8.6 为什么这能证明服务器持有私钥

攻击者也可以知道：

```text
公钥
握手内容
Hash
证书
```

因为这些都不是秘密。

但是攻击者没有：

```text
私钥 d
```

因此攻击者无法轻易生成一个：

```text
能被证书公钥正确验证
```

的签名。

所以：

```text
签名验证成功
↓
对方能生成与证书公钥匹配的有效签名
↓
对方掌握证书对应私钥
```

这就是：

```text
Certificate Verify
```

真正要证明的事情。

---

### 8.7 如果握手内容被改了会怎样

假设服务器真正签名时：

```text
Hash = 65
```

攻击者篡改了某部分握手内容。

客户端重新计算后得到：

```text
Hash = 91
```

但服务器原签名通过公钥验证出来仍然对应：

```text
65
```

于是：

```text
91 ≠ 65
```

验证失败。

因此数字签名也把：

```text
服务器身份
```

和：

```text
当前这次握手内容
```

绑定到了一起。

---

### 8.8 通俗比喻

Certificate：

> “这是我的身份证。”

客户端验证 Certificate：

> “身份证是真的、没过期、名字也对、签发机构可信。”

Certificate Verify：

> “现在你再证明一下，你真的是这张身份证的持有人。”

私钥可以类比成：

> 只有真正持有人掌握的秘密印章。

服务器用私钥“盖章”。

客户端利用证书里的公钥检查：

> 这个章是不是真的属于与该证书配套的私钥。

所以：

```text
Certificate
→ 证明“证件可信”

Certificate Verify
→ 证明“眼前的人确实持有证件对应的秘密凭证”
```

---

## 第九章 Encrypted Extensions 与 ALPN 结果

TLS 1.3 在 Server Hello 之后，双方已经能根据第五章的方法建立共享秘密并派生握手密钥。

后续许多握手消息会受到加密保护。

服务器会发送：

```text
Encrypted Extensions
```

其中可能包含一些扩展协商结果。

例如 ALPN。

客户端之前在 Client Hello 中说：

```text
h2
http/1.1
```

服务器最终可能选择：

```text
h2
```

也就是：

```text
这条 TLS 连接上的应用层协议
=
HTTP/2
```

ALPN 的完整概念见第四章。

---

## 第十章 Finished：证明“共享秘密和整个握手都对得上”

`Finished` 不是：

> “TLS 连接结束”。

它是 TLS 握手认证阶段最后的核心确认消息。

### 10.1 Finished 和 Certificate Verify 不是一回事

Certificate Verify 主要证明：

```text
我掌握证书对应的私钥
```

Finished 主要证明：

```text
我拥有正确派生出来的握手秘密
+
我看到的前面握手 Transcript 与你一致
```

两者依赖的秘密不同：

```text
Certificate Verify
→ 证书私钥 + Transcript Hash

Finished
→ 从 Handshake Traffic Secret 派生出的 Finished Key
   + Transcript Hash
```

---

### 10.2 Finished Key 从哪里来

可以先简化为：

```text
Handshake Traffic Secret
↓
HKDF-Expand-Label(..., "finished", ...)
↓
Finished Key
```

然后：

```text
Finished Key
+
当前 Transcript Hash
↓
HMAC
↓
verify_data
```

这个 `verify_data` 就放进 Finished 消息。

接收方因为也能派生出同一个对应 Finished Key，并且拥有同样的握手消息，所以可以自己重新计算 verify_data。

如果：

```text
本地计算结果
=
收到的 Finished verify_data
```

验证通过。

如果前面的握手消息被改、双方 Key Schedule 不一致、共享秘密不一致，就会导致结果不匹配。

---

### 10.3 Finished 到底证明什么

可以把它拆成两个方面：

```text
Key Confirmation
→ 证明对方确实得到了正确的握手密钥材料

Handshake Integrity
→ 证明双方记录的握手过程一致，没有被悄悄改掉
```

因此：

```text
Certificate Verify
→ 更偏“你是谁、你有没有证书私钥”

Finished
→ 更偏“这次握手和这次密钥双方是否完全对得上”
```

服务器发送并完成自己的认证块后会发送 Server Finished；客户端验证服务器并完成自己的步骤后，再发送 Client Finished。

完成相应验证后，双方进入应用数据阶段。

#### 通俗比喻

前面已经：

```text
谈好规则
生成共同秘密
验证服务器证件和私钥持有关系
```

Finished 就像：

> “最后把整份手续、暗号和之前所有记录再核一遍；双方算出来一致，才正式开始业务通信。”

---

## 第十一章 Application Data：真正的数据如何被保护

握手阶段完成后，真正的应用数据开始传输。

例如明文 HTTP 可能是：

```text
GET /index.html HTTP/1.1
Host: example.com
```

TLS 1.3 不会直接把它放到网络上，而是使用应用阶段的 Traffic Key。

以本次 Cipher Suite 为例：

```text
TLS_AES_256_GCM_SHA384
```

应用数据保护主线：

```text
HTTP 明文
+
Application Traffic Key
+
本条 Record 的 Nonce
+
相关记录层附加信息
↓
AES-256-GCM
↓
TLS 密文 + Authentication Tag
```

接收方拥有对应方向的 Traffic Key，并能得到相同 Nonce，因此可以解密和验证完整性。

### 11.1 为什么不是“流量密钥自己加密数据”

Key 本身只是一串秘密比特。

真正执行数学变换的是算法：

```text
Traffic Key
→ AES-GCM 的秘密参数

AES-GCM
→ 真正执行加密、解密和完整性认证的算法
```

因此口语里的：

> “用流量密钥加密数据”

完整说法其实是：

> “把流量密钥作为 AES-GCM 的 Key 参数，对 TLS Record 进行认证加密。”

### 11.2 “TLS 加密通道”不是把物理网络再加密一次

实际网络仍然是公开的：

```text
客户端
↓
路由器
↓
运营商
↓
互联网
↓
服务器
```

中间设备仍然能看到很多元数据，例如：

```text
源/目标 IP
TCP 端口
包大小
时间
```

所谓“TLS 安全通道”的真正意思是：

> 在公开网络上传输的 TLS 负载已经被正确的 Traffic Key + AEAD 算法保护。

不是：

```text
先把数据加密
↓
再找另一把派生密钥把“通道本身”加密一次
```

没有这一步。

### 11.3 Wireshark 中看到什么

没有 TLS Key Log 等解密材料时，TLS 1.3 中 Server Hello 之后的很多握手消息和应用数据在记录层上已经被加密。

Wireshark 经常只能看到：

```text
TLS Application Data
```

而不能直接展开看到：

```text
Certificate
Finished
HTTP Header
HTTP Body
```

如果 Wireshark 拥有正确的会话秘密，则可以进一步解密显示其中内容。

---

## 第十二章 TLS 1.3 完整通信过程

下面按本次学习中形成的准确主线串起来。

```text
① TCP 三次握手

Client → Server : SYN
Server → Client : SYN, ACK
Client → Server : ACK

↓

② Client Hello

SNI
→ 我要访问哪个域名

supported_versions
→ 我支持哪些 TLS 版本

cipher_suites
→ 我支持哪些 TLS 1.3 AEAD + Hash 组合

supported_groups
→ 我支持哪些密钥交换 Group

key_share
→ 我已经按部分 Group 准备好的公开密钥交换材料

signature_algorithms
→ 我能验证哪些签名方案

ALPN
→ TLS 建好后我支持哪些应用层协议

↓

③ Server Hello

选择 TLS 版本
选择 Cipher Suite
选择实际使用的 Key Share Group
返回服务器自己的 key_share

↓

④ 建立 Shared Secret

用普通 ECDHE 简化模型表示：

客户端：a + B → Shared Secret
服务器：b + A → 同一个 Shared Secret

Shared Secret 本身从未直接通过网络发送

↓

⑤ TLS 1.3 Key Schedule

Shared Secret
+
TLS 规定的 HKDF 流程
+
Transcript Hash
↓
Handshake Traffic Secrets
↓
Handshake Traffic Key + IV

从这里开始，后面的握手消息受到握手流量密钥保护

↓

⑥ Encrypted Extensions

例如返回最终 ALPN：
h2 / http/1.1

↓

⑦ Certificate

服务器发送证书链
客户端检查：
域名
有效期
CA 签名
证书链
可信根

↓

⑧ Certificate Verify

服务器：
证书私钥 + 当前 Transcript Hash / TLS 规定上下文
→ 数字签名

客户端：
证书公钥 + 同样的待验证内容 + 签名
→ 验签

目的：
证明服务器掌握证书对应私钥

↓

⑨ Server Finished

server_handshake_traffic_secret
↓
Finished Key
+
Transcript Hash
↓
HMAC
↓
verify_data

客户端重新计算并验证

↓

⑩ Client Finished

客户端也使用自己对应的 Finished Key
对当前 Transcript 做最终确认

↓

⑪ 派生 Application Traffic Secrets

client_application_traffic_secret
server_application_traffic_secret
↓
分别派生
Traffic Key + IV

↓

⑫ Application Data

客户端→服务器：
Client Application Traffic Key + Nonce + AES-GCM

服务器→客户端：
Server Application Traffic Key + Nonce + AES-GCM

↓

HTTP / HTTP2 等应用数据被持续保护
```

### 12.1 一句话理解整个 TLS 1.3

```text
Hello
→ 谈规则并交换公开密钥材料

Key Schedule
→ 从共同秘密制造一整套不同用途的秘密和 Key

Certificate / Certificate Verify
→ 确认服务器身份

Finished
→ 确认握手和密钥双方完全对得上

Application Data
→ 使用应用流量密钥 + AEAD 算法保护真正业务数据
```

---

## 第十三章 容易混淆的概念对照

### 13.1 TLS 和加密算法

```text
TLS
→ 一整套安全通信协议

AES / ChaCha20
→ 对称加密算法

X25519
→ 密钥交换相关算法

SHA-256
→ Hash 算法
```

所以：

```text
TLS ≠ 某一种加密算法
```

---

### 13.2 密钥交换算法和 Cipher Suite

```text
密钥交换算法
→ 密钥怎么来

Cipher Suite
→ 有了密钥后怎么保护数据
```

最短记忆：

```text
X25519
→ 造钥匙

AES-GCM
→ 用钥匙锁数据
```

---

### 13.3 Supported Groups 和 Key Share

```text
Supported Groups
→ 我支持哪些密钥交换数学体系

Key Share
→ 我已经按照其中某种体系生成好的临时公开值
```

例如：

```text
Supported Groups:
x25519
secp256r1

Key Share:
x25519 对应的 A
```

---

### 13.4 Key Share 公钥和证书公钥

```text
Key Share 公钥
→ 临时
→ 用于生成 Shared Secret

证书公钥
→ 相对长期
→ 用于服务器身份认证和验证签名
```

---

### 13.5 Shared Secret、Traffic Secret 和 Traffic Key

```text
Shared Secret
→ 密钥交换阶段建立的共同秘密

Traffic Secret
→ TLS 1.3 Key Schedule 派生出的中间秘密材料

Traffic Key
→ 从对应 Traffic Secret 继续派生
→ 真正作为 AES-GCM 的 Key 参数使用
```

“会话密钥”只作为宽泛口语，不再用它指代这三层中的某一个固定对象。

---

### 13.6 Certificate 和 Certificate Verify

```text
Certificate
→ “这是我的证书”

Certificate Verify
→ “我证明我真的拥有证书对应私钥”
```

---

### 13.7 验证证书和验证 Certificate Verify

客户端验证 Certificate：

```text
域名
有效期
CA 签名
证书链
可信 Root CA
```

解决：

> “证书本身是否可信？”

客户端验证 Certificate Verify：

```text
证书公钥
+
服务器数字签名
+
当前握手内容
```

解决：

> “眼前服务器是否真的掌握证书对应私钥？”

---

### 13.8 公钥、公开参数、私钥

不要把“公开的东西”全部叫公钥。

例如第五章中：

```text
G
→ 公共数学参数

A = aG
→ 客户端临时公钥 / Key Share

B = bG
→ 服务器临时公钥 / Key Share

a
→ 客户端临时私钥

b
→ 服务器临时私钥
```

---

### 13.9 Traffic Secret 和 Traffic Key

```text
Traffic Secret
→ 中间秘密材料

Traffic Key
→ 从 Traffic Secret 派生，真正交给 AES-GCM 使用
```

不要把两者都简单叫“会话密钥”。

---

### 13.10 IV 和 Nonce

```text
IV
→ 从 Traffic Secret 派生出的基础值

Nonce
→ 每条 TLS Record 真正使用的唯一输入
```

TLS 1.3 中会把 IV 与 Record Sequence Number 组合，形成每条记录使用的 Nonce。

---

### 13.11 Certificate Verify 和 Finished

```text
Certificate Verify
→ 使用证书私钥做数字签名
→ 证明服务器掌握证书私钥

Finished
→ 使用从握手 Traffic Secret 派生的 Finished Key 做 HMAC
→ 证明握手 Transcript 和 Key Schedule 对得上
```

两者都绑定握手信息，但依赖的秘密完全不同。

---

### 13.12 Hash 和加密

```text
SHA-384
→ Hash / HKDF / Finished 等
→ 不能从摘要恢复原文

AES-256-GCM
→ 使用 Traffic Key + Nonce
→ 把明文变成可由正确密钥恢复的密文
```

---

### 13.13 “安全通道”和“再加密通道”

TLS 不存在：

```text
把 HTTP 加密一次
↓
再拿另一把密钥把网络通道本身加密一次
```

所谓安全通道就是：

```text
公开网络
+
持续使用 TLS Traffic Key / AEAD 保护 Record
=
逻辑上的 TLS 安全通道
```

---

## 第十四章 通俗比喻总览

为了复习，可以把 TLS 整体想成一次“建立安全专线”。

### TCP

> 先把电话线路接通。

### Client Hello

> 客户端递交一张“我会哪些安全方案、我要找谁”的清单。

### Server Hello

> 服务器从双方都支持的方案里确定实际使用的一套。

### Key Share

> 双方互换可以公开的计算结果，但不交换自己的秘密。

### Shared Secret

> 双方各自使用“自己的秘密 + 对方公开结果”，算出同一个秘密。

### Cipher Suite

> 共同钥匙有了以后，规定真正的数据该怎么锁、怎么检查有没有被动过。

### Certificate

> 服务器拿出身份证。

### 客户端验证 Certificate

> 检查身份证是不是可信机构签发、有没有过期、名字是不是我要找的人。

### Certificate Verify

> 服务器再证明自己真的是身份证本人，而不是捡到了一张身份证复印件。

### Finished

> 双方确认前面的手续、密钥和握手内容都正确。

### Application Data

> 正式把业务数据放进已经建立好的安全通道里传输。

---

## 第十五章 最短复习版

```text
TLS 1.3
→ 一套安全通信协议，不是一种加密算法

Client Hello
→ 我要访问谁
→ 我支持哪些 TLS Version / Cipher Suite / Group
→ 这是我已经准备好的 key_share

Server Hello
→ 选 TLS 版本
→ 选 Cipher Suite
→ 选实际 Group
→ 返回服务器 key_share

supported_groups
→ 我会哪些密钥交换方案

key_share
→ 方案名字 + 按该方案生成的公开交换材料

临时私钥 a / b
→ 永远留在本地

Key Share A / B
→ 可以公开传输

Shared Secret
→ 双方使用自己的私有材料 + 对方公开材料各自在本地算出
→ Shared Secret 本身不在网络上传输

TLS 1.3 Key Schedule
→ 使用 HKDF + Cipher Suite 对应 Hash + Transcript Hash 等
→ 派生 Handshake / Application Traffic Secret

Traffic Secret
→ 中间秘密材料

Traffic Key + IV
→ 从 Traffic Secret 继续派生

Nonce
→ IV 与 Record 序号组合得到的每条记录唯一输入

AES-GCM
→ Traffic Key + Nonce + 明文
→ 密文 + 完整性认证 Tag

Certificate
→ 服务器拿出由 CA 体系签发的证书链

Certificate Verify
→ 证书私钥签名 Transcript 相关内容
→ 客户端用证书公钥验签
→ 证明服务器真的掌握证书私钥

Finished
→ Finished Key + Transcript Hash → HMAC
→ 确认共享秘密派生结果和整个握手记录都一致

Application Data
→ 分方向使用不同应用 Traffic Key
→ 真正保护 HTTP / HTTP2 等业务数据
```

---

## 第十六章 TLS 1.2 老式 RSA 密钥交换与 TLS 1.3 的区别

很多科普视频会讲：

```text
客户端生成 Premaster Secret
↓
使用服务器 RSA 公钥加密
↓
发给服务器
↓
服务器用 RSA 私钥解密
↓
双方再派生会话密钥
```

这种讲法对应的是 **旧版 TLS 中的 RSA Key Exchange**，不是现代 TLS 1.3 的主流程。

### 16.1 老式 RSA Key Exchange

核心特点：

```text
客户端直接生成 Premaster Secret
↓
用服务器证书 RSA 公钥加密
↓
把“加密后的秘密”发送给服务器
```

服务器证书私钥在这里不仅参与身份关系，还直接用于解开这个密钥交换秘密。

### 16.2 TLS 1.3

TLS 1.3 已经移除了静态 RSA 密钥交换。

现代主线是：

```text
客户端临时私有材料
服务器临时私有材料
↓
交换 key_share 公开材料
↓
双方各自在本地建立相同 Shared Secret
↓
TLS 1.3 HKDF Key Schedule
↓
Traffic Secrets / Traffic Keys
```

服务器证书私钥的主要用途变成：

```text
Certificate Verify
→ 数字签名
→ 证明服务器身份
```

而不是：

```text
解密客户端发来的 Premaster Secret
```

### 16.3 Client Random / Server Random 还存在吗

存在。

Client Hello / Server Hello 仍然包含 Random 字段。

但不要再用旧式简化公式：

```text
Premaster Secret + Client Random + Server Random
→ 会话密钥
```

直接套到 TLS 1.3。

TLS 1.3 中 Random 属于握手消息内容，因此会进入 Transcript Hash，并通过 Key Schedule 间接影响后续密钥计算。

---

## 第十七章 Wireshark 实际抓包学习路线

本章只记录本次实际学习中最有用的操作。

### 17.1 先锁定 TCP 连接

先筛 TCP 第一次握手 SYN：

```text
tcp.flags.syn == 1 && tcp.flags.ack == 0
```

逐项解释：

```text
tcp
→ TCP 协议字段

flags.syn
→ TCP SYN 标志位

== 1
→ SYN 被置位

&&
→ 并且

flags.ack == 0
→ ACK 没有置位
```

整体含义：

> 只找 TCP 三次握手的第一个 SYN 包。

找到目标连接后查看：

```text
Transmission Control Protocol
→ Stream index
```

例如 Stream index = 7，则过滤：

```text
tcp.stream eq 7
```

逐项解释：

```text
tcp.stream
→ Wireshark 给一条 TCP 会话分配的编号

eq
→ 等于

7
→ 只看编号为 7 的 TCP 会话
```

### 17.2 常用 TLS 过滤条件

Client Hello：

```text
tls.handshake.type == 1
```

含义：

```text
tls.handshake.type
→ TLS Handshake 消息类型字段

1
→ Client Hello
```

Server Hello：

```text
tls.handshake.type == 2
```

其中：

```text
2
→ Server Hello
```

如果已经知道 stream，优先使用：

```text
tcp.stream eq X
```

再从该连接头部向下观察握手顺序，比只靠 IP 查包更稳。

### 17.3 Client Hello 最值得看的字段

```text
server_name / SNI
supported_versions
cipher_suites
supported_groups
key_share
signature_algorithms
ALPN
Random
```

### 17.4 Server Hello 最值得看的字段

```text
supported_versions
→ 最终 TLS 版本

Cipher Suite
→ 最终 AEAD + Hash 组合

key_share
→ 最终 Group + 服务器公开交换材料
```

TLS 1.3 中看到：

```text
Version: TLS 1.2 (0x0303)
```

不能立刻判断实际是 TLS 1.2，要看 `supported_versions`。

### 17.5 为什么后面的 Certificate / Finished 可能看不到

TLS 1.3 在 Server Hello 后很快进入加密握手阶段。

没有 TLS secrets 的被动抓包，Wireshark 往往只能看到：

```text
Application Data
```

而不能直接解析出加密记录内部的：

```text
Encrypted Extensions
Certificate
Certificate Verify
Finished
```

这不是这些消息没发送，而是抓包端没有解密所需的流量秘密。

---

## 第十八章 通用 HTTPS 反向代理案例

以教学域名 `service.example.com` 为例，浏览器与反向代理之间使用 HTTPS，代理终止 TLS 后再转发给本机应用。应分清浏览器到代理、代理到应用两个连接，不能把管理平面与其他数据平面的连接混为一谈。

本公开版省略具体服务器、节点协议配置、软件版本、监听端口、目标站点及订阅信息。实验时使用自己的授权环境，先观察标准 HTTPS 握手，再对照其他协议的分层关系。


## 第十九章 本笔记的术语规范

为了避免后续继续混淆，本笔记统一使用：

```text
Shared Secret
→ 密钥交换后双方得到的共同秘密

Traffic Secret
→ TLS Key Schedule 中间阶段的秘密材料

Traffic Key
→ 真正交给 AEAD 算法使用的对称密钥

IV
→ 从 Traffic Secret 派生的基础初始化值

Nonce
→ 每条 Record 的唯一 AEAD 输入

Key Share
→ Group 名称 + 该 Group 对应的公开密钥交换材料

Certificate Public Key
→ 验证 Certificate Verify 签名

Key Share Public Material
→ 建立 Shared Secret
```

以后如果口语里使用“会话密钥”，优先理解为：

> “本次 TLS 会话中派生出的某类流量密钥”，而不是一把全程万能总密钥。

---

## 第二十章 参考标准

本笔记的 TLS 1.3 术语和关键流程以 RFC 8446 为准：

```text
RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3
https://www.rfc-editor.org/rfc/rfc8446
```

HKDF 的基础定义：

```text
RFC 5869 — HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
https://www.rfc-editor.org/rfc/rfc5869
```

学习时以 Wireshark 实际抓包帮助建立直觉，但当抓包显示与科普视频冲突时，应优先确认：

```text
TLS 版本是否相同
密钥交换模式是否相同
是否属于普通 HTTPS
还是属于 Reality 等特殊协议场景
```

---

## 附录 A：ABG 共享秘密公式

```text
公开：
G

客户端：
私钥 a
公钥 A = aG

服务器：
私钥 b
公钥 B = bG

客户端：
aB
= a(bG)
= abG

服务器：
bA
= b(aG)
= abG

最终：
双方得到同一个 Shared Secret = abG
```

---

## 附录 B：Certificate Verify 数学玩具例子

```text
服务器公钥：
n = 3233
e = 17

服务器私钥：
d = 2753

握手内容 Hash：
H = 65

服务器签名：
Signature
= 65^2753 mod 3233
= 588

客户端验证：
588^17 mod 3233
= 65

客户端自己计算：
Hash(握手内容)
= 65

比较：
65 == 65

结果：
签名验证成功
```

这个玩具例子只用于帮助理解：

```text
私钥
→ 生成签名

公钥
→ 验证签名
```

真实 TLS 会使用标准化的签名方案，不应把上述小数字运算当成真实安全参数。

## 综合复习：握手主线

```text
TLS 不是一种加密算法
→ 它是一套安全通信协议

Client Hello
→ 客户端说明自己支持什么、要访问谁，并发送 Key Share

Server Hello
→ 服务器确定使用的 TLS 版本、Cipher Suite，并返回自己的 Key Share

Key Share
→ 双方用临时公私钥建立 Shared Secret

Shared Secret
→ 再派生出 TLS 使用的各种密钥

Certificate
→ 服务器拿出由 CA 签发的证书

客户端验证证书
→ 看域名、有效期、CA、证书链是否可信

Certificate Verify
→ 服务器用证书私钥签名
→ 客户端用证书公钥验证
→ 证明服务器确实持有对应私钥

Finished
→ 双方确认握手和密钥正确

Application Data
→ 正式加密传输 HTTP 等应用数据
```

---
