
# Mate Human

A web-based real-time interactive digital human frontend built on Live2D Cubism 5 and the Fay digital human framework.

## Overview

Mate Human is a Live2D digital human frontend that connects to the [Fay digital human framework](https://gitee.com/xszyou/fay) via WebSocket, providing audio playback, lip sync, expression switching, and motion driving. Fay handles conversation, speech synthesis, and sentiment analysis; this project handles only frontend rendering and interaction.

## Demo

![Demo](images/效果展示.png)

## Architecture

```
┌──────────────┐    WebSocket     ┌──────────────┐
│  Fay Backend  │ ──────────────→ │ Live2D Front  │
│              │  ws://10002     │  (this repo)  │
│ - LLM Chat   │                 │ - Audio Play  │
│ - TTS Voice  │  audio/actions  │ - Lip Sync    │
│ - Sentiment  │ ←─────────────→ │ - Expressions │
│ - Actions    │                 │ - Motions     │
└──────────────┘                 └──────────────┘
```

## Tech Stack

- **Live2D Cubism SDK Web 5-r.4** - 2D digital human rendering engine
- **TypeScript + Vite** - Frontend build toolchain
- **WebSocket** - Real-time communication with Fay backend
- **OVR LipSync** - Viseme-based lip synchronization

## Core Features

- **Audio Playback** - Queued playback of Fay TTS audio with streaming multi-segment support
- **Lip Sync** - Mouth parameter driven by Fay's Lips viseme data
- **Action Semantics** - Maps Fay's Action fields (behavior/affect/intensity) to model motions and expressions
- **Sentiment Driven** - Fallback expression/motion driving based on Sentiment values
- **Desk Mode** - One-click toggle for reception desk scene
- **Auto Reconnect** - Exponential backoff reconnection (up to 5 attempts)

## Directory Structure

```
mate-human/
├── CubismSdkForWeb-5-r.4/          # Live2D Cubism Web SDK
│   ├── Core/                        # Core rendering library
│   ├── Framework/                   # Framework components
│   └── Samples/
│       ├── Resources/Haru/          # Haru model assets
│       └── TypeScript/Demo/         # Frontend project (main dev directory)
│           └── src/
│               ├── main.ts                  # Entry point
│               ├── fayclient.ts             # Fay WebSocket client
│               ├── lappmodel.ts             # Model (audio/motion integration)
│               ├── lipsync.ts               # Lip sync engine
│               ├── lappview.ts              # View & desk mode
│               ├── lappdefine.ts            # Constants
│               ├── live2d-action-adapter.ts # Action semantic adapter
│               └── live2d-action-map.ts     # Haru model action mappings
├── docs/                            # Live2D model creation docs
└── tools/                           # Testing utilities
```

## Quick Start

### Prerequisites

- Node.js 18+
- Modern browser (WebGL 2.0 support)
- Fay digital human framework (deployed separately, see below)

### 1. Start Fay Backend

Fay is a separate backend project that must be cloned and started independently:

```bash
# Clone Fay
git clone https://gitee.com/xszyou/fay.git
cd fay

# Configure (create system.conf from backup if missing)
cp system.conf.bak system.conf
# Edit system.conf with your LLM endpoint and API key

# Install dependencies (Python 3.12 recommended)
pip install -r requirements.txt

# Start
python main.py
```

After starting, Fay opens a WebSocket service on **port 10002** and launches a web control panel. Configure TTS and LLM in the control panel.

### 2. Start Live2D Frontend

```bash
# Clone this project
git clone https://gitee.com/garveyer/mate-human.git
cd mate-human/CubismSdkForWeb-5-r.4/Samples/TypeScript/Demo

# Install dependencies
npm install

# Start dev server
npm start
```

Open **http://localhost:5173** in your browser to see the Live2D character. The frontend automatically connects to Fay's WebSocket service.

## Fay Interface Integration

| Interface | Description | Source File |
|-----------|-------------|-------------|
| WebSocket `ws://127.0.0.1:10002` | Receives audio, lip data, and action commands | `fayclient.ts` |
| HTTP Audio | Downloads TTS audio via `Data.HttpValue` | `lappmodel.ts` |
| Action Protocol | `Data.Action` (behavior/affect/intensity) + `Data.Sentiment` | `live2d-action-adapter.ts` |

### Fay Message Structure

```json
{
  "Topic": "human",
  "Data": {
    "Key": "audio",
    "Text": "This way please",
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

## Changing Models

To use your own Live2D model, follow these three steps:

1. Place model files in `Samples/Resources/YourModelName/`
2. Update `ModelDir` in `src/lappdefine.ts` to point to the new model name
3. Update motion and expression mappings in `src/live2d-action-map.ts`

## Links

- **This Project**: https://gitee.com/garveyer/mate-human
- **Fay Digital Human Framework**: https://gitee.com/xszyou/fay
- **Live2D Official**: https://www.live2d.com/

## License

- **Live2D Cubism SDK**: [Live2D Open Software License](./CubismSdkForWeb-5-r.4/LICENSE.md)

## Contributing

Issues and pull requests are welcome!
