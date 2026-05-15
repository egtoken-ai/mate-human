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

    // ✅ 添加吧台切换按钮事件监听
    const deskToggleBtn = document.getElementById('desk-toggle') as HTMLButtonElement;
    if (deskToggleBtn) {
      deskToggleBtn.addEventListener('click', () => {
        // 获取第一个 delegate 的 view
        const delegate = LAppDelegate.getInstance().getSubdelegates().at(0);
        if (delegate) {
          const view = delegate.getView();
          if (view) {
            view.toggleDesk();

            // 更新按钮样式和文本
            if (view.isDeskEnabled()) {
              deskToggleBtn.classList.add('active');
              deskToggleBtn.textContent = '✓ 吧台开启';
            } else {
              deskToggleBtn.classList.remove('active');
              deskToggleBtn.textContent = '🪑 吧台模式';
            }
          }
        }
      });
      console.log('[Main] ✓ 吧台切换按钮已初始化');
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
