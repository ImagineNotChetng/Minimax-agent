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
exports.getLogViewerWindow = getLogViewerWindow;
exports.createLogViewerWindow = createLogViewerWindow;
exports.closeLogViewerWindow = closeLogViewerWindow;
/**
 * Log Viewer Window 管理
 * 用于查看 electron-log 写入的日志文件
 * 仅在测试环境可用
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("../config");
// 当前日志查看器窗口引用
let logViewerWindow = null;
/**
 * 获取日志查看器窗口引用
 */
function getLogViewerWindow() {
    return logViewerWindow;
}
/**
 * 创建或显示日志查看器窗口
 */
async function createLogViewerWindow() {
    // 仅在测试环境可用
    if (!config_1.isTest && !config_1.isStaging) {
        console.warn('[LogViewer] Only available in test or staging environment');
        return;
    }
    // 如果窗口已存在且未销毁，只显示
    if (logViewerWindow && !logViewerWindow.isDestroyed()) {
        logViewerWindow.show();
        logViewerWindow.focus();
        return;
    }
    // 创建新窗口
    logViewerWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'Log Viewer',
        backgroundColor: electron_1.nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#ffffff',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload.js'),
            webSecurity: true,
        },
        show: false,
    });
    // 窗口准备好后显示
    logViewerWindow.once('ready-to-show', () => {
        logViewerWindow?.show();
        logViewerWindow?.focus();
    });
    // 加载日志查看器页面
    const url = config_1.PAGE_URLS.LOG_VIEWER;
    logViewerWindow.loadURL(url);
    // 窗口关闭事件
    logViewerWindow.on('closed', () => {
        logViewerWindow = null;
        console.log('[LogViewer] Window closed');
    });
    console.log('[LogViewer] Window created');
}
/**
 * 关闭日志查看器窗口
 */
function closeLogViewerWindow() {
    if (logViewerWindow && !logViewerWindow.isDestroyed()) {
        logViewerWindow.close();
    }
}
