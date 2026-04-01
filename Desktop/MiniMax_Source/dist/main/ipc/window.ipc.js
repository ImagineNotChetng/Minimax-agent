"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWindowIPC = setupWindowIPC;
/**
 * 窗口控制 IPC 处理
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
/**
 * 设置窗口控制 IPC 处理器
 */
function setupWindowIPC(getMainWindow) {
    // 最小化窗口
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_MINIMIZE, () => {
        getMainWindow()?.minimize();
    });
    // 最大化/还原窗口
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
        const mainWindow = getMainWindow();
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
        return mainWindow?.isMaximized();
    });
    // 关闭窗口
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_CLOSE, () => {
        getMainWindow()?.close();
    });
    // 检查窗口是否最大化（包括全屏状态）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
        const mainWindow = getMainWindow();
        // macOS 上点击绿色按钮是进入全屏，需要同时检查
        return mainWindow?.isMaximized();
    });
    // 检查窗口是否全屏
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_IS_FULL_SCREEN, () => {
        const mainWindow = getMainWindow();
        return mainWindow?.isFullScreen();
    });
    // 打开外部链接
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPEN_EXTERNAL, async (_, url) => {
        try {
            await electron_1.shell.openExternal(url);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
}
