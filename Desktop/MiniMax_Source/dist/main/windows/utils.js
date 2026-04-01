"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SECURE_WEB_PREFERENCES = void 0;
exports.getTitleBarStyle = getTitleBarStyle;
exports.getBackgroundColor = getBackgroundColor;
exports.isAuthUrl = isAuthUrl;
exports.shouldDenyWindowOpen = shouldDenyWindowOpen;
exports.destroyWindow = destroyWindow;
/**
 * 窗口工具函数
 * 提供窗口管理中常用的工具函数
 */
const electron_1 = require("electron");
const config_1 = require("../config");
/**
 * 获取标题栏样式
 * macOS 使用 hiddenInset，其他平台使用 default
 */
function getTitleBarStyle(platform) {
    return platform === 'darwin' ? 'hiddenInset' : 'default';
}
/**
 * 获取窗口背景颜色
 * 根据系统主题返回深色或浅色背景
 */
function getBackgroundColor(shouldUseDarkColors = electron_1.nativeTheme.shouldUseDarkColors) {
    return shouldUseDarkColors ? '#1a1a1a' : '#ffffff';
}
/**
 * 验证是否为允许的 OAuth 域名
 * 使用严格的域名匹配，防止子域名注入攻击
 */
function isAuthUrl(url, allowedDomains = config_1.ALLOWED_OAUTH_DOMAINS) {
    try {
        const parsedUrl = new URL(url);
        return allowedDomains.some((domain) => parsedUrl.host === domain || parsedUrl.host.endsWith(`.${domain}`));
    }
    catch {
        return false;
    }
}
/**
 * 处理窗口打开请求
 * 返回是否应该拒绝打开（http/https 链接会被拒绝，由外部浏览器打开）
 */
function shouldDenyWindowOpen(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}
/**
 * 安全销毁窗口
 * 检查窗口是否存在且未被销毁后再销毁
 */
function destroyWindow(window) {
    if (window && !window.isDestroyed()) {
        window.destroy();
    }
}
/**
 * 默认的安全 Web 首选项
 */
exports.DEFAULT_SECURE_WEB_PREFERENCES = {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
};
