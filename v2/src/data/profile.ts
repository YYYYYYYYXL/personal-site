export const profile = {
  name: '于鑫磊',
  englishName: 'Xinlei Yu',
  school: '内蒙古师范大学',
  college: '计算机科学技术学院',
  major: '数据科学与大数据技术',
  graduation: '2027 届',
  email: 'xinleiyu66@gmail.com',
  github: 'https://github.com/YYYYYYYYXL',
  githubName: 'YYYYYYYYXL',
  site: 'https://yuxinlei.cloud',
  description: '内蒙古师范大学数据科学与大数据技术专业 2027 届本科生。在项目中探索 Python、图像去噪、数据处理与应用开发。',
};

export const focusAreas = [
  { number: '01', icon: 'aperture', title: '图像与模型', description: '围绕图像去噪，继续推进模型训练、实验评价与系统实现。', tags: ['Python', 'PyTorch', '图像去噪'] },
  { number: '02', icon: 'database', title: '数据与应用', description: '从原始数据处理到接口与可视化，让数据成为可理解的内容。', tags: ['pandas', 'Django', 'SQL'] },
  { number: '03', icon: 'terminal-window', title: '工程与交付', description: '在真实部署中学习版本管理、自动化交付与问题定位。', tags: ['Git', 'Docker', 'Linux'] },
] as const;

export const practiceGroups = [
  { title: '数据处理与模型实验', tools: 'Python / pandas / PyTorch / CUDA', text: '做过数据集整理、训练与验证脚本、模型适配和实验记录，正在补齐从实验到应用的完整过程。' },
  { title: '应用开发与可视化', tools: 'Django / Vue / ECharts / SQL', text: '在商品分析项目中接触前后端分离、HTTP API、统计分析和图表展示，持续提高独立实现与工程组织能力。' },
  { title: '部署与开发工具', tools: 'Git / Actions / Docker / Nginx / Linux', text: '有个人站点和开源应用上线、HTTPS 配置、容器更新与网络故障排查实践，让项目能被实际访问。' },
];
