import research from '../assets/image-research.png';
import deployment from '../assets/project-deployment.svg';
import data from '../assets/project-data.svg';
import studio from '../assets/night-studio.png';

export const projectCovers = {
  'image-denoising': { image: research, alt: '图像与光学薄片的研究主题插画，非真实去噪实验结果' },
  'magic-resume': { image: deployment, alt: '从代码、镜像构建、服务器部署到上线的 CI/CD 流程示意图' },
  'product-analysis': { image: data, alt: 'CSV 数据、处理与浏览的流程概念图，非系统截图或真实统计结果' },
  'personal-site': { image: studio, alt: '个人网站使用的深夜编程工作室主题插画，非真实工作环境' },
} as const;
