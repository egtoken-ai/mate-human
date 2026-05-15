
# Mate Human

基于 Live2D Cubism 5 与 Fay 数字人框架的 Web 实时互动数字人前端工程。

## 项目简介

Mate Human 是一个 Live2D 数字人前端工程，通过 WebSocket 连接 [Fay 数字人框架](https://gitee.com/xszyou/fay)，实现语音播放、口型同步、表情切换和动作驱动。Fay 负责对话、语音合成和情感分析，本工程只负责前端渲染和交互。

## 效果展示

![效果展示](images/效果展示.png)

## 架构

```
┌──────────────┐    WebSocket     ┌──────────────┐
│   Fay 后端    │ ──────────────→ │  Live2D 前端  │
│              │  ws://10002     │  (本工程)     │
│ - LLM 对话   │                 │ - 语音播放    │
│ - TTS 语音   │   音频/动作指令  │ - 口型同步    │
│ - 情感分析   │ ←─────────────→ │ - 表情切换    │
│ - 动作语义   │                 │ - 动作驱动    │
└──────────────┘                 └──────────────┘
```

## 技术栈

- **Live2D Cubism SDK Web 5-r.4** - 2D 数字人渲染引擎
- **TypeScript + Vite** - 前端构建
- **WebSocket** - 与 Fay 后端实时通信
- **OVR LipSync** - 口型同步（基于音素驱动）

## 核心功能

- **语音播放** - 接收 Fay TTS 音频并队列播放，支持流式多片段
- **口型同步** - 基于 Fay 输出的 Lips 音素数据驱动嘴型参数
- **动作语义** - 接收 Fay 的 Action 字段（behavior/affect/intensity），映射到模型动作和表情
- **情感驱动** - 基于 Sentiment 情感值回退驱动表情和动作
- **吧台模式** - 一键切换前台接待场景
- **自动重连** - WebSocket 断线后自动重连（指数退避，最多 5 次）

## 目录结构

```
mate-human/
├── CubismSdkForWeb-5-r.4/          # Live2D Cubism Web SDK
│   ├── Core/                        # 核心渲染库
│   ├── Framework/                   # 框架组件
│   └── Samples/
│       ├── Resources/Haru/          # Haru 模型资源
│       └── TypeScript/Demo/         # 前端工程（主要开发目录）
│           └── src/
│               ├── main.ts                  # 入口
│               ├── fayclient.ts             # Fay WebSocket 客户端
│               ├── lappmodel.ts             # 模型（含音频播放/动作驱动）
│               ├── lipsync.ts               # 口型同步引擎
│               ├── lappview.ts              # 视图与吧台模式
│               ├── lappdefine.ts            # 常量定义
│               ├── live2d-action-adapter.ts # 动作语义适配器
│               └── live2d-action-map.ts     # Haru 模型动作映射表
├── docs/                            # Live2D 模型制作文档
├── live2d工程文件/                    # Live2D Editor 工程源文件
└── tools/                           # 测试工具
```

## 快速开始

### 环境要求

- Node.js 18+
- 现代浏览器（支持 WebGL 2.0）
- Fay 数字人框架（独立部署，详见下方）

### 1. 启动 Fay 后端

Fay 是独立的后端项目，需要单独克隆和启动：

```bash
# 克隆 Fay
git clone https://gitee.com/xszyou/fay.git
cd fay

# 配置（如果没有 system.conf，从备份创建）
cp system.conf.bak system.conf
# 编辑 system.conf，配置 LLM 地址和 API Key

# 安装依赖（建议 Python 3.12）
pip install -r requirements.txt

# 启动
python main.py
```

启动后 Fay 会在 **10002 端口**开启 WebSocket 服务，并自动打开 Web 控制面板。在控制面板中配置 TTS 和 LLM。

### 2. 启动 Live2D 前端

```bash
# 克隆本项目
git clone https://gitee.com/garveyer/mate-human.git
cd mate-human/CubismSdkForWeb-5-r.4/Samples/TypeScript/Demo

# 安装依赖
npm install

# 启动开发服务器
npm start
```

浏览器打开 **http://localhost:5173** 即可看到 Live2D 角色。前端会自动连接 Fay 的 WebSocket 服务。

## 对接的 Fay 接口

| 接口 | 说明 | 对应文件 |
|------|------|---------|
| WebSocket `ws://127.0.0.1:10002` | 接收音频消息、口型数据、动作指令 | `fayclient.ts` |
| HTTP 音频下载 | 通过 `Data.HttpValue` 获取 TTS 音频文件 | `lappmodel.ts` |
| 动作语义协议 | `Data.Action`（behavior/affect/intensity）+ `Data.Sentiment` | `live2d-action-adapter.ts` |

### Fay 消息结构

```json
{
  "Topic": "human",
  "Data": {
    "Key": "audio",
    "Text": "这边请",
    "HttpValue": "http://127.0.0.1:5000/audio/xxx.wav",
    "IsFirst": 1,
    "IsEnd": 0,
    "Lips": [
      { "Lip": "sil", "Time": 80 },
      { "Lip": "aa",  "Time": 120 }
    ],
    "Sentiment": 0.7,
    "Action": {
      "code": "guidance.invite",
      "behavior": "invite",
      "affect": "warm",
      "intensity": 0.74,
      "priority": 82
    }
  }
}
```

## 更换模型

如需使用自己的 Live2D 模型，只需三步：

1. 将模型文件放到 `Samples/Resources/你的模型名/` 目录
2. 修改 `src/lappdefine.ts` 中的 `ModelDir` 指向新模型名
3. 修改 `src/live2d-action-map.ts` 中的动作和表情映射表

## 相关链接

- **本项目**：https://gitee.com/garveyer/mate-human
- **Fay 数字人框架**：https://gitee.com/xszyou/fay
- **Live2D 官方**：https://www.live2d.com/

## 开源协议

- **Live2D Cubism SDK**: [Live2D Open Software License](./CubismSdkForWeb-5-r.4/LICENSE.md)

## 贡献

欢迎提交 Issue 和 Pull Request！
