/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
import * as LAppDefine from './lappdefine';

/**
 * ブラウザロード後の処理
 */
window.addEventListener(
  'load',
  (): void => {
    // Initialize WebGL and create the application instance
    if (!LAppDelegate.getInstance().initialize()) {
      return;
    }

    LAppDelegate.getInstance().run();

    // ===== UI State Bindings =====
    const connStatusEl = document.getElementById('conn-status');
    const speakIndicatorEl = document.getElementById('speak-indicator');
    const speechBubbleEl = document.getElementById('speech-bubble');
    const deskToggleBtn = document.getElementById('desk-toggle') as HTMLButtonElement;
    const unlockAudioBtn = document.getElementById('unlock-audio') as HTMLButtonElement;

    let prevSpeaking = false;
    let prevText = '';

    function updateUI(): void {
      const delegate = LAppDelegate.getInstance().getSubdelegates().at(0);
      if (!delegate) return;

      const live2dMgr = delegate.getLive2DManager();
      if (!live2dMgr) return;

      // Access the first model
      const models = (live2dMgr as any)._models;
      if (!models || models.getSize() === 0) return;

      const model = models.at(0);
      if (!model) return;

      // --- Connection status ---
      const fayConnected = model._fayClient?.isConnected?.();
      if (connStatusEl) {
        if (fayConnected) {
          connStatusEl.className = 'connected';
          connStatusEl.innerHTML = '<span class="status-dot"></span>已连接';
        } else {
          connStatusEl.className = '';
          connStatusEl.innerHTML = '<span class="status-dot"></span>未连接';
        }
      }

      // --- Speaking indicator ---
      const speaking = !!model._fayAudioPlaying;
      if (speakIndicatorEl) {
        speakIndicatorEl.className = speaking ? 'active' : '';
      }

      // --- Speech bubble ---
      const text = model._currentDisplayText || '';
      if (speechBubbleEl) {
        if (text && text !== prevText) {
          speechBubbleEl.textContent = text;
          speechBubbleEl.classList.add('visible');
        } else if (!text) {
          speechBubbleEl.classList.remove('visible');
        }
      }
      prevText = text;

      // --- Desk toggle button state (from view) ---
      const view = delegate.getView();
      if (deskToggleBtn && view) {
        const deskEnabled = view.isDeskEnabled();
        if (deskEnabled) {
          deskToggleBtn.classList.add('active');
          deskToggleBtn.innerHTML = '<span class="icon">✓</span> 吧台开启';
        } else {
          deskToggleBtn.classList.remove('active');
          deskToggleBtn.innerHTML = '<span class="icon">🪑</span> 吧台模式';
        }
      }

      // --- Unlock audio button state ---
      if (unlockAudioBtn) {
        if (model._fayAudioBlockedByAutoplay) {
          unlockAudioBtn.style.display = '';
          unlockAudioBtn.innerHTML = '<span class="icon">🔊</span> 开启声音';
          unlockAudioBtn.classList.add('active');
        } else if (model._audioMuted) {
          unlockAudioBtn.style.display = '';
          unlockAudioBtn.innerHTML = '<span class="icon">🔇</span> 声音已关闭';
          unlockAudioBtn.classList.remove('active');
        } else if (model._fayClient?.isConnected?.()) {
          unlockAudioBtn.style.display = '';
          unlockAudioBtn.innerHTML = '<span class="icon">🔊</span> 声音已开启';
          unlockAudioBtn.classList.remove('active');
        } else {
          unlockAudioBtn.style.display = 'none';
        }
      }
    }

    // Poll UI state every 200ms
    setInterval(updateUI, 200);

    // 吧台切换按钮
    if (deskToggleBtn) {
      deskToggleBtn.addEventListener('click', () => {
        const delegate = LAppDelegate.getInstance().getSubdelegates().at(0);
        if (delegate) {
          const view = delegate.getView();
          if (view) {
            view.toggleDesk();
          }
        }
      });
      console.log('[Main] ✓ 吧台切换按钮已初始化');
    }

    // 声音开关按钮
    if (unlockAudioBtn) {
      unlockAudioBtn.addEventListener('click', () => {
        const delegate = LAppDelegate.getInstance().getSubdelegates().at(0);
        if (delegate) {
          const live2dMgr = delegate.getLive2DManager();
          const models = (live2dMgr as any)._models;
          if (models && models.getSize() > 0) {
            const model = models.at(0);
            if (model?.toggleMute) {
              model.toggleMute();
            }
          }
        }
      });
      console.log('[Main] ✓ 声音开关按钮已初始化');
    }
  },
  { passive: true }
);

/**
 * 終了時の処理
 */
window.addEventListener(
  'beforeunload',
  (): void => LAppDelegate.releaseInstance(),
  { passive: true }
);

/**
 * pagehide 兜底：确保刷新/关闭时 WebSocket 被关闭
 * beforeunload 中异步 close 可能来不及发出关闭帧，pagehide 提供第二次机会
 */
window.addEventListener(
  'pagehide',
  (): void => LAppDelegate.releaseInstance(),
  { passive: true }
);
