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
exports.PROTOCOL_NAME = void 0;
exports.registerDeepLinkHandler = registerDeepLinkHandler;
exports.setupDeepLink = setupDeepLink;
exports.getProtocolName = getProtocolName;
/**
 * Deep Link 模块
 * 支持从网页唤起桌面端应用
 *
 * 协议格式 (根据语言和环境区分):
 * - 国内版线上: minimax-cn://action?param1=value1&param2=value2
 * - 海外版线上: minimax://action?param1=value1&param2=value2
 * - 国内版测试: minimax-cn-test://action?param1=value1&param2=value2
 * - 海外版测试: minimax-test://action?param1=value1&param2=value2
 * - 国内版预发: minimax-cn-staging://action?param1=value1&param2=value2
 * - 海外版预发: minimax-staging://action?param1=value1&param2=value2
 *
 * 示例:
 * - minimax://open                    打开应用
 * - minimax://chat?message=hello      打开并发送消息
 * - minimax://navigate?url=xxx        打开并导航到指定页面
 * - minimax://auth-callback?accessToken=xxx&idToken=xxx  OAuth 登录回调
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const windows_1 = require("../../windows");
const constants_1 = require("../../config/constants");
const storage_ipc_1 = require("../../ipc/storage.ipc");
const env_1 = require("../../config/env");
// 自定义协议名称：根据语言和环境区分
// 格式: minimax[-cn][-env]
// 例如: minimax (英文线上), minimax-cn (中文线上), minimax-test (英文测试), minimax-cn-staging (中文预发)
// 注意: 开发环境不需要区分，因为不会打包
function getProtocolNameByEnv() {
    const base = env_1.isZh ? 'minimax-cn' : 'minimax';
    const envSuffix = env_1.isTest ? '-test' : env_1.isStaging ? '-staging' : '';
    return `${base}${envSuffix}`;
}
exports.PROTOCOL_NAME = getProtocolNameByEnv();
// 注册的处理器
const handlers = new Map();
/**
 * 解析 Deep Link URL
 */
function parseDeepLink(url) {
    try {
        // 处理 URL 格式: {protocol}://action?params 或 {protocol}:action?params
        // 也支持 {protocol}:///path?params 格式
        // 国内版 protocol = minimax-cn，海外版 protocol = minimax
        const cleanUrl = url.replace(`${exports.PROTOCOL_NAME}://`, '').replace(`${exports.PROTOCOL_NAME}:`, '');
        const [actionPath, queryString] = cleanUrl.split('?');
        // 去掉前导和末尾斜杠，获取 action 名称
        const action = actionPath?.replace(/^\/+/, '').replace(/\/+$/, '') || 'open';
        const params = {};
        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        return { action, params, rawUrl: url };
    }
    catch (error) {
        console.error('[DeepLink] Failed to parse URL:', url, error);
        return null;
    }
}
/**
 * 处理 OAuth 登录回调
 * 从系统浏览器登录后，通过 deeplink 将 token 传回
 */
async function handleAuthCallback(params) {
    console.log('[DeepLink] handleAuthCallback called with params:', {
        hasAccessToken: !!params.accessToken,
        hasIdToken: !!params.idToken,
        hasError: !!params.error,
    });
    const { accessToken, idToken, error } = params;
    // 处理错误情况
    if (error) {
        // 如果是取消，不做任何操作，用户可以重新点击登录
        if (error === 'cancelled') {
            return;
        }
        // 其他错误，可以通知渲染进程显示错误
        const mainWindow = (0, windows_1.getMainWindow)();
        if (mainWindow) {
            mainWindow.webContents.send(constants_1.IPC_CHANNELS.AUTH_CALLBACK_ERROR, { error });
        }
        return;
    }
    // 验证必要参数
    if (!accessToken || !idToken) {
        console.error('[DeepLink] Auth callback missing tokens');
        return;
    }
    try {
        // 保存 tokens 到主进程存储
        (0, storage_ipc_1.setTokens)({ accessToken, idToken });
        // 检查是否有 main 窗口存在
        const mainWindow = windows_1.windowManager.getWindowByType('main');
        if (mainWindow) {
            // 已经有主窗口，通知渲染进程登录成功
            mainWindow.webContents.send(constants_1.IPC_CHANNELS.AUTH_CALLBACK_SUCCESS);
        }
        else {
            // 没有主窗口，需要创建（从登录窗口切换）
            // 等待一小段时间确保 token 已完全保存到磁盘
            await new Promise((resolve) => setTimeout(resolve, 100));
            await windows_1.windowManager.switchToMainWindow();
        }
    }
    catch (err) {
        console.error('[DeepLink] Failed to handle auth callback:', err);
    }
}
/**
 * 处理 Deep Link
 */
async function handleDeepLink(url) {
    console.log('[DeepLink] handleDeepLink called with url:', url);
    const parsed = parseDeepLink(url);
    if (!parsed) {
        console.log('[DeepLink] Failed to parse url');
        return;
    }
    console.log('[DeepLink] Parsed action:', parsed.action, 'params:', Object.keys(parsed.params));
    // 特殊处理：OAuth 登录回调
    if (parsed.action === 'auth-callback') {
        await handleAuthCallback(parsed.params);
        return;
    }
    // 确保窗口存在并聚焦
    let mainWindow = (0, windows_1.getMainWindow)();
    if (!mainWindow) {
        windows_1.windowManager.createInitialWindow();
        mainWindow = (0, windows_1.getMainWindow)();
    }
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        // 通知渲染进程
        mainWindow.webContents.send(constants_1.IPC_CHANNELS.DEEPLINK_RECEIVED, parsed);
    }
    // 调用注册的处理器
    const handler = handlers.get(parsed.action);
    if (handler) {
        handler(parsed);
    }
    else {
        // 默认处理：只聚焦窗口
        console.log('[DeepLink] No handler for action:', parsed.action);
    }
}
/**
 * 注册 Deep Link 处理器
 */
function registerDeepLinkHandler(action, handler) {
    handlers.set(action, handler);
}
/**
 * 设置 Deep Link 协议
 * 必须在 app ready 之前调用
 */
function setupDeepLink() {
    // Windows/Linux: 通过 second-instance 事件接收
    // 确保单实例运行（使用协议名称作为额外数据，区分国内版和海外版）
    // 注意：必须在注册协议之前请求单实例锁，否则新启动的实例可能在退出前就注册了协议
    const gotTheLock = electron_1.app.requestSingleInstanceLock({ protocol: exports.PROTOCOL_NAME });
    if (!gotTheLock) {
        // 另一个实例已在运行，退出当前实例
        // 不要做任何其他操作，直接退出
        electron_1.app.quit();
        return; // 提前返回，避免执行后续代码
    }
    // 获得锁后，注册 second-instance 事件处理器
    electron_1.app.on('second-instance', (_event, commandLine) => {
        // Windows: deep link URL 在命令行参数中
        const url = commandLine.find((arg) => arg.startsWith(`${exports.PROTOCOL_NAME}://`));
        if (url) {
            handleDeepLink(url);
        }
        // 聚焦主窗口
        const mainWindow = (0, windows_1.getMainWindow)();
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    // 设置为默认协议处理器
    const isDefaultClient = electron_1.app.isDefaultProtocolClient(exports.PROTOCOL_NAME);
    if (!isDefaultClient) {
        if (process.platform === 'win32') {
            // Windows: 根据是否为打包应用来决定注册方式
            // process.defaultApp 为 true 表示通过 electron . 或 electronmon 启动（开发模式）
            if (process.defaultApp) {
                // 开发模式：需要传递 electron 可执行文件路径和入口文件
                // 注意：如果通过 electronmon 启动，需要包含 --require hook.js 参数
                // 但为了简化，我们直接使用 dist/main/index.js 作为入口
                // 这样 deeplink 启动的新实例会被 requestSingleInstanceLock 拦截
                // 并通过 second-instance 事件传递给已运行的实例
                const mainEntry = path.join(electron_1.app.getAppPath(), 'dist', 'main', 'index.js');
                electron_1.app.setAsDefaultProtocolClient(exports.PROTOCOL_NAME, process.execPath, [mainEntry]);
            }
            else {
                // 生产环境：只需传递 exe 路径
                electron_1.app.setAsDefaultProtocolClient(exports.PROTOCOL_NAME, process.execPath);
            }
        }
        else {
            // macOS/Linux: 直接注册即可
            electron_1.app.setAsDefaultProtocolClient(exports.PROTOCOL_NAME);
        }
    }
    // macOS: 通过 open-url 事件接收
    electron_1.app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeepLink(url);
    });
    // 检查启动参数中是否有 deep link（冷启动时）
    const deepLinkUrl = process.argv.find((arg) => arg.startsWith(`${exports.PROTOCOL_NAME}://`));
    if (deepLinkUrl) {
        // 等待 app ready 后处理
        electron_1.app.whenReady().then(() => {
            // 稍微延迟，确保窗口已创建
            setTimeout(() => handleDeepLink(deepLinkUrl), 500);
        });
    }
}
/**
 * 获取协议名称
 */
function getProtocolName() {
    return exports.PROTOCOL_NAME;
}
