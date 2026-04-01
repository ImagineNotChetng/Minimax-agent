"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupNotificationIPC = setupNotificationIPC;
/**
 * 系统通知 IPC 处理
 * 使用 Electron 主进程的 Notification API
 * 即使窗口隐藏也能发送通知
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const windows_1 = require("../windows");
const tabs_1 = require("../modules/tabs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
/**
 * 显示系统通知
 */
function showNotification(options) {
    const { title, body, icon, silent = false, data } = options;
    // 检查是否支持通知
    if (!electron_1.Notification.isSupported()) {
        console.warn('[Notification] System notifications not supported');
        return;
    }
    // 检查窗口是否聚焦，如果聚焦则不发送系统通知
    const mainWindow = (0, windows_1.getMainWindow)();
    if (mainWindow && mainWindow.isFocused()) {
        // 窗口已聚焦，通过 IPC 通知渲染进程更新 UI 即可
        return;
    }
    // 构建图标路径
    let iconPath = icon;
    if (!iconPath) {
        // 使用彩色图标作为通知图标，视觉效果更好
        if (env_1.isDev) {
            iconPath = path_1.default.join(__dirname, '../../resources/tray.png');
        }
        else {
            iconPath = path_1.default.join(process.resourcesPath, 'tray.png');
        }
    }
    const notification = new electron_1.Notification({
        title,
        body,
        silent,
        icon: iconPath,
    });
    // 点击通知时的处理
    notification.on('click', () => {
        const win = (0, windows_1.getMainWindow)();
        if (win) {
            // 恢复并聚焦窗口
            if (win.isMinimized()) {
                win.restore();
            }
            win.show();
            win.focus();
            // 将扩展参数传递给活跃 Tab 的渲染进程
            if (data) {
                // 使用 TabController 获取活跃 Tab 的 webContents
                const tabController = (0, tabs_1.getTabController)();
                const activeTabView = tabController.getActiveTabView();
                if (activeTabView) {
                    activeTabView.webContents.send(constants_1.IPC_CHANNELS.NOTIFICATION_CLICK, data);
                }
                else {
                    // 降级：如果没有活跃 Tab，发送给主窗口
                    win.webContents.send(constants_1.IPC_CHANNELS.NOTIFICATION_CLICK, data);
                }
            }
        }
    });
    notification.show();
}
/**
 * 设置通知 IPC 处理器
 */
function setupNotificationIPC() {
    // 显示系统通知
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.NOTIFICATION_SHOW, (_, options) => {
        try {
            showNotification(options);
            return { success: true };
        }
        catch (error) {
            console.error('[Notification] Failed to show notification:', error);
            return { success: false, error: String(error) };
        }
    });
}
