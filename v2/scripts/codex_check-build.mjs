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
assert.equal(pages.length, 9, '必须包含首页、项目列表、四个详情、关于页、联系页和 404');
const byPath = new Map();
for (const page of pages) byPath.set(page, await readFile(page, 'utf8'));
const forbidden = /USER_CONTEXT\.md|SERVER_SSH_KEY|panel\.yuxinlei\.cloud|\/var\/www\/|Reality|59995|56641|43\.167\.157\.131/;
let links = 0;
for (const [page, html] of byPath) {
  assert(!forbidden.test(html), `不应发布内部背景或管理信息：${page}`);
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
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, 8, 'sitemap 应覆盖 8 个内容页面');
assert(!sitemap.includes('404'), '404 不应进入 sitemap');
console.log(`通过：${pages.length} 个 HTML 页面；${links} 个内部链接/素材/锚点；SEO、站点地图与内容隔离检查。`);
