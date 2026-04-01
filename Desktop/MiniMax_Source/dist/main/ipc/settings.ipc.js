"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openSystemNotificationSettings = void 0;
exports.initDesktopSettings = initDesktopSettings;
exports.setupDesktopSettingsIPC = setupDesktopSettingsIPC;
exports.cleanupDesktopSettings = cleanupDesktopSettings;
/**
 * 桌面设置 IPC 处理
 * 处理托盘、开机自启动、全局快捷键、通知等设置
 *
 */
const electron_1 = require("electron");
const os_1 = __importDefault(require("os"));
const tray_1 = require("../modules/tray");
const storage_ipc_1 = require("./storage.ipc");
const windows_1 = require("../windows");
const constants_1 = require("../config/constants");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 注册所有全局快捷键
 * 这是全局快捷键，即使应用不在前台也能触发
 * globalAccessShortcut 格式: { miniChatCreate: 'Alt+A' } (功能名 → 快捷键)
 * 注意：调用前需要先调用 unregisterGlobalShortcuts() 取消旧的快捷键
 */
function registerGlobalShortcuts() {
    const globalAccessShortcut = (0, storage_ipc_1.getDesktopConfig)().globalAccessShortcut || {};
    let allSuccess = true;
    // 注册 MiniChat 快捷键（toggle 行为：已开启则关闭，未开启则打开）
    const miniChatShortcut = globalAccessShortcut[constants_1.SHORTCUT_KEYS.MINI_CHAT_CREATE];
    if (miniChatShortcut) {
        const registered = electron_1.globalShortcut.register(miniChatShortcut, () => {
            (0, windows_1.toggleMiniChatWindow)();
        });
        if (!registered) {
            console.error(`[Desktop Settings] Failed to register MiniChat shortcut: ${miniChatShortcut}`);
            allSuccess = false;
        }
        else {
            logger_1.default.info(`[Desktop Settings] Registered MiniChat shortcut: ${miniChatShortcut}`);
        }
    }
    // 如果需要注册更多快捷键，可以在这里添加
    return allSuccess;
}
/**
 * 取消注册所有全局快捷键
 */
function unregisterGlobalShortcuts() {
    const globalAccessShortcut = (0, storage_ipc_1.getDesktopConfig)().globalAccessShortcut || {};
    // 遍历所有配置的快捷键值并取消注册
    Object.values(globalAccessShortcut).forEach((shortcutKey) => {
        try {
            if (electron_1.globalShortcut.isRegistered(shortcutKey)) {
                electron_1.globalShortcut.unregister(shortcutKey);
                logger_1.default.info(`[Desktop Settings] Unregistered shortcut: ${shortcutKey}`);
            }
        }
        catch (error) {
            console.error(`[Desktop Settings] Failed to unregister shortcut ${shortcutKey}:`, error);
        }
    });
}
/**
 * 设置开机自启动
 */
function setLoginItemSettings(enabled) {
    electron_1.app.setLoginItemSettings({
        openAtLogin: enabled,
        // macOS 专用：在登录时隐藏窗口
        openAsHidden: false,
    });
}
/**
 * 获取开机自启动状态
 */
function getLoginItemSettings() {
    const settings = electron_1.app.getLoginItemSettings();
    return settings.openAtLogin;
}
const openSystemNotificationSettings = () => {
    if (process.platform === 'darwin') {
        const release = os_1.default.release();
        const majorVersion = parseInt(release.split('.')[0]);
        if (majorVersion >= 22) {
            electron_1.shell.openExternal(`x-apple.systempreferences:com.apple.Notifications-Settings.extension`);
        }
        else {
            electron_1.shell.openExternal('x-apple.systempreferences:com.apple.preference.notifications');
        }
    }
    else if (process.platform === 'win32') {
        electron_1.shell.openExternal('ms-settings:notifications');
    }
};
exports.openSystemNotificationSettings = openSystemNotificationSettings;
/**
 * 初始化桌面设置
 * 在应用启动时调用，根据保存的配置初始化各项功能
 */
function initDesktopSettings() {
    const config = (0, storage_ipc_1.getDesktopConfig)();
    // 初始化托盘
    if (config.menuBarVisible !== false) {
        (0, tray_1.createTray)();
    }
    // 初始化开机自启动
    setLoginItemSettings(config.runOnStartup !== false);
    // 初始化所有全局快捷键（启动时无需取消，直接注册）
    registerGlobalShortcuts();
}
/**
 * 设置桌面设置 IPC 处理器
 */
function setupDesktopSettingsIPC() {
    // 设置托盘可见性
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_SET_TRAY_VISIBLE, (_, visible) => {
        try {
            if (visible) {
                if (!(0, tray_1.getTray)()) {
                    (0, tray_1.createTray)();
                }
            }
            else {
                (0, tray_1.destroyTray)();
            }
            (0, storage_ipc_1.setDesktopConfig)({ menuBarVisible: visible });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 获取托盘可见性
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_GET_TRAY_VISIBLE, () => {
        return !!(0, tray_1.getTray)();
    });
    // 设置开机自启动
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_SET_RUN_ON_STARTUP, (_, enabled) => {
        try {
            setLoginItemSettings(enabled);
            (0, storage_ipc_1.setDesktopConfig)({ runOnStartup: enabled });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 获取开机自启动状态
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_GET_RUN_ON_STARTUP, () => {
        return getLoginItemSettings();
    });
    // 快捷键设置
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_SET_GLOBAL_ACCESS_SHORTCUT, (_, globalAccessShortcut) => {
        try {
            // 先取消旧的快捷键（必须在保存新配置之前，否则读取的是新配置）
            unregisterGlobalShortcuts();
            // 保存新的快捷键配置
            (0, storage_ipc_1.setDesktopConfig)({ globalAccessShortcut });
            // 注册新的快捷键
            const success = registerGlobalShortcuts();
            return { success };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 获取快捷键状态（返回用户偏好设置）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_GET_GLOBAL_ACCESS_SHORTCUT, () => {
        const config = (0, storage_ipc_1.getDesktopConfig)();
        return config.globalAccessShortcut;
    });
    // 打开系统通知设置
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_OPEN_NOTIFICATION_SETTINGS, () => {
        (0, exports.openSystemNotificationSettings)();
        return { success: true };
    });
    // 设置语言（需要重启生效）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_SET_LANGUAGE, (_, language) => {
        try {
            (0, storage_ipc_1.setDesktopConfig)({ language });
            return { success: true, requiresRestart: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
}
/**
 * 清理桌面设置（应用退出时调用）
 */
function cleanupDesktopSettings() {
    unregisterGlobalShortcuts();
}
