---
title: 淘宝店铺信息分析系统
shortTitle: 让商品数据变得可理解。
summary: 围绕已有商品 CSV 数据，连接清洗、统计分析、Django API 与 Vue/ECharts 可视化展示。
category: data
categoryLabel: 数据处理实践
status: practice
statusLabel: 已有代码实现
role: 商品数据处理、统计分析与前后端实践
period: 课程与项目实践
tags: [Python, pandas, Django, Vue 2, ECharts]
order: 3
featured: true
icon: chart-bar
cover: none
links:
  - label: 查看代码仓库
    url: https://github.com/YYYYYYYYXL/taobao-shop-info-analysis
updated: '2026-10-26'
---

## 项目背景

淘宝店铺信息分析系统是围绕已有商品 CSV 数据开展的数据处理与可视化项目。它将原始商品字段转换成可分析的数据，并通过网页展示分类、地区、店铺和商品属性等维度的信息。

项目已有 Django 后端、pandas 清洗与分析代码，以及 Vue 2、Element UI 和 ECharts 前端页面。这里展示的是数据处理与应用实践，不将它描述为自建电商平台或在线实时采集系统。

## 我实际负责的工作

围绕商品分析项目开展数据清洗、统计分析和前后端应用实践。当前可在仓库中查阅以下实现：

- 中文字段映射、文本空格清理、价格数值转换和无效记录过滤。
- 将“人付款”“万人付款”等销量文本解析为数值，标准化风格、面料、版型和季节字段。
- 按分类、地区和店铺统计销量，按商品属性统计平均价格。
- 通过 Django JSON API 提供分析结果和指定维度的商品排行。
- 用 Vue 页面调用接口，使用 ECharts 展示图表与商品明细。

这些内容说明项目的实际代码范围，不据此夸大为从零独立研发所有模块。

## 技术实现

### 数据流程

原始 CSV 经过字段校验与清洗，生成清洗后的 CSV。分析函数读取清洗结果并完成分组统计；HTTP API 将结果转换为 JSON，前端再渲染图表和列表。

### 前后端分工

后端使用 Python、Django 和 pandas。前端使用 Vue 2、Vue Router、Axios、Element UI 与 ECharts，通过 API 获取数据，并提供分类、地区、店铺和属性分析页面。

## 已有成果

仓库包含独立的清洗流程、统计分析函数、只读分析接口，以及多个分析与商品详情页面。代码入口和处理链路可以通过仓库查阅。

本页不展示未经整理的数据规模、业务增长或分析结论。真实运行截图和经核对的分析结果尚待补充，不使用概念配图冒充系统界面。

## 当前状态与下一步

**已有代码实现。** 后续适合补充数据来源说明、运行截图、代表性分析过程与更完整的使用文档。目前没有在此提供公开在线演示。

## 相关材料

源代码位于 `taobao-shop-info-analysis` 仓库。本页内容依据 README、数据清洗代码、Django API 及前端页面整理。
