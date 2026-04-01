"use strict";
/**
 * Electron 主进程入口文件
 *
 * 职责：
 * - 初始化环境变量
 * - 注册协议 scheme
 * - 应用生命周期管理
 * - 整合各模块
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// 必须最先导入，加载环境变量
const config_1 = require("./config");
const electron_1 = require("electron");
const logger_1 = __importStar(require("./utils/logger"));
const constants_1 = require("./config/constants");
// 根据环境和语言获取应用名称和 ID
// 支持同时安装开发版、测试版、预发版、线上版
function getAppNameAndId() {
    const envSuffix = config_1.isDev ? ' Dev' : config_1.isTest ? ' Test' : config_1.isStaging ? ' Staging' : '';
    const envIdSuffix = config_1.isDev ? '.dev' : config_1.isTest ? '.test' : config_1.isStaging ? '.staging' : '';
    if (config_1.isZh) {
        return {
            appName: `MiniMax${envSuffix}`,
            appId: `com.minimax.agent.cn${envIdSuffix}`,
        };
    }
    else {
        return {
            appName: `MiniMax Agent${envSuffix}`,
            appId: `com.minimax.agent${envIdSuffix}`,
        };
    }
}
// 设置应用名称和 AppUserModelId，确保 Windows 下单实例锁和协议处理正常工作
// 必须在 requestSingleInstanceLock 之前设置
const { appName: APP_NAME, appId: APP_ID } = getAppNameAndId();
electron_1.app.setName(APP_NAME);
electron_1.app.setAppUserModelId(APP_ID);
// 开发环境下设置数据目录名称，确保不同环境数据隔离
// 生产环境由 electron-builder 的 productName 自动设置
// 必须在 app ready 之前设置
if (config_1.isDev) {
    const path = require('path');
    const userDataPath = electron_1.app.getPath('userData');
    // 开发环境默认可能是 Electron 或其他名称，统一替换为 APP_NAME
    const basePath = path.dirname(userDataPath);
    const newUserDataPath = path.join(basePath, APP_NAME);
    electron_1.app.setPath('userData', newUserDataPath);
}
logger_1.default.info(`[Electron] App name: ${electron_1.app.getName()} \n App ID: ${APP_ID} \n buildEnv: ${config_1.buildEnv} \n app userdata path: ${electron_1.app.getPath('userData')}`);
// 注册自定义协议 scheme (必须在 app ready 之前)
const protocol_1 = require("./modules/protocol");
(0, protocol_1.registerProtocolScheme)();
// 设置 Deep Link (必须在 app ready 之前)
const deeplink_1 = require("./modules/deeplink");
(0, deeplink_1.setupDeepLink)();
// 导入各功能模块
const windows_1 = require("./windows");
const ipc_1 = require("./ipc");
const heartbeat_1 = require("./modules/heartbeat");
const screenshot_1 = require("./modules/screenshot");
const utils_1 = require("./utils");
// import { setupCorsHandler } from './modules/cors';
// 应用准备就绪
electron_1.app.whenReady().then(() => {
    // 清理过期日志文件（保留最近 7 天）
    (0, logger_1.cleanupOldLogs)();
    // 生产模式：注册自定义协议处理器和 CORS 处理
    if (!config_1.isDev) {
        (0, protocol_1.setupProtocolHandler)();
        // 处理跨域问题
        // setupCorsHandler();
    }
    // 设置所有 IPC 处理器
    (0, ipc_1.setupAllIPC)(windows_1.getMainWindow);
    // 初始化截图模块
    (0, screenshot_1.initScreenshots)();
    // 创建主窗口
    windows_1.windowManager.createInitialWindow();
    // 初始化桌面设置（托盘、快捷键、开机自启动等）
    (0, ipc_1.initDesktopSettings)();
    // macOS: 点击 dock 图标时恢复或创建窗口
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            // 如果没有窗口，创建新窗口
            windows_1.windowManager.createInitialWindow();
        }
        else {
            (0, utils_1.bringToFront)();
        }
    });
});
// ============================================
// 应用退出前处理
// ============================================
/**
 * 监听渲染进程确认退出/关闭窗口
 * 渲染进程确认后，设置 forceQuit 并关闭窗口
 */
electron_1.ipcMain.on(constants_1.IPC_CHANNELS.APP_CONFIRM_QUIT, () => {
    logger_1.default.info('[App] confirm-quit: renderer confirmed, closing window');
    windows_1.windowManager.setForceQuit(true);
    const mainWindow = (0, windows_1.getMainWindow)();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});
/**
 * 监听渲染进程请求恢复窗口到前台
 * 当有正在运行的任务需要显示确认弹窗时调用
 */
electron_1.ipcMain.on(constants_1.IPC_CHANNELS.APP_BRING_TO_FRONT, () => {
    logger_1.default.info('[App] bring-to-front: renderer requested');
    // 不创建新窗口，只恢复已存在的窗口
    (0, utils_1.bringToFront)({ createIfNotExists: false });
});
// 应用退出前清理
electron_1.app.on('will-quit', () => {
    logger_1.default.info('app will quit, stop heartbeat');
    (0, heartbeat_1.stopHeartbeat)();
    (0, ipc_1.cleanupDesktopSettings)();
    (0, ipc_1.stopHotUpdateAutoCheck)();
});
