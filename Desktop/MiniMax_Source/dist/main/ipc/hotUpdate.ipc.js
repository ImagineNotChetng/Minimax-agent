"use strict";
/**
 * 热更新 IPC 处理模块
 *
 * 提供渲染进程与热更新模块的通信接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHotUpdateIPC = setupHotUpdateIPC;
exports.startHotUpdateAutoCheck = startHotUpdateAutoCheck;
exports.stopHotUpdateAutoCheck = stopHotUpdateAutoCheck;
const electron_1 = require("electron");
const config_1 = require("../config");
const hotUpdate_1 = require("../modules/hotUpdate");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.getCategoryLogger)('update');
/** 主窗口获取函数引用 */
let getMainWindowFn = null;
/**
 * 设置热更新 IPC 处理器
 */
function setupHotUpdateIPC(getMainWindow) {
    getMainWindowFn = getMainWindow;
    // 检查热更新（会自动下载并应用）
    electron_1.ipcMain.handle(config_1.IPC_CHANNELS.HOT_UPDATE_CHECK, async (_event, force) => {
        try {
            logger.info(`[HotUpdate IPC] Check for update, force: ${force}`);
            const result = await (0, hotUpdate_1.checkForHotUpdate)(force);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[HotUpdate IPC] Check failed: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    });
    // 清除缓存（回退到打包版本）
    electron_1.ipcMain.handle(config_1.IPC_CHANNELS.HOT_UPDATE_CLEAR_CACHE, async () => {
        try {
            logger.info('[HotUpdate IPC] Clear cache (rollback to bundled version)');
            const success = await (0, hotUpdate_1.clearHotUpdateCache)();
            return { success };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[HotUpdate IPC] Clear cache failed: ${errorMessage}`);
            return { success: false, error: errorMessage };
        }
    });
    // 应用更新后重新加载页面
    electron_1.ipcMain.handle(config_1.IPC_CHANNELS.HOT_UPDATE_RELOAD, () => {
        const mainWindow = getMainWindowFn?.();
        if (mainWindow && !mainWindow.isDestroyed()) {
            logger.info('[HotUpdate IPC] Reloading page to apply update');
            mainWindow.webContents.reload();
            return { success: true };
        }
        return { success: false, error: 'No main window' };
    });
    // 获取当前热更新版本（异步）
    electron_1.ipcMain.handle(config_1.IPC_CHANNELS.HOT_UPDATE_GET_VERSION, () => {
        return hotUpdate_1.hotUpdateManager.getCurrentVersion();
    });
    // 获取当前热更新版本（同步，用于 preload 初始化）
    electron_1.ipcMain.on(config_1.IPC_CHANNELS.HOT_UPDATE_GET_VERSION_SYNC, (event) => {
        event.returnValue = hotUpdate_1.hotUpdateManager.getCurrentVersion();
    });
    logger.info('[HotUpdate IPC] IPC handlers registered');
}
/**
 * 启动热更新自动检查
 */
function startHotUpdateAutoCheck() {
    hotUpdate_1.hotUpdateManager.startAutoCheck();
}
/**
 * 停止热更新自动检查
 */
function stopHotUpdateAutoCheck() {
    hotUpdate_1.hotUpdateManager.stopAutoCheck();
}
