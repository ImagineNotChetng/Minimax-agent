"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowManager = void 0;
const storage_ipc_1 = require("../ipc/storage.ipc");
const heartbeat_1 = require("../modules/heartbeat");
const onboardingWindow_1 = require("./onboardingWindow");
const loginWindow_1 = require("./loginWindow");
const appWindow_1 = require("./appWindow");
const utils_1 = require("./utils");
const tabs_1 = require("../modules/tabs");
/** 所有窗口类型列表 */
const ALL_WINDOW_TYPES = ['onboarding', 'login', 'main'];
/**
 * WindowManager 类
 * 单例模式，管理应用主窗口的生命周期和状态切换
 */
class WindowManager {
    constructor() {
        /** 当前活跃窗口引用 */
        this.currentWindow = null;
        /** 当前活跃窗口类型 */
        this.currentWindowType = null;
        /** windowType -> BrowserWindow 映射 */
        this.windowsByType = new Map();
        /** windowId -> windowType 映射（用于通过 window.id 反查类型） */
        this.windowIdToType = new Map();
        /** 是否正在创建窗口（防止重复调用） */
        this.isCreatingWindow = false;
        /** 是否强制退出（渲染进程确认后设为 true） */
        this.forceQuit = false;
        // ==================== 窗口切换核心逻辑 ====================
        /** 窗口切换配置 */
        this.windowConfig = {
            main: {
                create: () => (0, appWindow_1.createAppWindow)(this.context),
                onSwitch: () => (0, heartbeat_1.initHeartbeat)(),
                beforeSwitch: () => {
                    (0, tabs_1.getTabController)().destroy();
                },
            },
            login: {
                create: () => (0, loginWindow_1.createLoginWindow)(this.context),
                onSwitch: () => (0, heartbeat_1.stopHeartbeat)(),
                beforeSwitch: () => {
                    (0, heartbeat_1.stopHeartbeat)();
                    (0, tabs_1.getTabController)().destroy();
                },
            },
            onboarding: {
                create: () => (0, onboardingWindow_1.createOnboardingWindow)(this.context),
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                onSwitch: () => { },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                beforeSwitch: () => { },
            },
        };
        this.context = {
            getWindow: () => this.currentWindow,
            setWindow: (window) => {
                this.currentWindow = window;
            },
            setWindowType: (type) => {
                this.currentWindowType = type;
                if (type && this.currentWindow) {
                    this.registerWindow(type, this.currentWindow);
                }
            },
            isForceQuit: () => this.forceQuit,
            setForceQuit: (value) => {
                this.forceQuit = value;
            },
        };
    }
    /** 获取单例实例 */
    static getInstance() {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }
    // ==================== 窗口注册与映射 ====================
    /** 注册窗口到映射表 */
    registerWindow(type, window) {
        // 清理旧的映射
        const oldWindow = this.windowsByType.get(type);
        if (oldWindow && oldWindow !== window) {
            this.windowIdToType.delete(oldWindow.id);
        }
        // 建立新的双向映射
        this.windowsByType.set(type, window);
        this.windowIdToType.set(window.id, type);
        // 监听窗口关闭事件，自动清理映射
        window.once('closed', () => {
            this.unregisterWindow(type, window.id);
        });
        console.log(`[WindowManager] Registered window: type=${type}, id=${window.id}`);
    }
    /** 从映射表中注销窗口 */
    unregisterWindow(type, windowId) {
        this.windowsByType.delete(type);
        this.windowIdToType.delete(windowId);
        if (this.currentWindowType === type) {
            this.currentWindow = null;
            this.currentWindowType = null;
        }
        console.log(`[WindowManager] Unregistered window: type=${type}, id=${windowId}`);
    }
    /** 检查指定类型的窗口是否已存在且有效 */
    hasValidWindow(type) {
        const window = this.windowsByType.get(type);
        return !!window && !window.isDestroyed();
    }
    /** 获取当前窗口（如果已销毁则返回 null 并清理） */
    getWindow() {
        if (this.currentWindow?.isDestroyed()) {
            if (this.currentWindowType) {
                this.windowsByType.delete(this.currentWindowType);
            }
            this.currentWindow = null;
            this.currentWindowType = null;
        }
        return this.currentWindow;
    }
    /** 获取当前窗口类型 */
    getWindowType() {
        return this.currentWindowType;
    }
    /** 根据类型获取窗口 */
    getWindowByType(type) {
        const window = this.windowsByType.get(type);
        if (window && !window.isDestroyed()) {
            return window;
        }
        // 窗口已销毁，清理映射
        if (window) {
            this.windowIdToType.delete(window.id);
            this.windowsByType.delete(type);
        }
        return null;
    }
    /** 根据窗口ID获取窗口类型 */
    getTypeByWindowId(windowId) {
        return this.windowIdToType.get(windowId) || null;
    }
    /** 根据窗口ID获取窗口 */
    getWindowById(windowId) {
        const type = this.windowIdToType.get(windowId);
        return type ? this.getWindowByType(type) : null;
    }
    // ==================== 窗口销毁 ====================
    /** 根据类型销毁窗口 */
    destroyWindowByType(type) {
        const window = this.windowsByType.get(type);
        if (window && !window.isDestroyed()) {
            (0, utils_1.destroyWindow)(window);
        }
    }
    /** 销毁除指定类型外的所有窗口 */
    destroyWindowsExcept(keepType) {
        for (const type of ALL_WINDOW_TYPES) {
            if (type !== keepType) {
                this.destroyWindowByType(type);
            }
        }
    }
    /** 销毁当前窗口 */
    destroyCurrentWindow() {
        if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            (0, utils_1.destroyWindow)(this.currentWindow);
        }
        this.currentWindow = null;
        this.currentWindowType = null;
    }
    /**
     * 通用窗口切换方法
     * @param targetType 目标窗口类型
     * @param waitEvent 等待的事件（用于延迟销毁旧窗口）
     */
    async switchToWindow(targetType, waitEvent = 'ready-to-show') {
        const config = this.windowConfig[targetType];
        // 如果目标窗口已存在，直接聚焦并销毁其他窗口
        if (this.hasValidWindow(targetType)) {
            console.log(`[WindowManager] ${targetType} window already exists, focusing`);
            this.focusWindowByType(targetType);
            this.destroyWindowsExcept(targetType);
            config.onSwitch();
            return;
        }
        // 执行切换前的准备工作
        config.beforeSwitch();
        // 记录旧窗口
        const oldWindow = this.currentWindow;
        // 清空当前窗口状态
        this.currentWindow = null;
        this.currentWindowType = null;
        try {
            // 创建新窗口
            await config.create();
            // 获取新窗口
            const newWindow = this.getWindowByType(targetType);
            // 销毁其他窗口的函数
            const destroyOthers = () => this.destroyWindowsExcept(targetType);
            // 等待新窗口准备好后再销毁旧窗口，避免闪烁
            if (newWindow && oldWindow && !oldWindow.isDestroyed()) {
                const handler = () => {
                    // 对于 main 窗口，额外延迟让 React 完成渲染
                    if (targetType === 'main') {
                        setTimeout(destroyOthers, 300);
                    }
                    else {
                        destroyOthers();
                    }
                };
                if (waitEvent === 'did-finish-load') {
                    newWindow.webContents.once('did-finish-load', handler);
                }
                else {
                    newWindow.once('ready-to-show', handler);
                }
            }
            else {
                destroyOthers();
            }
            // 执行切换后的回调
            config.onSwitch();
        }
        catch (error) {
            console.error(`[WindowManager] Failed to create ${targetType} window:`, error);
            // 尝试恢复旧窗口
            if (oldWindow && !oldWindow.isDestroyed()) {
                this.currentWindow = oldWindow;
                // 尝试推断旧窗口类型
                this.currentWindowType = this.windowIdToType.get(oldWindow.id) || null;
            }
            throw error;
        }
    }
    // ==================== 公开的窗口切换方法 ====================
    /** 检查是否已完成引导 */
    isOnboardingCompleted() {
        const config = (0, storage_ipc_1.getLocalStorageConfig)();
        return !!config.isOnboardingCompleted;
    }
    /** 创建初始窗口（根据引导状态和登录状态决定） */
    async createInitialWindow() {
        if (this.isCreatingWindow) {
            console.log('[WindowManager] createInitialWindow already in progress, skipping');
            return;
        }
        if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            console.log('[WindowManager] Window already exists, skipping createInitialWindow');
            return;
        }
        this.isCreatingWindow = true;
        try {
            if (!this.isOnboardingCompleted()) {
                if (this.hasValidWindow('onboarding')) {
                    this.focusWindowByType('onboarding');
                    return;
                }
                this.destroyCurrentWindow();
                await (0, onboardingWindow_1.createOnboardingWindow)(this.context);
            }
            else if ((0, storage_ipc_1.getApiKey)()) {
                if (this.hasValidWindow('main')) {
                    this.focusWindowByType('main');
                    return;
                }
                this.destroyCurrentWindow();
                await (0, appWindow_1.createAppWindow)(this.context);
                (0, heartbeat_1.initHeartbeat)();
            }
            else {
                if (this.hasValidWindow('login')) {
                    this.focusWindowByType('login');
                    return;
                }
                this.destroyCurrentWindow();
                await (0, loginWindow_1.createLoginWindow)(this.context);
            }
        }
        finally {
            this.isCreatingWindow = false;
        }
    }
    /** 切换到主窗口（登录成功后调用） */
    async switchToMainWindow() {
        await this.switchToWindow('main', 'did-finish-load');
    }
    /** 切换到登录窗口（登出或 token 过期时调用） */
    async switchToLoginWindow() {
        await this.switchToWindow('login', 'ready-to-show');
    }
    /** 切换到引导窗口 */
    async switchToOnboardingWindow() {
        if (this.hasValidWindow('onboarding')) {
            console.log('[WindowManager] Onboarding window already exists, focusing');
            this.focusWindowByType('onboarding');
            return;
        }
        this.destroyCurrentWindow();
        await (0, onboardingWindow_1.createOnboardingWindow)(this.context);
    }
    // ==================== 窗口操作 ====================
    /** 根据类型聚焦窗口 */
    focusWindowByType(type) {
        const window = this.getWindowByType(type);
        if (window && !window.isDestroyed()) {
            if (window.isMinimized())
                window.restore();
            window.show();
            window.focus();
            this.currentWindow = window;
            this.currentWindowType = type;
        }
    }
    /** 聚焦当前窗口 */
    focusWindow() {
        if (this.isWindowValid()) {
            if (this.currentWindow.isMinimized())
                this.currentWindow.restore();
            this.currentWindow.show();
            this.currentWindow.focus();
        }
    }
    /** 显示当前窗口 */
    showWindow() {
        if (this.isWindowValid())
            this.currentWindow.show();
    }
    /** 隐藏当前窗口 */
    hideWindow() {
        if (this.isWindowValid())
            this.currentWindow.hide();
    }
    /** 最小化当前窗口 */
    minimizeWindow() {
        if (this.isWindowValid())
            this.currentWindow.minimize();
    }
    /** 最大化/还原当前窗口 */
    toggleMaximize() {
        if (this.isWindowValid()) {
            if (this.currentWindow.isMaximized()) {
                this.currentWindow.unmaximize();
            }
            else {
                this.currentWindow.maximize();
            }
        }
    }
    /** 关闭当前窗口 */
    closeWindow() {
        if (this.isWindowValid())
            this.currentWindow.close();
    }
    // ==================== 窗口状态查询 ====================
    /** 检查窗口是否存在且有效 */
    isWindowValid() {
        return !!this.currentWindow && !this.currentWindow.isDestroyed();
    }
    /** 检查窗口是否可见 */
    isWindowVisible() {
        return this.isWindowValid() && this.currentWindow.isVisible();
    }
    /** 检查窗口是否聚焦 */
    isWindowFocused() {
        return this.isWindowValid() && this.currentWindow.isFocused();
    }
    /** 检查窗口是否最大化 */
    isWindowMaximized() {
        return this.isWindowValid() && this.currentWindow.isMaximized();
    }
    /** 检查窗口是否全屏 */
    isWindowFullScreen() {
        return this.isWindowValid() && this.currentWindow.isFullScreen();
    }
    /** 向当前窗口发送消息 */
    sendToWindow(channel, ...args) {
        if (this.isWindowValid()) {
            this.currentWindow.webContents.send(channel, ...args);
        }
    }
    /** 获取所有已注册窗口的信息（用于调试） */
    getRegisteredWindows() {
        return Array.from(this.windowsByType.entries()).map(([type, window]) => ({
            type,
            id: window.id,
            isDestroyed: window.isDestroyed(),
        }));
    }
    /** 设置强制退出标志 */
    setForceQuit(value) {
        this.forceQuit = value;
    }
    /** 获取强制退出标志 */
    isForceQuit() {
        return this.forceQuit;
    }
}
WindowManager.instance = null;
// 导出单例
exports.windowManager = WindowManager.getInstance();
