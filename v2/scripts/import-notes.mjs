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
function headings(text) {
  let fenced = false;
  let removedTitle = false;
  return text.replace(/^\uFEFF/, '').split('\n').map(line => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (!fenced && /^# /.test(line) && !removedTitle) { removedTitle = true; return ''; }
    if (!fenced && /^#{1,5} /.test(line)) return '#' + line;
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
console.log('已导入 5 篇主题笔记与 README 介绍；TLS 三版已整合，网站副本已替换部署示例值。');
