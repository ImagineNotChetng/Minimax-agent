"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupScreenshotIPC = setupScreenshotIPC;
/**
 * Screenshot IPC Handlers
 * 处理截图相关的 IPC 通信
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const screenshot_1 = require("../modules/screenshot");
const miniChatWindow_1 = require("../windows/miniChatWindow");
/**
 * 设置截图相关的 IPC 处理器
 */
function setupScreenshotIPC() {
    /**
     * 开始截图
     * 返回截图文件路径
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SCREENSHOT_START, async (_, params) => {
        try {
            console.log('[Screenshot IPC] Starting screenshot with params:', params);
            // 隐藏小窗
            (0, miniChatWindow_1.hideMiniChatWindow)();
            // 等待 100ms 开始截图
            await new Promise((resolve) => setTimeout(resolve, 100));
            const filePath = await (0, screenshot_1.startScreenshot)(params?.workspaceDir);
            (0, miniChatWindow_1.showMiniChatWindow)();
            console.log('[Screenshot IPC] Screenshot saved:', filePath);
            return {
                success: true,
                filePath,
            };
        }
        catch (error) {
            console.error('[Screenshot IPC] Screenshot failed:', error);
            (0, miniChatWindow_1.showMiniChatWindow)();
            // 判断错误类型
            let errorType = 'error';
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
                // 检查错误类型
                if (error.type === 'permission') {
                    errorType = 'permission';
                }
                else if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
                    errorType = 'cancelled';
                }
            }
            else {
                errorMessage = String(error);
            }
            return {
                success: false,
                error: errorMessage,
                errorType,
            };
        }
    });
    console.log('[Screenshot IPC] Handlers registered');
}
