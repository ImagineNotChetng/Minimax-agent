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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMiniChatWindow = getMiniChatWindow;
exports.createMiniChatWindow = createMiniChatWindow;
exports.closeMiniChatWindow = closeMiniChatWindow;
exports.showMiniChatWindow = showMiniChatWindow;
exports.hideMiniChatWindow = hideMiniChatWindow;
exports.toggleMiniChatWindow = toggleMiniChatWindow;
exports.openMiniChatDevTools = openMiniChatDevTools;
exports.closeMiniChatDevTools = closeMiniChatDevTools;
exports.toggleMiniChatDevTools = toggleMiniChatDevTools;
exports.resizeMiniChatWindow = resizeMiniChatWindow;
/**
 * Mini Chat Window 管理
 * 轻量级小窗，自动根据 chatHistoryMap 显示消息列表或仅输入框
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const storage_ipc_1 = require("../ipc/storage.ipc");
// 当前小窗引用
let miniChatWindow = null;
/**
 * 获取小窗引用
 */
function getMiniChatWindow() {
    return miniChatWindow;
}
/**
 * 构建 MiniChat URL
 * @param chatId - 可选，指定要显示的聊天 ID
 */
function buildMiniChatUrl(chatId) {
    let url = config_1.PAGE_URLS.MINI_CHAT;
    if (chatId) {
        url += `?chatId=${chatId}`;
    }
    return url;
}
/**
 * 获取窗口在当前鼠标所在屏幕的位置
 * @param windowWidth - 窗口宽度
 * @param windowHeight - 窗口高度
 */
function getWindowPositionForCurrentDisplay(windowWidth, windowHeight) {
    const cursorPoint = electron_1.screen.getCursorScreenPoint();
    const currentDisplay = electron_1.screen.getDisplayNearestPoint(cursorPoint);
    // 使用 workArea 而非 bounds + workAreaSize，确保正确处理任务栏/菜单栏位置
    const { x: workX, y: workY, width, height } = currentDisplay.workArea;
    const x = workX + Math.round((width - windowWidth) / 2);
    const y = workY + height - windowHeight - 50;
    return { x, y };
}
/**
 * 创建或显示小窗
 * @param chatId - 可选，指定要显示的聊天 ID
 */
async function createMiniChatWindow(chatId) {
    // 如果窗口已存在且未销毁，只更新 URL 和显示
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        const url = buildMiniChatUrl(chatId);
        await miniChatWindow.loadURL(url);
        // 重新计算位置，确保窗口出现在鼠标当前所在的屏幕
        const [width, height] = miniChatWindow.getSize();
        const { x, y } = getWindowPositionForCurrentDisplay(width, height);
        miniChatWindow.setPosition(x, y);
        miniChatWindow.show();
        miniChatWindow.focus();
        return;
    }
    // 创建新窗口
    const windowWidth = 600 + 300; // 内容宽度 + 左右留白
    const maxHeight = 640 + 40; // 内容高度 + 上下留白
    const windowHeight = maxHeight;
    // 计算窗口位置（基于鼠标当前所在屏幕）
    const { x, y } = getWindowPositionForCurrentDisplay(windowWidth, windowHeight);
    miniChatWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x,
        y,
        minWidth: windowWidth,
        minHeight: windowHeight,
        maxHeight: maxHeight,
        resizable: true,
        maximizable: false,
        fullscreenable: false,
        fullscreen: false,
        title: 'Quick Input',
        frame: false, // 去掉窗口边框和控制按钮（所有平台）
        transparent: true, // 启用透明窗口
        backgroundColor: '#00000000', // 完全透明背景
        alwaysOnTop: false,
        skipTaskbar: false, // 在任务栏显示
        hasShadow: false, // 移除窗口阴影，使透明更自然
        webPreferences: {
            ...utils_2.DEFAULT_SECURE_WEB_PREFERENCES,
            preload: path.join(__dirname, '..', 'preload.js'),
            backgroundThrottling: false, // 防止背景节流影响透明度
            // 禁用默认白色背景闪烁
            offscreen: false,
        },
        show: false, // 初始不显示，等待 ready-to-show 事件
    });
    // 窗口准备好后显示（等待首次渲染完成）
    miniChatWindow.once('ready-to-show', () => {
        // 确保窗口在内容加载后再显示，避免白屏闪烁
        if (miniChatWindow && !miniChatWindow.isDestroyed()) {
            miniChatWindow.show();
            miniChatWindow.focus();
        }
    });
    // 处理加载失败
    miniChatWindow.webContents.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL) => {
        console.error(`[MiniChat] Failed to load: ${validatedURL}, Error: ${errorDescription} (${errorCode})`);
        if (config_1.isDev && errorCode !== -3) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const url = buildMiniChatUrl(chatId);
            miniChatWindow?.loadURL(url);
        }
    });
    // 加载页面
    const url = buildMiniChatUrl(chatId);
    if (config_1.isDev) {
        const serverReady = await (0, utils_1.waitForServer)(config_1.PAGE_URLS.MINI_CHAT);
        if (serverReady) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            miniChatWindow.loadURL(url);
        }
        else {
            console.error('[MiniChat] Failed to connect to Next.js server');
            miniChatWindow.destroy();
            miniChatWindow = null;
            return;
        }
        // 开发环境自动打开 DevTools
        const config = (0, storage_ipc_1.getDesktopConfig)();
        if ((config_1.isDev || (config.enableTabDevTools && (config_1.isTest || config_1.isStaging))) &&
            !miniChatWindow.webContents.isDevToolsOpened()) {
            miniChatWindow.webContents.openDevTools({ mode: 'right' });
        }
    }
    else {
        miniChatWindow.loadURL(url);
    }
    // 处理外部链接 - 用外部浏览器打开
    miniChatWindow.webContents.setWindowOpenHandler(({ url }) => {
        if ((0, utils_2.shouldDenyWindowOpen)(url)) {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    // 窗口关闭事件
    miniChatWindow.on('closed', () => {
        miniChatWindow = null;
    });
    // 失去焦点时，通知渲染进程（由渲染进程决定是否关闭）
    miniChatWindow.on('blur', () => {
        if (miniChatWindow && !miniChatWindow.isDestroyed()) {
            miniChatWindow.webContents.send(config_1.IPC_CHANNELS.MINI_CHAT_BLUR);
        }
    });
    // 获得焦点时，通知渲染进程聚焦到输入框
    miniChatWindow.on('focus', () => {
        if (miniChatWindow && !miniChatWindow.isDestroyed()) {
            miniChatWindow.webContents.send(config_1.IPC_CHANNELS.MINI_CHAT_FOCUS);
        }
    });
    // ESC 键隐藏小窗（不是关闭，保持窗口状态）
    miniChatWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
            hideMiniChatWindow();
        }
    });
}
/**
 * 关闭小窗
 */
function closeMiniChatWindow() {
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        miniChatWindow.close();
    }
}
/**
 * 显示小窗
 */
function showMiniChatWindow() {
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        // 重新计算位置，确保窗口出现在鼠标当前所在的屏幕
        const [width, height] = miniChatWindow.getSize();
        const { x, y } = getWindowPositionForCurrentDisplay(width, height);
        miniChatWindow.setPosition(x, y);
        miniChatWindow.show();
        miniChatWindow.focus();
    }
    else {
        createMiniChatWindow(); // 默认创建输入模式
    }
}
/**
 * 隐藏小窗
 */
function hideMiniChatWindow() {
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        miniChatWindow.hide();
    }
}
/**
 * 切换小窗显示状态
 */
function toggleMiniChatWindow() {
    if (miniChatWindow && !miniChatWindow.isDestroyed() && miniChatWindow.isVisible()) {
        hideMiniChatWindow();
    }
    else {
        showMiniChatWindow();
    }
}
/**
 * 打开 DevTools
 */
function openMiniChatDevTools(mode = 'right') {
    if (!config_1.isDev) {
        return;
    }
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        if (!miniChatWindow.webContents.isDevToolsOpened()) {
            miniChatWindow.webContents.openDevTools({ mode });
        }
    }
}
/**
 * 关闭 DevTools
 */
function closeMiniChatDevTools() {
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        if (miniChatWindow.webContents.isDevToolsOpened()) {
            miniChatWindow.webContents.closeDevTools();
        }
    }
}
/**
 * 切换 DevTools 显示状态
 */
function toggleMiniChatDevTools() {
    if (!config_1.isDev) {
        return;
    }
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        if (miniChatWindow.webContents.isDevToolsOpened()) {
            miniChatWindow.webContents.closeDevTools();
        }
        else {
            miniChatWindow.webContents.openDevTools({ mode: 'right' });
        }
    }
}
/**
 * 调整小窗高度
 * @param height - 目标高度
 * @param resizable - 可选，设置是否允许调整大小
 */
function resizeMiniChatWindow(height, resizable) {
    if (miniChatWindow && !miniChatWindow.isDestroyed()) {
        // 如果提供了 resizable 参数，则更新窗口属性
        if (typeof resizable === 'boolean') {
            miniChatWindow.setResizable(resizable);
        }
        // 获取当前窗口的位置和大小
        const [width, currentHeight] = miniChatWindow.getSize();
        if (currentHeight === height) {
            return;
        }
        const [x, y] = miniChatWindow.getPosition();
        // 计算高度差
        const heightDiff = height - currentHeight;
        // 向上展开：调整 y 坐标
        const newY = y - heightDiff;
        console.log(`[MiniChatWindow] Resizing from ${currentHeight}px to ${height}px`);
        // 先设置位置（向上移动），再设置大小
        miniChatWindow.setBounds({
            x,
            y: newY,
            width,
            height,
        }, true);
    }
}
