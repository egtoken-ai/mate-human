/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix';

import * as LAppDefine from './lappdefine';
import { LAppDelegate } from './lappdelegate';
import { LAppPal } from './lapppal';
import { LAppSprite } from './lappsprite';
import { TextureInfo } from './lapptexturemanager';
import { TouchManager } from './touchmanager';
import { LAppSubdelegate } from './lappsubdelegate';

/**
 * 描画クラス。
 */
export class LAppView {
  /**
   * コンストラクタ
   */
  public constructor() {
    this._programId = null;
    this._back = null;
    this._gear = null;
    this._desk = null;  // ✅ 前景吧台
    this._deskEnabled = false;  // ✅ 吧台是否显示
    this._modelYOffset = 0.0;  // ✅ 模型Y轴偏移量

    // タッチ関係のイベント管理
    this._touchManager = new TouchManager();

    // デバイス座標からスクリーン座標に変換するための
    this._deviceToScreen = new CubismMatrix44();

    // 画面の表示の拡大縮小や移動の変換を行う行列
    this._viewMatrix = new CubismViewMatrix();

    // ✅ 保存初始矩阵参数（用于复位）
    this._initialViewMatrix = new CubismViewMatrix();
  }

  /**
   * 初期化する。
   */
  public initialize(subdelegate: LAppSubdelegate): void {
    this._subdelegate = subdelegate;
    const { width, height } = subdelegate.getCanvas();

    const ratio: number = width / height;
    const left: number = -ratio;
    const right: number = ratio;
    const bottom: number = LAppDefine.ViewLogicalLeft;
    const top: number = LAppDefine.ViewLogicalRight;

    this._viewMatrix.setScreenRect(left, right, bottom, top); // デバイスに対応する画面の範囲。 Xの左端、Xの右端、Yの下端、Yの上端
    this._viewMatrix.scale(LAppDefine.ViewScale, LAppDefine.ViewScale);

    this._deviceToScreen.loadIdentity();
    if (width > height) {
      const screenW: number = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
    } else {
      const screenH: number = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
    }
    this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);

    // 表示範囲の設定
    this._viewMatrix.setMaxScale(LAppDefine.ViewMaxScale); // 限界拡張率
    this._viewMatrix.setMinScale(LAppDefine.ViewMinScale); // 限界縮小率

    // 表示できる最大範囲
    this._viewMatrix.setMaxScreenRect(
      LAppDefine.ViewLogicalMaxLeft,
      LAppDefine.ViewLogicalMaxRight,
      LAppDefine.ViewLogicalMaxBottom,
      LAppDefine.ViewLogicalMaxTop
    );

    // ✅ 保存初始矩阵状态（用于吧台模式关闭时恢复）
    this._initialViewMatrix.setScreenRect(left, right, bottom, top);
    this._initialViewMatrix.scale(LAppDefine.ViewScale, LAppDefine.ViewScale);
    this._initialViewMatrix.setMaxScale(LAppDefine.ViewMaxScale);
    this._initialViewMatrix.setMinScale(LAppDefine.ViewMinScale);
    this._initialViewMatrix.setMaxScreenRect(
      LAppDefine.ViewLogicalMaxLeft,
      LAppDefine.ViewLogicalMaxRight,
      LAppDefine.ViewLogicalMaxBottom,
      LAppDefine.ViewLogicalMaxTop
    );
  }

  /**
   * 解放する
   */
  public release(): void {
    this._viewMatrix = null;
    this._touchManager = null;
    this._deviceToScreen = null;

    this._gear.release();
    this._gear = null;

    this._back.release();
    this._back = null;

    // ✅ 释放吧台资源
    if (this._desk) {
      this._desk.release();
      this._desk = null;
    }

    this._subdelegate.getGlManager().getGl().deleteProgram(this._programId);
    this._programId = null;
  }

  /**
   * 描画する。
   */
  public render(): void {
    this._subdelegate.getGlManager().getGl().useProgram(this._programId);

    if (this._back) {
      this._back.render(this._programId);
    }
    if (this._gear) {
      this._gear.render(this._programId);
    }

    this._subdelegate.getGlManager().getGl().flush();

    const lapplive2dmanager = this._subdelegate.getLive2DManager();
    if (lapplive2dmanager != null) {
      // ✅ 应用模型Y轴偏移（只在有偏移时才translate）
      if (this._modelYOffset !== 0.0) {
        this._viewMatrix.translate(0.0, this._modelYOffset);
      }

      lapplive2dmanager.setViewMatrix(this._viewMatrix);
      lapplive2dmanager.onUpdate();
    }

    // ✅ 渲染前景吧台（在模型之后，遮住腿部）
    if (this._deskEnabled && this._desk) {
      // 禁用深度测试，确保吧台覆盖在模型上
      const gl = this._subdelegate.getGlManager().getGl();
      gl.disable(gl.DEPTH_TEST);
      this._desk.render(this._programId);
      gl.enable(gl.DEPTH_TEST);
    }
  }

  /**
   * 画像の初期化を行う。
   */
  public initializeSprite(): void {
    const width: number = this._subdelegate.getCanvas().width;
    const height: number = this._subdelegate.getCanvas().height;
    const textureManager = this._subdelegate.getTextureManager();
    const resourcesPath = LAppDefine.ResourcesPath;

    let imageName = '';

    // 背景画像初期化
    imageName = LAppDefine.BackImageName;

    // 非同期なのでコールバック関数を作成
    const initBackGroundTexture = (textureInfo: TextureInfo): void => {
      // 画像全体を表示する: 幅と高さの両方がキャンバスに収まるようスケール
      const imgRatio = textureInfo.width / textureInfo.height;

      // 幅基準と高さ基準の2通りを計算し、小さい方を採用（contain）
      const scaleW = width / textureInfo.width;
      const scaleH = height / textureInfo.height;
      const scale = Math.min(scaleW, scaleH);

      const fwidth = textureInfo.width * scale;
      const fheight = textureInfo.height * scale;

      // 中央に配置
      const x: number = width * 0.5;
      const y: number = height * 0.5;

      this._back = new LAppSprite(x, y, fwidth, fheight, textureInfo.id);
      this._back.setSubdelegate(this._subdelegate);
    };

    textureManager.createTextureFromPngFile(
      resourcesPath + imageName,
      false,
      initBackGroundTexture
    );

    // 歯車画像初期化
    imageName = LAppDefine.GearImageName;
    const initGearTexture = (textureInfo: TextureInfo): void => {
      const x = width - textureInfo.width * 0.5;
      const y = height - textureInfo.height * 0.5;
      const fwidth = textureInfo.width;
      const fheight = textureInfo.height;
      this._gear = new LAppSprite(x, y, fwidth, fheight, textureInfo.id);
      this._gear.setSubdelegate(this._subdelegate);
    };

    textureManager.createTextureFromPngFile(
      resourcesPath + imageName,
      false,
      initGearTexture
    );

    // ✅ 前景吧台画像初期化
    imageName = LAppDefine.DeskImageName;
    const initDeskTexture = (textureInfo: TextureInfo): void => {
      // 使用固定尺寸（不随屏幕变化）
      const imgRatio = textureInfo.width / textureInfo.height;
      const displayWidth = 900;  // 固定宽度
      const displayHeight = (displayWidth / imgRatio) * 1.5;  // 高度按比例计算后拉高1.5倍

      // 吧台放在底部中间（往下移动100像素）
      const x = width * 0.5;
      const y = displayHeight * 0.5 - 100;  // 底部贴着屏幕底，再往下移100像素

      this._desk = new LAppSprite(x, y, displayWidth, displayHeight, textureInfo.id);
      this._desk.setSubdelegate(this._subdelegate);
    };

    textureManager.createTextureFromPngFile(
      resourcesPath + imageName,
      false,
      initDeskTexture
    );

    // シェーダーを作成
    if (this._programId == null) {
      this._programId = this._subdelegate.createShader();
    }
  }

  /**
   * タッチされた時に呼ばれる。
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesBegan(pointX: number, pointY: number): void {
    this._touchManager.touchesBegan(
      pointX * window.devicePixelRatio,
      pointY * window.devicePixelRatio
    );
  }

  /**
   * タッチしているときにポインタが動いたら呼ばれる。
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesMoved(pointX: number, pointY: number): void {
    const posX = pointX * window.devicePixelRatio;
    const posY = pointY * window.devicePixelRatio;

    const lapplive2dmanager = this._subdelegate.getLive2DManager();

    const viewX: number = this.transformViewX(this._touchManager.getX());
    const viewY: number = this.transformViewY(this._touchManager.getY());

    this._touchManager.touchesMoved(posX, posY);

    lapplive2dmanager.onDrag(viewX, viewY);
  }

  /**
   * タッチが終了したら呼ばれる。
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesEnded(pointX: number, pointY: number): void {
    const posX = pointX * window.devicePixelRatio;
    const posY = pointY * window.devicePixelRatio;

    const lapplive2dmanager = this._subdelegate.getLive2DManager();

    // タッチ終了
    lapplive2dmanager.onDrag(0.0, 0.0);

    // シングルタップ
    const x: number = this.transformViewX(posX);
    const y: number = this.transformViewY(posY);

    if (LAppDefine.DebugTouchLogEnable) {
      LAppPal.printMessage(`[APP]touchesEnded x: ${x} y: ${y}`);
    }
    lapplive2dmanager.onTap(x, y);

    // 歯車にタップしたか
    if (this._gear.isHit(posX, posY)) {
      lapplive2dmanager.nextScene();
    }
  }

  /**
   * X座標をView座標に変換する。
   *
   * @param deviceX デバイスX座標
   */
  public transformViewX(deviceX: number): number {
    const screenX: number = this._deviceToScreen.transformX(deviceX); // 論理座標変換した座標を取得。
    return this._viewMatrix.invertTransformX(screenX); // 拡大、縮小、移動後の値。
  }

  /**
   * Y座標をView座標に変換する。
   *
   * @param deviceY デバイスY座標
   */
  public transformViewY(deviceY: number): number {
    const screenY: number = this._deviceToScreen.transformY(deviceY); // 論理座標変換した座標を取得。
    return this._viewMatrix.invertTransformY(screenY);
  }

  /**
   * X座標をScreen座標に変換する。
   * @param deviceX デバイスX座標
   */
  public transformScreenX(deviceX: number): number {
    return this._deviceToScreen.transformX(deviceX);
  }

  /**
   * Y座標をScreen座標に変換する。
   *
   * @param deviceY デバイスY座標
   */
  public transformScreenY(deviceY: number): number {
    return this._deviceToScreen.transformY(deviceY);
  }

  /**
   * ✅ 切换吧台显示状态
   */
  public toggleDesk(): void {
    this._deskEnabled = !this._deskEnabled;

    if (this._deskEnabled) {
      // 启用吧台：数字人向下移动
      this._modelYOffset = -0.3;  // 向下移动0.3单位
      console.log('[LAppView] ✓ 吧台已启用，数字人下移');
    } else {
      // 取消吧台：数字人回到正常位置（比启用时高一点）
      this._modelYOffset = -0.05;  // 比启用时高0.25
      console.log('[LAppView] ✗ 吧台已禁用，数字人回到正常位置');
    }
  }

  /**
   * ✅ 检查吧台是否启用
   */
  public isDeskEnabled(): boolean {
    return this._deskEnabled;
  }

  _touchManager: TouchManager; // タッチマネージャー
  _deviceToScreen: CubismMatrix44; // デバイスからスクリーンへの行列
  _viewMatrix: CubismViewMatrix; // viewMatrix
  _programId: WebGLProgram; // シェーダID
  _back: LAppSprite; // 背景画像
  _gear: LAppSprite; // ギア画像
  _desk: LAppSprite; // ✅ 前景吧台
  _deskEnabled: boolean; // ✅ 吧台是否启用
  _modelYOffset: number; // ✅ 模型Y轴偏移
  _initialViewMatrix: CubismViewMatrix; // ✅ 初始矩阵状态（用于复位）
  _changeModel: boolean; // モデル切り替えフラグ
  _isClick: boolean; // クリック中
  private _subdelegate: LAppSubdelegate;
}
