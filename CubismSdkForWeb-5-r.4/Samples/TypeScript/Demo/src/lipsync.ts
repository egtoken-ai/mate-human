/**
 * 嘴型同步器（方案A简化版：基于时间戳，不下载音频）
 * Fay后端在播放时才发送嘴型数据，确保前后端同步
 */

import { LipData } from './fayclient';

// 回调函数类型：用于设置嘴型参数值
type LipSyncCallback = (value: number) => void;
type ElapsedTimeProvider = () => number | null;

export class LipSync {
    private setMouthValue: LipSyncCallback;
    private currentLipValue = 0;  // 当前嘴型值（0-1）
    private smoothingFactor = 0.3; // 平滑因子

    private currentLips: LipData[] | null = null;  // 当前嘴型序列
    private startTime: number = 0;  // 开始时间戳
    private totalDuration: number = 0;  // 总时长（毫秒）
    private elapsedTimeProvider: ElapsedTimeProvider | null = null;

    // OVR LipSync的15种viseme到嘴型开合度的映射
    private visemeMap: { [key: string]: number } = {
        'sil': 0.0,   // 静音
        'PP': 0.2,    // 双唇闭合
        'FF': 0.3,    // 下唇咬上齿
        'TH': 0.4,    // 舌尖抵上下齿
        'DD': 0.5,    // 舌尖抵上齿
        'kk': 0.6,    // 舌根抵软腭
        'CH': 0.5,    // 硬腭
        'SS': 0.4,    // 舌尖接近上齿
        'nn': 0.3,    // 舌尖抵上齿龈
        'RR': 0.4,    // 舌尖卷曲
        'aa': 0.9,    // 张嘴，低元音
        'E': 0.6,     // 微张，前元音
        'ih': 0.5,    // 半张，前高元音
        'oh': 0.7,    // 圆唇，后元音
        'ou': 0.8     // 圆唇突出，后高元音
    };

    constructor(setMouthValue: LipSyncCallback) {
        this.setMouthValue = setMouthValue;
        console.log('[LipSync] ✓ 初始化完成（使用回调函数设置嘴型值）');
    }

    /**
     * 设置平滑因子（0-1，越小越平滑）
     */
    setSmoothingFactor(factor: number): void {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }

    /**
     * 从viseme名称获取嘴型开合度
     */
    private visemeToValue(viseme: string): number {
        const value = this.visemeMap[viseme];
        return value !== undefined ? value : 0.0;
    }

    /**
     * 开始新的嘴型序列
     */
    startLipSync(lips: LipData[], elapsedTimeProvider?: ElapsedTimeProvider): void {
        if (!lips || lips.length === 0) {
            console.warn('[LipSync] 收到空的嘴型数据');
            return;
        }

        this.currentLips = lips;
        this.startTime = Date.now();
        this.elapsedTimeProvider = elapsedTimeProvider || null;

        // 计算总时长
        this.totalDuration = lips.reduce((sum, lip) => sum + lip.Time, 0);

        console.log(`[LipSync] 开始嘴型同步，共${lips.length}个viseme，总时长${this.totalDuration}ms`);
    }

    /**
     * 更新嘴型参数（在每帧渲染中调用）
     */
    update(): void {
        // 如果没有嘴型数据，重置为闭合
        if (!this.currentLips || this.currentLips.length === 0) {
            if (this.currentLipValue > 0.01) {
                this.currentLipValue = this.currentLipValue + (0 - this.currentLipValue) * this.smoothingFactor;
                this.setMouthValue(this.currentLipValue);
            }
            return;
        }

        // 计算当前播放进度（毫秒）
        const elapsed = this.elapsedTimeProvider
            ? this.elapsedTimeProvider()
            : Date.now() - this.startTime;

        if (elapsed === null || elapsed < 0) {
            return;
        }

        // 如果超过总时长，结束嘴型同步
        if (elapsed >= this.totalDuration) {
            if (this.currentLipValue > 0.01) {
                this.currentLipValue = this.currentLipValue + (0 - this.currentLipValue) * this.smoothingFactor;
                this.setMouthValue(this.currentLipValue);
            }
            this.currentLips = null;
            this.elapsedTimeProvider = null;
            return;
        }

        // 找到当前对应的viseme
        let accumulatedTime = 0;
        let targetValue = 0.0;

        for (const lip of this.currentLips) {
            accumulatedTime += lip.Time;

            if (elapsed <= accumulatedTime) {
                targetValue = this.visemeToValue(lip.Lip);
                break;
            }
        }

        // 平滑过渡
        this.currentLipValue = this.currentLipValue + (targetValue - this.currentLipValue) * this.smoothingFactor;

        // 设置模型参数
        this.setMouthValue(this.currentLipValue);

        // 调试日志（每秒打印一次）
        if (!(this as any)['lastLogTime'] || Date.now() - (this as any)['lastLogTime'] > 1000) {
            if (targetValue > 0.1) {
                console.log(`[LipSync] 嘴型: ${this.currentLipValue.toFixed(2)} (目标: ${targetValue.toFixed(2)}, 进度: ${elapsed}/${this.totalDuration}ms)`);
            }
            (this as any)['lastLogTime'] = Date.now();
        }
    }

    /**
     * 重置嘴型到闭合状态
     */
    reset(): void {
        this.currentLipValue = 0.0;
        this.currentLips = null;
        this.elapsedTimeProvider = null;
        this.setMouthValue(0.0);
    }
}
