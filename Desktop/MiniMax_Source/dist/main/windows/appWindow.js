"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppWindow = createAppWindow;
/**
 * 主窗口（应用窗口）
 * 用户登录后显示的主要工作窗口
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("../config");
const menu_1 = require("../modules/menu");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const tabs_1 = require("../modules/tabs");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 创建主窗口（Tabs 架构）
 */
async function createAppWindow(context) {
    const isMac = process.platform === 'darwin';
    const window = new electron_1.BrowserWindow({
        width: config_1.MAIN_WINDOW_WIDTH,
        height: config_1.MAIN_WINDOW_HEIGHT,
        minWidth: config_1.MAIN_WINDOW_MIN_WIDTH,
        minHeight: config_1.MAIN_WINDOW_MIN_HEIGHT,
        resizable: true,
        title: config_1.MAIN_WINDOW_TITLE,
        // Windows 上隐藏菜单栏
        autoHideMenuBar: !isMac && config_1.isProd,
        titleBarStyle: (0, utils_2.getTitleBarStyle)(process.platform),
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: (0, utils_2.getBackgroundColor)(),
        webPreferences: {
            ...utils_2.DEFAULT_SECURE_WEB_PREFERENCES,
            preload: path.join(__dirname, '..', 'preload.js'),
        },
        show: false,
    });
    context.setWindow(window);
    context.setWindowType('main');
    // 窗口准备好后显示
    window.once('ready-to-show', () => {
        window?.show();
        window?.focus();
    });
    // 处理加载失败
    window.webContents.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Failed to load: ${validatedURL}, Error: ${errorDescription} (${errorCode})`);
        if (config_1.isDev && errorCode !== -3) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            context.getWindow()?.loadURL(config_1.PAGE_URLS.MAIN);
        }
    });
    // 检查是否有指定的目标 URL（通过 --target-url 参数传递）
    const targetUrlArg = process.argv.find((arg) => arg.startsWith('--target-url='));
    const targetUrl = targetUrlArg ? targetUrlArg.replace('--target-url=', '') : null;
    // 构建主页面 URL，如果有目标 URL 则作为参数传递给 Tabs 组件
    const getMainPageUrl = () => {
        if (targetUrl) {
            // 将目标 URL 编码后作为查询参数传递给 /main 页面
            const encodedTargetUrl = encodeURIComponent(targetUrl);
            return `${config_1.PAGE_URLS.MAIN}?initialUrl=${encodedTargetUrl}`;
        }
        return config_1.PAGE_URLS.MAIN;
    };
    // 加载主页面（Tabs 架构）
    if (config_1.isDev) {
        const serverReady = await (0, utils_1.waitForServer)(config_1.PAGE_URLS.MAIN);
        if (serverReady) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.loadURL(getMainPageUrl());
        }
        else {
            console.error('Failed to connect to Next.js server');
            electron_1.app.quit();
            return;
        }
        // window.webContents.openDevTools({ mode: 'right' });
    }
    else {
        window.loadURL(getMainPageUrl());
    }
    // 处理外部链接 - 主窗口直接用外部浏览器打开
    window.webContents.setWindowOpenHandler(({ url }) => {
        if ((0, utils_2.shouldDenyWindowOpen)(url)) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    // 窗口关闭前事件 - 检查是否有进行中的任务
    window.on('close', (event) => {
        if (!context.isForceQuit()) {
            const tabController = (0, tabs_1.getTabController)();
            const activeTabView = tabController?.getActiveTabView();
            if (activeTabView && !activeTabView.webContents.isDestroyed()) {
                event.preventDefault();
                logger_1.default.info('[AppWindow] close: notifying active tab before close');
                activeTabView.webContents.send(config_1.IPC_CHANNELS.APP_BEFORE_QUIT);
            }
        }
    });
    // 窗口关闭后事件
    window.on('closed', () => {
        context.setWindow(null);
        context.setWindowType(null);
    });
    // 监听窗口最大化状态变化
    window.on('maximize', () => {
        context.getWindow()?.webContents.send(config_1.IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, true);
    });
    window.on('unmaximize', () => {
        context.getWindow()?.webContents.send(config_1.IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, false);
    });
    // 监听窗口全屏状态变化
    window.on('enter-full-screen', () => {
        context.getWindow()?.webContents.send(config_1.IPC_CHANNELS.WINDOW_FULL_SCREEN_CHANGED, true);
    });
    window.on('leave-full-screen', () => {
        context.getWindow()?.webContents.send(config_1.IPC_CHANNELS.WINDOW_FULL_SCREEN_CHANGED, false);
    });
    // 设置应用菜单
    (0, menu_1.setupMenu)();
}
