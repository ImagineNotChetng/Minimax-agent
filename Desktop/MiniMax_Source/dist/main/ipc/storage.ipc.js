"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultWorkingDirectory = getDefaultWorkingDirectory;
exports.getDefaultShortcut = getDefaultShortcut;
exports.getTokens = getTokens;
exports.setTokens = setTokens;
exports.clearTokens = clearTokens;
exports.getUserInfo = getUserInfo;
exports.setUserInfo = setUserInfo;
exports.clearUserInfo = clearUserInfo;
exports.getDesktopConfig = getDesktopConfig;
exports.setDesktopConfig = setDesktopConfig;
exports.clearDesktopConfig = clearDesktopConfig;
exports.getLocalStorageConfig = getLocalStorageConfig;
exports.setLocalStorageConfig = setLocalStorageConfig;
exports.clearLocalStorageConfig = clearLocalStorageConfig;
exports.clearAll = clearAll;
exports.setupStorageIPC = setupStorageIPC;
/**
 * 存储模块 IPC 处理
 * 使用 electron-store 存储配置
 */
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
const constants_1 = require("../config/constants");
/**
 * 根据国内/海外版本和环境区分存储配置名称和目录
 * 这样不同版本和环境可以共存而不互相影响
 *
 * 国内版:
 *   - 开发: minimax-agent-cn-config-dev, .minimax-agent-cn-dev
 *   - 测试: minimax-agent-cn-config-test, .minimax-agent-cn-test
 *   - 预发: minimax-agent-cn-config-staging, .minimax-agent-cn-staging
 *   - 线上: minimax-agent-cn-config, .minimax-agent-cn
 *
 * 海外版:
 *   - 开发: minimax-agent-config-dev, .minimax-agent-dev
 *   - 测试: minimax-agent-config-test, .minimax-agent-test
 *   - 预发: minimax-agent-config-staging, .minimax-agent-staging
 *   - 线上: minimax-agent-config, .minimax-agent
 */
function getEnvSuffix() {
    if (env_1.isProd)
        return '';
    if (env_1.isStaging)
        return '-staging';
    if (env_1.isTest)
        return '-test';
    if (env_1.isDev)
        return '-dev';
    return ''; // 默认为线上
}
const ENV_SUFFIX = getEnvSuffix();
const STORE_NAME = env_1.isZh
    ? `minimax-agent-cn-config${ENV_SUFFIX}`
    : `minimax-agent-config${ENV_SUFFIX}`;
const AGENT_DIR_NAME = env_1.isZh ? `.minimax-agent-cn${ENV_SUFFIX}` : `.minimax-agent${ENV_SUFFIX}`;
/**
 * 获取默认工作目录
 * 国内版:
 *   macOS: ~/.minimax-agent-cn/projects
 *   Windows: C:\Users\{用户名}\.minimax-agent-cn\projects
 * 海外版:
 *   macOS: ~/.minimax-agent/projects
 *   Windows: C:\Users\{用户名}\.minimax-agent\projects
 */
function getDefaultWorkingDirectory() {
    const homeDir = electron_1.app.getPath('home');
    const projectsDir = path_1.default.join(homeDir, AGENT_DIR_NAME, 'projects');
    // 如果目录不存在则创建
    if (!fs_1.default.existsSync(projectsDir)) {
        fs_1.default.mkdirSync(projectsDir, { recursive: true });
    }
    return projectsDir;
}
/**
 * 获取默认语言
 * 优先级：系统语言 > 构建时语言环境
 * 只支持 'en' 和 'zh' 两种语言
 */
function getDefaultLanguage() {
    // 获取系统语言（如 'en-US', 'zh-CN', 'zh-TW' 等）
    const systemLocale = electron_1.app.getLocale();
    // 如果系统语言以 'zh' 开头，使用中文
    if (systemLocale?.toLowerCase().startsWith('zh')) {
        return 'zh';
    }
    // 如果系统语言以 'en' 开头，使用英文
    if (systemLocale?.toLowerCase().startsWith('en')) {
        return 'en';
    }
    // 其他情况使用构建时的语言环境
    return env_1.LOCALE;
}
function getDefaultShortcut() {
    return {
        [constants_1.SHORTCUT_KEYS.MINI_CHAT_CREATE]: constants_1.DEFAULT_SHORTCUT.MINI_CHAT_CREATE,
    };
}
const defaultConfig = {
    language: getDefaultLanguage(),
    workingDirectory: getDefaultWorkingDirectory(),
    menuBarVisible: true,
    runOnStartup: true,
    globalAccessShortcut: getDefaultShortcut(),
    recentWorkspaces: [],
    maxRecentWorkspaces: 3,
    enableTabDevTools: env_1.isTest || env_1.isStaging,
    swimLaneName: '',
    chatPermissions: {},
    maxChatPermissions: 50,
    /** 是否开启定时任务通知, 默认开启 */
    scheduleNotification: true,
};
const defaultLocalStorageConfig = {
    showWebChatHistoryTips: true,
    isOnboardingCompleted: false,
};
// 创建 store 实例
const store = new electron_store_1.default({
    name: STORE_NAME,
    defaults: {
        user: {},
        config: defaultConfig,
        localStorageConfig: defaultLocalStorageConfig,
        tokens: {},
    },
});
/**
 * 获取 tokens
 */
function getTokens() {
    return store.get('tokens') || {};
}
/**
 * 保存 tokens
 */
function setTokens(tokens) {
    store.set('tokens', tokens);
}
/**
 * 清除 tokens
 */
function clearTokens() {
    store.set('tokens', {});
}
/**
 * 获取用户信息
 */
function getUserInfo() {
    return store.get('user') || {};
}
/**
 * 保存用户信息
 */
function setUserInfo(user) {
    store.set('user', { ...(getUserInfo() || {}), ...user });
}
/**
 * 清除用户信息
 */
function clearUserInfo() {
    store.set('user', {});
}
/**
 * 获取应用配置
 * 确保返回的配置包含所有必要的默认值
 */
function getDesktopConfig() {
    const config = store.get('config') || {};
    // 确保 workingDirectory 有默认值，或者目录不存在时重新创建
    if (!config.workingDirectory || !fs_1.default.existsSync(config.workingDirectory)) {
        config.workingDirectory = getDefaultWorkingDirectory();
        // 持久化修复后的值，避免每次都重新计算
        store.set('config', config);
    }
    if (!config.globalAccessShortcut) {
        config.globalAccessShortcut = getDefaultShortcut();
        store.set('config', config);
    }
    /** 确保 scheduleNotification 有默认值，或者目录不存在时重新创建 */
    if (config.scheduleNotification === undefined) {
        config.scheduleNotification = true;
        store.set('config', config);
    }
    return config;
}
/**
 * 更新应用配置
 */
function setDesktopConfig(config) {
    const current = getDesktopConfig();
    store.set('config', { ...current, ...config });
}
/**
 * 清除应用配置
 */
function clearDesktopConfig() {
    store.set('config', defaultConfig);
}
/**
 * 获取 localStorage 配置
 */
function getLocalStorageConfig() {
    return store.get('localStorageConfig') || {};
}
/**
 * 更新 localStorage 配置
 */
function setLocalStorageConfig(config) {
    const current = getLocalStorageConfig();
    store.set('localStorageConfig', { ...current, ...config });
}
/**
 * 清除 localStorage 配置
 */
function clearLocalStorageConfig() {
    store.set('localStorageConfig', defaultLocalStorageConfig);
}
/**
 * 清除所有数据（登出时调用）
 */
function clearAll() {
    clearTokens();
    clearUserInfo();
    clearLocalStorageConfig();
    clearDesktopConfig();
}
/**
 * 设置存储 IPC 处理器
 */
function setupStorageIPC() {
    // 使用 ipcMain.on + event.returnValue 实现同步通信
    electron_1.ipcMain.on(constants_1.IPC_CHANNELS.STORAGE_GET_LANGUAGE_SYNC, (event) => {
        const config = getDesktopConfig();
        event.returnValue = config.language || (env_1.isEn ? 'en' : 'zh');
    });
    // Token 相关
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_GET_TOKENS, () => {
        return getTokens();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_SET_TOKENS, (_, tokens) => {
        setTokens(tokens);
        return { success: true };
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_CLEAR_TOKENS, () => {
        clearTokens();
        return { success: true };
    });
    // 用户信息相关
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_GET_USER, () => {
        return getUserInfo();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_SET_USER, (_, user) => {
        setUserInfo(user);
        return { success: true };
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_CLEAR_USER, () => {
        clearUserInfo();
        return { success: true };
    });
    // 配置相关
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_GET_DESKTOP_CONFIG, () => {
        return getDesktopConfig();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_SET_DESKTOP_CONFIG, (_, config) => {
        setDesktopConfig(config);
        return { success: true };
    });
    // 清除所有数据
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_CLEAR_ALL, () => {
        clearAll();
        return { success: true };
    });
    // localStorage 配置相关
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_GET_LOCAL_STORAGE_CONFIG, () => {
        return getLocalStorageConfig();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_SET_LOCAL_STORAGE_CONFIG, (_, config) => {
        setLocalStorageConfig(config);
        return { success: true };
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.STORAGE_CLEAR_LOCAL_STORAGE_CONFIG, () => {
        clearLocalStorageConfig();
        return { success: true };
    });
}
