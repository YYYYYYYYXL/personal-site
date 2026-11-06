---
title: 基于深度学习的图像去噪系统
shortTitle: 探索图像背后的清晰。
summary: 围绕合成噪声与真实噪声，完成了从数据处理、模型训练和实验评价到系统实现的图像去噪毕业设计。系统已上线，可在线体验。
category: research
categoryLabel: 毕业设计
status: completed
statusLabel: 已完成
role: 数据处理、模型训练、实验评价与系统部署
period: '2026'
tags: [Python, PyTorch, CUDA]
order: 1
featured: true
icon: aperture
cover: research
links:
  - label: 在线体验
    url: https://denoise.yuxinlei.cloud/
  - label: GitHub 仓库
    url: https://github.com/YYYYYYYYXL/graduation-design
updated: '2026-11-06'
---

## 项目背景

这是我的本科毕业设计《基于深度学习的图像去噪系统设计与实现》。我希望把数据处理、去噪方法、实验评价与系统界面连接起来，理解不同方法面对合成噪声和真实噪声时的表现。

课题同时关注传统方法和深度学习方法。BM3D 是无需训练的对比基线；DnCNN、P2N 和 Restormer 则分别涉及卷积网络、自监督适应和 Transformer 图像复原。

## 我实际负责的工作

- 整理 DIV2K 与 SIDD Medium sRGB 数据，处理图像裁剪、NOISY/GT 配对检查、数据划分与记录。
- 编写和调整训练、验证、评估相关代码，保存模型 checkpoint、训练日志和实验记录。
- 适配不同去噪方法，区分普通推理与 P2N 单张图像适应过程。
- 设计统一的实验评价方式，完成去噪系统的实现与上线部署。

网络架构与研究方法有明确来源；使用和适配公开方法，不等于原创提出这些算法。

## 技术实现

### 数据与噪声

DIV2K 用于合成高斯噪声实验，SIDD Medium sRGB 用于真实噪声实验。数据处理保留配对关系与划分记录，避免训练、验证和测试用途混淆。

### 方法与实验

| 方法 | 在课题中的用途 |
| --- | --- |
| BM3D | 无需训练的传统去噪基线 |
| DnCNN | 卷积网络训练与去噪推理 |
| P2N | 从预训练模型出发，对单张图像进行无 GT 的自监督适应 |
| Restormer | 适配官方图像复原网络和训练流程 |

评价关注 PSNR、SSIM 与耗时。只有存在对应 Ground Truth 的实验图像，才计算有参考的 PSNR/SSIM；单张图像适应时间与直接推理时间分别记录。

## 已有成果

完成了数据处理、模型训练与验证，并保留了模型权重、日志和实验记录。图像去噪系统已实现并上线，可以通过页首的「在线体验」按钮访问。

页首配图为主题插画。实际去噪效果可在在线系统中查看。

## 当前状态

**已完成并上线。**

## 相关材料

页首提供「在线体验」和「GitHub 仓库」两个入口，分别打开去噪系统和项目仓库。
