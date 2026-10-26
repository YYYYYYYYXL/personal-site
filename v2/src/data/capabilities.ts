import server from '../assets/capability-server.svg';
import linux from '../assets/capability-linux.svg';
import network from '../assets/capability-network.svg';

export const capabilities = [
  {
    title: '服务器部署',
    description: '配置域名、Nginx 与 HTTPS，使用 Docker Compose 部署应用，维护自动更新与备份流程。',
    tags: ['Docker', 'Nginx', 'GitHub Actions'],
    image: server,
    alt: '服务器机架、部署终端与安全访问的概念插画',
  },
  {
    title: 'Linux',
    description: '使用 SSH 管理 Linux 服务器，处理文件与权限、服务与进程，并通过日志排查运行问题。',
    tags: ['Ubuntu', 'SSH', 'Shell'],
    image: linux,
    alt: 'Linux 终端窗口与企鹅轮廓的概念插画',
  },
  {
    title: '计算机网络',
    description: '理解 DNS、TCP/IP 与 HTTP/HTTPS 访问链路，结合抓包工具学习协议、定位网络连接问题。',
    tags: ['TCP/IP', 'Wireshark', 'tcpdump'],
    image: network,
    alt: '终端、服务器与网络连接组成的拓扑概念插画',
  },
];
