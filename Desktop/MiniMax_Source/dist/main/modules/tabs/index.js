"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabController = exports.MAX_TABS = void 0;
exports.getTabController = getTabController;
/**
 * Tab Controller
 * 管理多个 WebContentsView 实例，实现多 Tab 功能
 *
 * 设计说明：
 * - 所有 Tab 都是独立的 WebContentsView
 * - 每个 Tab 加载应用自身的 URL（默认加载首页）
 * - 主窗口只包含 Tab 栏，内容区域由 WebContentsView 填充
 * - 最多支持 MAX_TABS 个 Tab
 */
const electron_1 = require("electron");
const routes_1 = require("../../config/routes");
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const constants_1 = require("../../config/constants");
const storage_ipc_1 = require("../../ipc/storage.ipc");
const utils_1 = require("../../windows/utils");
const windows_1 = require("../../windows");
/** 最大 Tab 数量 */
exports.MAX_TABS = 10;
/**
 * Tab 控制器
 * 管理多个 WebContentsView，支持创建、切换、关闭 Tab
 */
class TabController {
    constructor() {
        this.tabs = new Map();
        // webContentsId -> tabId 映射，用于通过 IPC event.sender.id 找到对应的 tab
        this.webContentsIdToTabId = new Map();
        // tabId -> parentChatId 映射，用于追踪每个 Tab 打开的对话
        this.tabParentChatIds = new Map();
        // tabId -> 是否是 OpenClaw 页面（介绍页或对话页）
        // 由渲染进程通过 IPC 设置，因为 OpenClaw 对话页路由是 /chat，无法通过 URL 判断
        this.tabIsOpenClaw = new Map();
        this.activeTabId = null;
        this.parentWindow = null;
        this.bounds = {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        };
        this.preloadPath = '';
        // Tab 激活事件回调
        this.onTabActivatedCallback = null;
        // Tab 关闭事件回调
        this.onTabClosedCallback = null;
    }
    /**
     * 初始化控制器
     * 注意：每次初始化时会清除已有的 tabs，防止页面 reload 时产生重复 tab
     */
    init(parentWindow, bounds, preloadPath) {
        try {
            // 验证 bounds 有效性：y > 0 确保内容区域在 Tab 栏下方
            if (bounds.y <= 0) {
                return { success: false, error: 'Invalid bounds: y should be > 0' };
            }
            // 先销毁已有的 tabs，防止 reload 时产生重复
            this.destroy();
            this.parentWindow = parentWindow;
            this.bounds = bounds;
            // 设置 preload 脚本路径
            if (preloadPath) {
                this.preloadPath = preloadPath;
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 设置 Tab 激活事件回调
     */
    onTabActivated(callback) {
        this.onTabActivatedCallback = callback;
    }
    /**
     * 设置 Tab 关闭事件回调
     */
    onTabClosed(callback) {
        this.onTabClosedCallback = callback;
    }
    /**
     * 通过 webContentsId 获取 tabId
     */
    getTabIdByWebContentsId(webContentsId) {
        return this.webContentsIdToTabId.get(webContentsId) || null;
    }
    /**
     * 设置 Tab 的 parentChatId
     * 当用户在某个 Tab 中打开对话时调用
     * @param tabId - Tab ID
     * @param parentChatId - sidebar chathistory 里的 chat_id，null 表示清除
     */
    setTabParentChatId(tabId, parentChatId) {
        if (!this.tabs.has(tabId)) {
            return { success: false, error: 'Tab not found' };
        }
        if (parentChatId === null) {
            this.tabParentChatIds.delete(tabId);
        }
        else {
            this.tabParentChatIds.set(tabId, parentChatId);
        }
        // 发送状态更新，让渲染进程知道 parentChatId 已更新
        this.sendStateUpdate();
        return { success: true };
    }
    /**
     * 获取 Tab 的 parentChatId
     */
    getTabParentChatId(tabId) {
        return this.tabParentChatIds.get(tabId) || null;
    }
    /**
     * 通过 parentChatId 查找已打开该对话的 Tab
     * @param parentChatId - 要查找的 parentChatId
     * @returns 找到的 tabId，如果没有找到则返回 null
     */
    findTabByParentChatId(parentChatId) {
        for (const [tabId, chatId] of this.tabParentChatIds) {
            if (chatId === parentChatId && this.tabs.has(tabId)) {
                return tabId;
            }
        }
        return null;
    }
    /**
     * 生成唯一 Tab ID
     */
    generateTabId() {
        return (0, uuid_1.v4)();
    }
    /**
     * 检查 contentView 是否可用（窗口和 contentView 都未被销毁）
     */
    get contentView() {
        if (!this.parentWindow || this.parentWindow.isDestroyed() || !this.parentWindow.contentView) {
            return null;
        }
        return this.parentWindow.contentView;
    }
    /**
     * 安全地从 contentView 中移除 view
     */
    safeRemoveFromContentView(view) {
        const cv = this.contentView;
        if (!cv)
            return;
        try {
            cv.removeChildView(view);
        }
        catch {
            // 可能已不在 children 中
        }
    }
    /**
     * 安全地将 view 添加到 contentView（添加到最上层）
     */
    safeAddToContentView(view) {
        const cv = this.contentView;
        if (!cv)
            return;
        cv.addChildView(view);
    }
    /**
     * 将 view 移动到 contentView 的最上层
     * 通过先移除再添加实现
     */
    bringViewToFront(view) {
        const cv = this.contentView;
        if (!cv)
            return;
        this.safeRemoveFromContentView(view);
        cv.addChildView(view);
    }
    /**
     * 隐藏 view（从 contentView 中移除，避免拦截事件）
     */
    hideView(view) {
        if (view?.webContents?.isDestroyed?.())
            return;
        this.safeRemoveFromContentView(view);
    }
    /**
     * 显示 view（添加回 contentView 并移到最上层）
     */
    showView(view) {
        if (view?.webContents?.isDestroyed?.() || !this.contentView)
            return;
        // 移到最上层
        this.bringViewToFront(view);
        view.setBounds(this.bounds);
    }
    /**
     * 设置事件监听
     * 只监听关键事件：开始加载、加载完成、标题更新
     */
    setupEventListeners(tabId, view) {
        const wc = view.webContents;
        // 开始加载 - 更新状态（让渲染进程显示 Loading 组件）
        wc.on('did-start-loading', () => {
            if (wc.isDestroyed())
                return;
            this.sendStateUpdate();
        });
        // 停止加载 - 更新状态（让渲染进程隐藏 Loading 组件）
        wc.on('did-stop-loading', () => {
            if (wc.isDestroyed())
                return;
            this.sendStateUpdate();
        });
        // 标题更新 - 通知渲染进程更新 Tab 栏显示
        wc.on('page-title-updated', () => {
            if (wc.isDestroyed())
                return;
            this.sendStateUpdate();
        });
        // 拦截新窗口打开，在当前 tab 中导航
        wc.setWindowOpenHandler(({ url }) => {
            if (wc.isDestroyed())
                return { action: 'deny' };
            wc.loadURL(url);
            return { action: 'deny' };
        });
    }
    /**
     * 发送状态更新
     */
    sendStateUpdate() {
        // 检查窗口是否已被销毁
        if (!this.parentWindow ||
            this.parentWindow.isDestroyed() ||
            this.parentWindow.webContents?.isDestroyed?.()) {
            return;
        }
        try {
            const state = this.getState();
            this.parentWindow.webContents.send(constants_1.IPC_CHANNELS.TAB_BROWSER_STATE_UPDATED, state);
        }
        catch {
            // 窗口可能已被销毁
        }
    }
    /**
     * 创建新 Tab
     * @param url - 可选，要加载的 URL，默认加载应用首页
     */
    async createTab(url) {
        if (!this.parentWindow) {
            return { success: false, error: 'Controller not initialized' };
        }
        // 检查是否达到最大 Tab 数量
        if (this.tabs.size >= exports.MAX_TABS) {
            // 发送消息给渲染进程，提示达到最大 Tab 数量
            electron_1.dialog.showErrorBox('Maximum tab limit', `Maximum tab limit (${exports.MAX_TABS}) reached`);
            return { success: false, error: `Maximum tab limit (${exports.MAX_TABS}) reached` };
        }
        try {
            const tabId = this.generateTabId();
            // 创建 WebContentsView，使用与主窗口相同的 preload 脚本
            const view = new electron_1.WebContentsView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: false, // 需要关闭 sandbox 才能使用 preload
                    webSecurity: true,
                    preload: this.preloadPath || undefined,
                    webviewTag: true,
                    // 缺少: backgroundThrottling: false
                },
            });
            // 设置背景色，避免暗黑模式下白色闪烁
            view.setBackgroundColor((0, utils_1.getBackgroundColor)(electron_1.nativeTheme.shouldUseDarkColors));
            // 存储到 Map
            this.tabs.set(tabId, view);
            // 存储 webContentsId -> tabId 映射
            this.webContentsIdToTabId.set(view.webContents.id, tabId);
            // 设置事件监听
            this.setupEventListeners(tabId, view);
            // 立即激活这个 Tab（不等待加载完成，让用户看到 loading 状态）
            this.activateTab(tabId);
            // 加载 URL - 默认加载应用首页（不阻塞，让页面在后台加载）
            const targetUrl = url || (0, routes_1.getPageURL)(routes_1.ROUTES.HOME);
            view.webContents.loadURL(targetUrl);
            this.sendStateUpdate();
            return { success: true, tabId };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 关闭 Tab
     * 注意：至少要保留一个 Tab
     */
    closeTab(tabId) {
        const view = this.tabs.get(tabId);
        if (!view) {
            return { success: false, error: 'Tab not found' };
        }
        // 至少保留一个 Tab
        if (this.tabs.size <= 1) {
            // 最后一个tab的时候最小化
            // 如果窗口处于全屏模式，需要先退出全屏才能最小化（macOS 限制）
            if (windows_1.windowManager.isWindowFullScreen()) {
                this.parentWindow?.setFullScreen(false);
                // 等待退出全屏动画完成后再最小化
                this.parentWindow?.once('leave-full-screen', () => {
                    windows_1.windowManager.minimizeWindow();
                });
            }
            else {
                windows_1.windowManager.minimizeWindow();
            }
            return { success: true };
        }
        try {
            // 如果是当前激活的 Tab，需要切换到其他 Tab
            if (this.activeTabId === tabId) {
                const tabIds = Array.from(this.tabs.keys());
                const currentIndex = tabIds.indexOf(tabId);
                // 尝试切换到前一个 Tab（更符合用户习惯）
                let nextTabId = null;
                if (currentIndex > 0) {
                    nextTabId = tabIds[currentIndex - 1];
                }
                else if (tabIds.length > 1) {
                    nextTabId = tabIds[currentIndex + 1];
                }
                // 先隐藏当前 view
                this.safeRemoveFromContentView(view);
                // 切换到下一个 Tab
                if (nextTabId) {
                    this.activateTab(nextTabId);
                }
            }
            else {
                // 不是激活的 Tab，直接移除
                this.safeRemoveFromContentView(view);
            }
            // 清理 webContentsId -> tabId 映射
            this.webContentsIdToTabId.delete(view.webContents.id);
            // 清理 parentChatId 映射
            this.tabParentChatIds.delete(tabId);
            // 清理 OpenClaw 标记
            this.tabIsOpenClaw.delete(tabId);
            // 从 Map 中移除
            this.tabs.delete(tabId);
            // 触发 Tab 关闭回调（用于清理 browser agent view）
            if (this.onTabClosedCallback) {
                this.onTabClosedCallback(tabId);
            }
            this.sendStateUpdate();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 激活 Tab
     */
    activateTab(tabId) {
        const view = this.tabs.get(tabId);
        if (!view) {
            return { success: false, error: 'Tab not found' };
        }
        if (!this.parentWindow) {
            return { success: false, error: 'Controller not initialized' };
        }
        try {
            // 检查窗口是否可用
            if (!this.contentView) {
                return { success: false, error: 'Parent window is destroyed' };
            }
            // 关闭旧 Tab 的 DevTools（不移除 view，让它保持在底层被覆盖）
            if (this.activeTabId && this.activeTabId !== tabId) {
                const currentView = this.tabs.get(this.activeTabId);
                if (currentView && !currentView.webContents?.isDestroyed?.()) {
                    // 开发环境下关闭旧 Tab 的 DevTools
                    if (env_1.isDev && currentView.webContents.isDevToolsOpened()) {
                        currentView.webContents.closeDevTools();
                    }
                    // 不移除 view，它会自然被新激活的 Tab 覆盖
                }
            }
            // 检查要激活的 view 是否已被销毁
            if (view.webContents?.isDestroyed?.()) {
                return { success: false, error: 'View is destroyed' };
            }
            // 显示新的 Tab（将整组 view 移到最上层）
            // 层级顺序（从底至上）：Tab View -> Browser View -> Overlay
            this.activeTabId = tabId;
            // 1. 先把 Tab View 移到最上层
            this.bringViewToFront(view);
            view.setBounds(this.bounds);
            // 2. 然后触发 Tab 激活回调，让 BrowserAgentManager 把 Browser View 和 Overlay 移到 Tab View 之上
            if (this.onTabActivatedCallback) {
                this.onTabActivatedCallback(tabId);
            }
            // 3. 向被激活的 Tab 发送 tab-activated 事件，让它刷新数据（如对话历史）
            if (!view.webContents.isDestroyed()) {
                view.webContents.send(constants_1.IPC_CHANNELS.TAB_BROWSER_TAB_ACTIVATED, { tabId });
            }
            // 根据配置决定是否打开当前激活 Tab 的 DevTools（dock 到右侧）
            const config = (0, storage_ipc_1.getDesktopConfig)();
            if ((env_1.isDev || (config.enableTabDevTools && (env_1.isTest || env_1.isStaging))) &&
                !view.webContents.isDevToolsOpened()) {
                view.webContents.openDevTools({ mode: 'right' });
            }
            this.sendStateUpdate();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 将激活 Tab 的 view 移到最上层
     * 用于其他 Tab 创建新 view 后，确保激活 Tab 的内容不被覆盖
     */
    bringActiveTabToFront() {
        if (!this.activeTabId)
            return;
        const view = this.tabs.get(this.activeTabId);
        if (view && !view.webContents?.isDestroyed?.()) {
            this.bringViewToFront(view);
        }
    }
    /**
     * 设置当前 tab 是否是 OpenClaw 页面
     * 由渲染进程调用，因为 OpenClaw 对话页路由是 /chat，无法通过 URL 判断
     */
    setIsOpenClawTab(tabId, isOpenClaw) {
        if (isOpenClaw) {
            this.tabIsOpenClaw.set(tabId, true);
        }
        else {
            this.tabIsOpenClaw.delete(tabId);
        }
    }
    /**
     * 获取当前激活的 tab 是否是 OpenClaw 页面
     */
    getIsOpenClawTab() {
        if (!this.activeTabId)
            return false;
        return this.tabIsOpenClaw.get(this.activeTabId) || false;
    }
    /**
     * 查找已打开 OpenClaw 页面的 Tab
     * @returns 找到的 tabId，如果没有找到则返回 null
     */
    findOpenClawTab() {
        for (const tabId of this.tabIsOpenClaw.keys()) {
            if (this.tabs.has(tabId)) {
                return tabId;
            }
        }
        return null;
    }
    /**
     * 更新边界
     * 注意：只接受有效的 bounds（y > 0，确保不覆盖 Tab 栏）
     */
    setBounds(bounds) {
        // 验证 bounds 有效性：y > 0 确保内容区域在 Tab 栏下方
        if (bounds.y <= 0) {
            return;
        }
        this.bounds = bounds;
        // 更新当前激活 Tab 的边界
        if (this.activeTabId) {
            const view = this.tabs.get(this.activeTabId);
            view?.setBounds(bounds);
        }
    }
    /**
     * 根据 URL 获取默认标题
     */
    getDefaultTitleByUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            // 首页
            if (pathname === '/' || pathname === '') {
                return 'Home';
            }
            // Chat 页面 - 显示 "Chat" 作为默认标题
            if (pathname === '/chat' || pathname.startsWith('/chat')) {
                return 'Chat';
            }
            // 其他页面使用路径名
            return 'Home';
        }
        catch {
            return 'Home';
        }
    }
    /**
     * 获取单个 Tab 信息
     */
    getTabInfo(tabId) {
        const view = this.tabs.get(tabId);
        if (!view)
            return null;
        const wc = view.webContents;
        if (wc.isDestroyed())
            return null;
        const url = wc.getURL();
        const pageTitle = wc.getTitle();
        // 使用页面标题，如果没有则根据 URL 给出默认标题
        const title = pageTitle || this.getDefaultTitleByUrl(url);
        return {
            id: tabId,
            title,
            url,
            isLoading: wc.isLoading(),
            parentChatId: this.tabParentChatIds.get(tabId) || null,
        };
    }
    /**
     * 获取所有 Tab 状态
     */
    getState() {
        const tabs = [];
        for (const tabId of this.tabs.keys()) {
            const info = this.getTabInfo(tabId);
            if (info) {
                tabs.push(info);
            }
        }
        return {
            tabs,
            activeTabId: this.activeTabId,
        };
    }
    /**
     * 销毁所有 Tab
     */
    destroy() {
        try {
            for (const [tabId, view] of this.tabs) {
                // 安全地从窗口移除 view
                this.safeRemoveFromContentView(view);
                // 清理 webContentsId 映射（检查 webContents 是否已销毁）
                if (!view.webContents?.isDestroyed?.()) {
                    this.webContentsIdToTabId.delete(view.webContents.id);
                }
                // 触发 Tab 关闭回调
                if (this.onTabClosedCallback) {
                    this.onTabClosedCallback(tabId);
                }
            }
            this.tabs.clear();
            this.webContentsIdToTabId.clear();
            this.tabParentChatIds.clear();
            this.activeTabId = null;
            // 重置 parentWindow，确保下次 init 时使用新的窗口
            this.parentWindow = null;
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 获取当前激活 Tab 的 WebContents
     * 用于向当前 Tab 发送消息
     */
    getActiveWebContents() {
        // 检查 parentWindow 是否有效，避免在窗口切换过程中返回旧的 WebContents
        if (!this.parentWindow || this.parentWindow.isDestroyed()) {
            return null;
        }
        if (!this.activeTabId) {
            return null;
        }
        const view = this.tabs.get(this.activeTabId);
        if (!view) {
            return null;
        }
        if (view.webContents.isDestroyed()) {
            return null;
        }
        return view.webContents;
    }
    /**
     * 获取当前激活的 Tab ID
     */
    getActiveTabId() {
        return this.activeTabId;
    }
    /**
     * 获取当前激活的 Tab 的 WebContentsView
     */
    getActiveTabView() {
        if (!this.activeTabId)
            return null;
        return this.tabs.get(this.activeTabId) || null;
    }
    /**
     * 获取父窗口（用于验证 TabController 绑定的窗口）
     */
    getParentWindow() {
        return this.parentWindow;
    }
    /**
     * 通过 tabId 获取 Tab 的 WebContentsView
     */
    getTabView(tabId) {
        return this.tabs.get(tabId) || null;
    }
    /**
     * 请求关闭 Tab（带确认流程）
     * 获取目标 Tab 的 parentChatId，然后向当前激活的 Tab 发送确认事件
     * 让激活 Tab 的渲染进程去检查是否有运行中的任务并显示确认弹窗
     * @param tabId - 要关闭的 Tab ID
     * @returns parentChatId 如果有的话，null 表示该 tab 没有关联的对话（可直接关闭）
     */
    requestCloseTab(tabId) {
        const parentChatId = this.tabParentChatIds.get(tabId) || null;
        return { parentChatId };
    }
    /**
     * 向当前激活的 Tab 发送确认关闭事件
     * 让激活 Tab 的渲染进程显示确认弹窗
     * @param tabId - 要关闭的 Tab ID
     * @param parentChatId - 要关闭的 Tab 关联的 parentChatId
     */
    sendConfirmCloseTabToActiveTab(tabId, parentChatId) {
        if (!this.activeTabId)
            return;
        const activeView = this.tabs.get(this.activeTabId);
        if (!activeView || activeView.webContents?.isDestroyed?.())
            return;
        activeView.webContents.send(constants_1.IPC_CHANNELS.TAB_BROWSER_CONFIRM_CLOSE_TAB, {
            tabId,
            parentChatId,
        });
    }
    /**
     * 请求关闭当前激活的 Tab（带确认弹窗）
     * 如果有关联的 parentChatId，会发送确认事件给渲染进程显示弹窗
     * 如果没有，直接关闭（最后一个 tab 时会最小化窗口）
     */
    requestCloseActiveTab() {
        if (!this.activeTabId) {
            return { success: false, error: 'No active tab' };
        }
        const tabId = this.activeTabId;
        // 只有一个 Tab 时，直接走 closeTab 逻辑（会最小化窗口）
        if (this.tabs.size <= 1) {
            return this.closeTab(tabId);
        }
        const { parentChatId } = this.requestCloseTab(tabId);
        if (parentChatId) {
            // 有关联的对话，发送确认事件给渲染进程
            this.sendConfirmCloseTabToActiveTab(tabId, parentChatId);
            return { success: true };
        }
        // 没有关联的对话，直接关闭
        return this.closeTab(tabId);
    }
    /**
     * 关闭当前激活的 Tab（不带确认弹窗，直接关闭）
     * 与点击 Tab 关闭按钮行为一致
     */
    closeActiveTab() {
        if (!this.activeTabId) {
            return { success: false, error: 'No active tab' };
        }
        return this.closeTab(this.activeTabId);
    }
}
exports.TabController = TabController;
// 全局实例
let tabController = null;
/**
 * 获取或创建 TabController 实例
 */
function getTabController() {
    if (!tabController) {
        tabController = new TabController();
    }
    return tabController;
}
