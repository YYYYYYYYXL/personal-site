# 视觉素材记录

## 主视觉：src/assets/night-studio.png

由内置 Image Gen 生成，以原网站的二次元头像作为人物参考，头像现独立保存在 `src/assets/avatar.jpg`。主视觉为虚构主题插画，不表示本人真实工作环境。源图在 `src/assets`，页面由 Astro 生成响应式 WebP；社交预览使用 `public/social-cover.jpg`。

生成提示词：

> Use case: illustration-story. Create a production-quality background illustration for a Chinese developer's personal portfolio website. Target 1920x1080 landscape, crisp detailed anime cinematic background, one image only, NO UI, NO text, NO typography, NO logo, NO watermarks. Reference is the owner's existing anime avatar: preserve the recognizable dark short slightly tousled hair, black rectangular glasses, young male adult with black hoodie, but show him smaller in a rich immersive scene. A quiet late-night coding studio in deep black and midnight navy, subtle cool blue monitor light and rainy blue city window; two computer monitors, mechanical keyboard, books and small plant. Character seated on the RIGHT THIRD, thoughtful natural profile, hands realistically typing at a desk, looking at screens. Carefully drawn anime background art, refined and professional, no exaggerated cyberpunk or childish sticker style. Composition: generous dark negative space across LEFT HALF and top-left for website headings, no important object there. Objects and character concentrated right side; subtle silhouette of skyline through window. Entire bottom quarter transitions naturally into very dark blue shadow with no hard border so a website section can blend into it. Palette #060b16, #0d1729, steel slate, muted icy blue #80b9f5, tiny desaturated lavender details. Avoid green, gold, orange and red accents; NO neon strips, glowing frames, lens flares, excessive bokeh, particles, sci-fi holograms, gradients as the main subject, huge anime face, brand marks or readable code. Real art asset, not a screenshot or complete web mockup. Precise architectural perspective, restrained lighting, tactile natural materials and elegant composition. It must work with white text overlay on the left without hurting readability. This is a fictional atmospheric illustration, never a photograph or claimed view of the owner's real room.

## 研究配图：src/assets/image-research.png

由内置 Image Gen 生成，网页中明确标注为非实验结果。不是系统截图、真实去噪对比或任何模型的输出。

生成提示词：

> Use case: stylized-concept. Create ONE refined editorial cover illustration for an image-denoising research project on a developer's portfolio. Target 1400x800 landscape. Actual artwork asset only, not a website mockup, no text, no numbers, no chart, no interface, no labels or watermark. Art direction quiet technical black and midnight blue, graphite, silver and restrained ice blue. On the right two thirds: an elegant translucent rectangular optical sheet holding an atmospheric monochrome tree-and-mountain photograph, gently fragmented at one edge into tiny photographic grain. A second thin transparent film layer sits at a slight offset angle creating a scientific optical-film aesthetic. It is a conceptual still life about images, texture and clarity, NOT a before-and-after experimental comparison, NOT a claimed result from a denoising system. No paired input/output panels, no scientific plot or performance metric, no exaggerated glowing cubes, no bright neon or holograms. LEFT THIRD mostly empty deep navy shadow for website project text if necessary; most delicate details concentrated on right. Sparse composition with generous negative space, tactile light, sophisticated dark photography-like 3D illustration, fine film grain, natural perspective, beautifully restrained, black-blue only, no green or gold. Lower edge fades naturally into near-black shadow. The page will label this image as a conceptual illustration rather than a real experiment.

## 保留素材与图标

- `src/assets/capability-server.svg`、`capability-linux.svg`、`capability-network.svg`：本站绘制的服务器机架、Linux 终端、网络拓扑概念配图，供首页能力卡使用，不代表真实服务器结构、终端截图或实际网络部署。

- `src/assets/project-deployment.svg`：本站绘制的代码、构建、部署、上线流程图，用于 Magic Resume 卡片，不是应用截图。
- `src/assets/project-data.svg`：本站绘制的 CSV、处理、浏览流程概念图，用于商品分析卡片，不包含真实统计值，不是系统截图。没有使用旧素材中的爬虫和模拟仪表盘。
- 四个项目的封面及替代文本统一维护在 `src/data/projectCovers.ts`，共用卡片通过 Astro 输出响应式位图或轻量 SVG。

- `src/assets/avatar.jpg`、`public/favicon.png`：从旧站沿用并独立保存的头像与站点图标，不依赖已删除的旧资源目录。
- 图标：`@iconify-json/ph` 中的 Phosphor 图标，采用库提供的图形并在构建时输出，无额外客户端图标脚本。
- 字体：标题为霞鹜文楷 500 的本地字形子集，依 OFL 要求更名为 Xinlei WenKai；正文为 Noto Sans SC 可变字体，通过 Fontsource 构建为本地资源，无第三方字体 CDN 请求。许可证见 `public/fonts/OFL-LXGW-WenKai.txt` 与 `public/fonts/OFL-Noto-Sans-SC.txt`。
- 旧站的商品分析、简历制作概念图未作为真实项目截图使用。
