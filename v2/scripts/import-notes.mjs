import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const destination = resolve(dirname(fileURLToPath(import.meta.url)), '../src/content/notes');
const source = resolve(process.argv[2] ?? '../knowledge');
const read = name => readFile(resolve(source, name), 'utf8');
// These replacements apply only to the website copies; never edit the originals.
const profileSource = await readFile(resolve(destination, '../../data/profile.ts'), 'utf8');
const siteDomain = new URL(profileSource.match(/site:\s*'([^']+)'/)[1]).hostname;
const publicCopy = text => text.replaceAll(siteDomain, 'example.com').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, ip => {
  if (/^(?:127\.|10\.|192\.168\.|203\.0\.113\.|198\.51\.100\.|192\.0\.2\.)/.test(ip) || ['0.0.0.0', '255.255.255.255', '8.8.8.8', '1.1.1.1'].includes(ip)) return ip;
  return '203.0.113.10';
}).replace(/(\bssh\b[^\r\n]*\s-p\s+)\d{4,5}/g, (_, prefix) => prefix + '2222');
function headings(text, demote = true) {
  let fenced = false;
  let removedTitle = false;
  return text.replace(/^\uFEFF/, '').split('\n').map(line => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (!fenced && /^# /.test(line) && !removedTitle) { removedTitle = true; return ''; }
    if (demote && !fenced && /^#{1,5} /.test(line)) return '#' + line;
    return line;
  }).join('\n').trim();
}
function section(text, title) {
  const start = text.indexOf('\n# ' + title);
  if (start < 0) throw new Error('Missing TLS section: ' + title);
  const end = text.indexOf('\n# ', start + 2);
  return text.slice(start, end < 0 ? undefined : end).trim();
}
async function save(id, data, body) {
  const frontmatter = Object.entries(data).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  await writeFile(resolve(destination, id + '.md'), '---\n' + frontmatter + '\n---\n\n' + publicCopy(body) + '\n');
}
await mkdir(destination, { recursive: true });
await save('introduction', {title:'个人知识库', description:'日常学习笔记、概念总结与实验记录。', kind:'intro', order:0, icon:'book-open', tags:[], sources:['README.md']}, headings(await read('README.md')));
const entries = [
  ['ssh-sshd','SSH 与 SSHD','远程登录、密钥认证、Windows / Linux 服务配置与故障排查。','terminal-window',['SSH','Linux','Windows'],'SSH与SSHD完整知识整理_合并版.md'],
  ['ubuntu-operations','Ubuntu 服务器运维','共享基础设施、应用维护边界、备份恢复与项目下线流程。','hard-drives',['Ubuntu','Docker','Nginx'],'Ubuntu服务器三项目技术栈维护与完整删除手册.md'],
  ['wireshark-protocols','Wireshark 与网络协议','从抓包界面与过滤器，到 TCP、DNS、TLS 和常见协议的理解。','network',['Wireshark','TCP/IP','DNS'],'Wireshark与常用网络协议学习笔记_最终版.md'],
  ['hydra-kali','Hydra 与 Kali Linux','授权实验环境中的口令安全测试工具、参数与使用记录。','shield-check',['Kali Linux','Hydra','安全测试'],'Hydra_Kali_使用指南.md'],
];
for (const [i,e] of entries.entries()) {
  const [id,title,description,icon,tags,file] = e;
  let original = id === 'ubuntu-operations' ? await readFile(new URL('./templates/ubuntu-operations-public.md', import.meta.url), 'utf8') : await read(file);
  if (id === 'hydra-kali') original = original.replace(/^## ([一二三四五六七八九十]+、)/gm, '# $1');
  await save(id,{title,description,order:i === 0 ? 1 : i+2,icon,tags,sources:[file]},headings(original));
}
const tlsSources=['TLS_1.3学习笔记_整改扩展版.md','TLS_1.3学习笔记_教科书版.md','TLS_1.3学习笔记_最终版.md'];
const [expanded,textbook,final] = await Promise.all(tlsSources.map(read));
let merged = headings(expanded);
const deploymentStart = merged.indexOf('\n## 第十八章');
const deploymentEnd = merged.indexOf('\n## 第十九章', deploymentStart);
if (deploymentStart < 0 || deploymentEnd < 0) throw new Error('Missing TLS deployment section boundaries');
merged = merged.slice(0, deploymentStart) + '\n## 第十八章 通用 HTTPS 反向代理案例\n\n以教学域名 `service.example.com` 为例，浏览器与反向代理之间使用 HTTPS，代理终止 TLS 后再转发给本机应用。应分清浏览器到代理、代理到应用两个连接，不能把管理平面与其他数据平面的连接混为一谈。\n\n本公开版省略具体服务器、节点协议配置、软件版本、监听端口、目标站点及订阅信息。实验时使用自己的授权环境，先观察标准 HTTPS 握手，再对照其他协议的分层关系。\n\n' + merged.slice(deploymentEnd);
merged = merged.replace('Wireshark 实测 → 当前项目映射', 'Wireshark 实测 → 通用应用案例').replace(/本版根据实际 Wireshark 抓包与当前 x-ui \+ Xray Reality 项目重新整改/g, '本版结合 Wireshark 抓包学习整理');
// The expanded edition is the corrected superset of the textbook's main chapters.
// Keep its terminology rather than repeat conflicting shorter explanations.
const chain = section(final, '十六、证书链是怎么回事？').replace(/^## /gm, '#### ').replace(/^# .+/, '### 补充：证书链的直观理解');
const chainAt = merged.indexOf('\n## 第八章');
if (chainAt < 0) throw new Error('Missing TLS certificate chapter');
merged = merged.slice(0,chainAt) + '\n\n' + chain + '\n' + merged.slice(chainAt);
const textbookReview = section(textbook, '第十五章 最短复习版').replace(/^# .+/, '## 综合复习：握手主线');
merged += '\n\n' + textbookReview;
merged = '> 整合教科书版、整改扩展版和最终版。以整改扩展版的章节与术语为主，保留数学示例、抓包路线与协议对照，补入最终版的证书链讲解及教科书版复习主线，避免重复铺陈三个版本。\n\n' + merged;
await save('tls-1-3',{title:'TLS 1.3：从握手到加密通信',description:'三份 TLS 笔记合并整理，串联密钥交换、证书认证、密钥派生与 Wireshark 观察。',order:2,icon:'lock-key',tags:['TLS 1.3','HTTPS','密码学'],sources:tlsSources},merged);

// Keep the complete tutorial, replacing deployment identifiers with consistent
// teaching examples. Read the originals at import time, never embed them here.
const xrayFile = '3X-UI_从零部署与节点配置指南.md';
const xrayPath = resolve(process.argv[3] ?? resolve(source, '../Xray-节点项目', xrayFile));
const xrayOriginal = await readFile(xrayPath, 'utf8');
const value = (pattern, label) => {
  const match = xrayOriginal.match(pattern);
  if (!match) throw new Error('无法识别教程参数，停止导入以免遗漏脱敏：' + label);
  return match[1];
};
const panelPort = value(/- 面板端口：\s*`(\d+)`/, '面板端口');
const nodePort = value(/- 节点端口：\s*`(\d+)\/TCP`/, '节点端口');
const subscriptionPort = value(/订阅子服务器端口\s*`(\d+)`/, '订阅端口');
const panelDomain = value(/- 面板管理域名：\s*`([^`]+)`/, '管理域名');
const realityHost = value(/REALITY 目标地址示例：\s*`([^`:]+):\d+`/, 'REALITY 目标');
const inboundName = value(/- 备注：\s*`([^`]+)`/, '入站备注');
let xray = xrayOriginal.replaceAll(panelDomain, 'panel.example.com')
  .replaceAll(realityHost, 'www.example.org').replaceAll(inboundName, 'demo-reality');
for (const [original, example] of [[panelPort, '22222'], [nodePort, '11111'], [subscriptionPort, '33333']]) {
  xray = xray.replace(new RegExp('\\b' + original + '\\b', 'g'), example);
}
xray = xray.replace(/\/(?:替换成[^/\r\n]*随机路径|实际随机路径)\//g, '/demo-7f3a9c2e/')
  .replace('### 1.3 本项目采用的配置基线', '### 1.3 本教程的示例配置基线')
  .replace('以下是当前部署环境中使用过的配置值。重新部署时可以沿用端口和协议，但域名、密码、随机路径、UUID、密钥等必须重新生成或替换。', '以下配置仅用于贯穿教程的示例，不代表作者或任何线上服务器的真实配置。实际部署时应选择自己的可用端口和域名，重新生成随机路径、密码、UUID 与密钥。')
  .replace('面板 Web Base Path：随机生成的路径，不在文档中记录。', '面板 Web Base Path：`/demo-7f3a9c2e/`（虚构示例，实际部署必须自行生成）。')
  .replaceAll('本项目已有配置示例：', '以下是格式示例，不是已验证可用的目标站点：')
  .replaceAll('本项目使用：', '本教程示例使用：')
  .replaceAll('东京服务器', '示例服务器')
  .replace('本项目使用的云服务器流量包说明为“仅统计服务器出流量”。', '例如，某云厂商的流量包可能“仅统计服务器出流量”，应以自己的套餐说明为准。')
  .replace('服务器公网 IP:11111', '203.0.113.10:11111');
const exampleNotice = `> **公开教学示例，非真实部署配置。** 本文保留原教程的安装、配置、客户端导入、验证、维护与排障步骤，仅将部署参数替换为示例。示例输出不是本网站服务器的运行结果，验收清单也不代表已完成测试。
>
> 管理域名、IP、端口、随机路径和入站备注均为演示值。请在自己的环境中逐项替换；密码、UUID、密钥和 Short ID 应自行生成，不要复用或公开真实凭据。

| 参数 | 本文统一示例 | 实际使用时 |
| --- | --- | --- |
| 管理域名 | \`panel.example.com\` | 换成自己拥有并已解析的域名 |
| 服务器公网 IPv4 | \`203.0.113.10\` | 文档示例地址，不可用于实际连接 |
| 面板内部端口 | \`22222/TCP\` | 与面板及 Nginx 上游配置一致，仅本机监听 |
| 节点入站端口 | \`11111/TCP\` | 与客户端、安全组和防火墙规则一致 |
| 订阅服务端口 | \`33333/TCP\` | 仅作解释，本教程不使用、不开放 |
| 面板随机路径 | \`/demo-7f3a9c2e/\` | 虚构路径；自行生成并与 Nginx location 保持一致 |
| 入站备注 | \`demo-reality\` | 自定义名称，不是线上节点名称 |
| REALITY 目标 / SNI | \`www.example.org:443\` / \`www.example.org\` | 仅示意格式，不保证满足 REALITY 的 TLS 要求；部署前选用并核实兼容的目标站点 |

\`example.com\`、\`example.org\` 与上述公网 IPv4 都是文档示例；照抄它们不会得到可用的面板、证书或节点。所有端口示例均在合法范围内，但仍须检查自己服务器的端口占用情况。软件界面与安装脚本可能随版本变化，实际操作前核对文末官方资料。

`;
await save('3x-ui-deployment', {
  title: '3X-UI 从零部署与节点配置',
  description: '完整保留 Ubuntu 原生安装、HTTPS 管理入口、VLESS + REALITY、客户端导入与排障流程，部署参数统一使用明确标注的示例。',
  order: 6, icon: 'network', tags: ['Ubuntu', '3X-UI', 'Xray', 'Nginx'], sources: [xrayFile],
}, exampleNotice + headings(xray, false));
console.log('已导入 6 篇主题笔记与 README 介绍；TLS 三版已整合，3X-UI 完整教程使用明确标注的示例参数。');
