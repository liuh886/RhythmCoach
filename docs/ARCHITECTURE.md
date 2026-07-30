# 节奏教练 (RhythmCoach) - 架构设计文档

## 1. 系统架构概述

按照《开发交接文档》，应用采用多模块化 (Multi-module) 架构，以便将复杂的悬浮窗逻辑、音频分析和主界面进行解耦。

### 模块划分
* **app**: 宿主模块，包含主应用界面 (首页、稿件管理、练习记录复盘、悬浮窗配置)，主要使用 Jetpack Compose 构建 UI。
* **feature:floating**: 悬浮窗模块。包含悬浮节奏挂件和悬浮提词器的实现。依赖于 `SYSTEM_ALERT_WINDOW` 权限，与前台服务 (Foreground Service) 结合，保证在跨 App 场景下的生命周期。
* **feature:audio**: 本地音频分析模块。封装 `AudioRecord`、纯本地 VAD(Voice Activity Detection)、节奏(CPM)估算及音频数据流式处理。
* **core:ui**: 公共 UI 组件库，如通用的按钮、对话框、图表组件 (用于绘制实时节奏曲线)。
* **core:data**: 数据层模块。包含基于 Room 的本地数据库，用于存储稿件、练习统计数据等，同时包含 DataStore 存储用户设置 (字号、透明度、目标节奏等)。

## 2. 核心技术栈
* **语言**: Kotlin (100%)
* **UI**: Jetpack Compose
* **异步与并发**: Kotlin Coroutines & Flow (用于在 UI 和 AudioAnalyzer 之间实时传递节奏数据及 VAD 状态)
* **本地存储**: Room (数据库), DataStore (偏好设置)
* **依赖注入**: Hilt
* **架构模式**: MVVM (Model-View-ViewModel) / MVI (针对复杂状态的 Compose 页面)

## 3. 关键组件设计

### 3.1 悬浮窗与前台服务
* `RhythmOverlayService` (Foreground Service): 作为悬浮窗生命周期的宿主，启动时展示在通知栏，防止被系统杀后台。
* 利用 `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY` 添加 View，实现挂件和提词器。
* 注意适配 HyperOS 及国内 Android 定制 ROM 的权限校验与电量优化豁免引导。

### 3.2 音频采集与 VAD
* `AudioRecord` 单声道、16kHz、16-bit PCM 采样。
* 滑动窗口进行能量计算或简单的零交叉率 (ZCR) 结合阈值判断是否处于静音/讲话状态。
* 通过 Kotlin Flow 暴露 `VoiceState` (SPEAKING, SILENCE_SHORT, SILENCE_LONG) 给上层提词器，实现“停顿暂停、讲话恢复”的自动滚屏逻辑。

### 3.3 节奏与 CPM 估算
* 在没有 ASR (语音识别) 的 V1 阶段，使用发声时长比例、能量峰值等特征，结合固定公式估算用户的 CPM。
* 维持最近 30 秒的数据队列，用于在悬浮挂件中渲染微型折线图。

## 4. 推荐开发路径 (V1)
1. **基础设施 & 本地存储**: 搭建主工程结构，完成稿件的增删改查。
2. **悬浮窗基础**: 实现 `SYSTEM_ALERT_WINDOW` 权限请求，搭建 `RhythmOverlayService`，显示测试挂件并实现拖拽与记忆。
3. **音频引擎**: 实现麦克风权限请求，搭建 `AudioRecord` 循环，实现基础 VAD 和 `VoiceState` 的 Flow 分发。
4. **提词器核心联动**: 结合 ViewModel 与 Flow，使提词器的滚动速度受 VAD 状态控制。
5. **UI 打磨与数据复盘**: 完善 Compose 主页面，开发练习结束后的统计图表。
