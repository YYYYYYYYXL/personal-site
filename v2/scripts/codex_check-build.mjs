import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
const files = await walk(root);
const pages = files.filter(file => file.endsWith('.html'));
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const siteRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
assert.equal(pages.length, siteRoutes.length + 1, '内容页面与 sitemap 应一致，并额外包含 404');
for (const route of ['/notes/', '/notes/ssh-sshd/', '/notes/tls-1-3/', '/notes/ubuntu-operations/', '/notes/wireshark-protocols/', '/notes/hydra-kali/', '/notes/3x-ui-deployment/']) assert(siteRoutes.includes(route), `缺少笔记路由：${route}`);
assert(siteRoutes.includes('/projects/new-api-relay/'), '缺少 New API 项目详情页');
assert(siteRoutes.includes('/projects/3x-ui-xray/'), '缺少 3X-UI 项目详情页');
const byPath = new Map();
for (const page of pages) byPath.set(page, await readFile(page, 'utf8'));
const forbidden = /USER_CONTEXT\.md|SERVER_SSH_KEY|panel\.yuxinlei\.cloud|59995|56641|43\.167\.157\.131|-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/;
let links = 0;
for (const [page, html] of byPath) {
  assert(!forbidden.test(html), `不应发布内部背景或管理信息：${page}`);
  if (page.includes(`${path.sep}notes${path.sep}`)) {
    assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|(?:vless|vmess|trojan):\/\/[a-z0-9]|https?:\/\/[^\s"<>]+\/sub\//i.test(html), `笔记中不能包含节点标识、分享或订阅链接：${page}`);
    assert(!/(?:3x-ui|Xray)\s+\d+\.\d+\.\d+/i.test(html), `笔记中不能保留实际面板或核心版本：${page}`);
  }
  assert.match(html, /<html[^>]+lang="zh-CN"/, `缺少中文语言属性：${page}`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `每页应只有一个 h1：${page}`);
  assert.match(html, /<meta name="description" content="[^"\s][^"]+"/, `缺少页面描述：${page}`);
  assert.match(html, /<link rel="canonical" href="https:\/\/yuxinlei\.cloud\//, `缺少 canonical：${page}`);
  assert.match(html, /<main[^>]+id="main-content"/, `缺少跳转目标：${page}`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `存在重复 ID：${page}`);
  const relative = path.relative(root, page).replaceAll(path.sep, '/').replace(/index\.html$/, '');
  const pageUrl = new URL(relative, 'https://yuxinlei.cloud/');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replaceAll('&amp;', '&');
    if (/^(?:mailto:|tel:|data:|javascript:)/.test(raw)) continue;
    const url = new URL(raw, pageUrl);
    if (url.origin !== pageUrl.origin) continue;
    const pathname = decodeURIComponent(url.pathname);
    let target = path.resolve(root, `.${pathname}`);
    assert(target === root || target.startsWith(root + path.sep), '链接必须位于静态产物目录');
    let info;
    try { info = await stat(target); } catch { assert.fail(`内部链接或素材不存在：${raw} @ ${relative}`); }
    if (info.isDirectory()) target = path.join(target, 'index.html');
    await stat(target);
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = byPath.get(target) ?? await readFile(target, 'utf8');
      const id = decodeURIComponent(url.hash.slice(1));
      assert(targetHtml.includes(`id="${id}"`), `锚点不存在：${raw} @ ${relative}`);
    }
    links++;
  }
}
for (const expected of ['social-cover.jpg', 'favicon.png', 'robots.txt', 'sitemap.xml']) await stat(path.join(root, expected));
assert(!files.some(file => /\.(?:md|ts|astro|yml|map)$/.test(file)), '静态产物不得包含源文件或背景档案');
assert.equal(new Set(siteRoutes).size, siteRoutes.length, 'sitemap 中不应有重复页面');
assert(!sitemap.includes('404'), '404 不应进入 sitemap');
console.log(`通过：${pages.length} 个 HTML 页面；${links} 个内部链接/素材/锚点；SEO、站点地图与内容隔离检查。`);
