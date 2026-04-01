"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAgentIPC = setupAgentIPC;
/**
 * Agent Browser Controller IPC 处理
 * 每个 Tab 对应一个独立的 browser agent view
 */
const electron_1 = require("electron");
const browser_agent_manager_1 = require("../modules/browser/browser-agent-manager");
const tabs_1 = require("../modules/tabs");
const manager_1 = require("../windows/manager");
const constants_1 = require("../config/constants");
/**
 * 通过 IPC event 获取对应的 tabId
 */
function getTabIdFromEvent(event) {
    const tabController = (0, tabs_1.getTabController)();
    return tabController.getTabIdByWebContentsId(event.sender.id);
}
/**
 * 设置 Agent Browser Controller IPC 处理器
 */
function setupAgentIPC(getMainWindow) {
    const manager = (0, browser_agent_manager_1.getBrowserAgentManager)();
    const tabController = (0, tabs_1.getTabController)();
    // 设置父窗口
    const mainWindow = getMainWindow();
    if (mainWindow) {
        manager.setParentWindow(mainWindow);
    }
    // 监听 Tab 激活事件
    tabController.onTabActivated((tabId) => {
        manager.setActiveTab(tabId);
    });
    // 如果已经有活动的 Tab，立即设置 activeTabId
    // 这是因为第一个 Tab 可能在 setupAgentIPC 之前就已经创建并激活了
    const currentState = tabController.getState();
    if (currentState.activeTabId) {
        manager.setActiveTab(currentState.activeTabId);
    }
    // 监听 Tab 关闭事件
    tabController.onTabClosed((tabId) => {
        manager.destroyInstance(tabId);
    });
    // ============================================
    // 生命周期
    // ============================================
    // 创建浏览器视图
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_CREATE, async (event, bounds) => {
        // 优先使用 windowManager.getWindowByType('main')，确保获取到正确的主窗口
        // 这在窗口切换期间更可靠，因为 getMainWindow() 可能返回 null
        const mainWindow = manager_1.windowManager.getWindowByType('main') || getMainWindow();
        if (!mainWindow) {
            return { success: false, error: 'Main window not found' };
        }
        if (!manager.getParentWindow()) {
            manager.setParentWindow(mainWindow);
        }
        const tabId = getTabIdFromEvent(event);
        if (!tabId) {
            return { success: false, error: 'Cannot determine tab ID' };
        }
        const instance = manager.getOrCreateInstance(tabId);
        // 保存 bounds
        manager.saveBounds(tabId, bounds);
        // 创建 BrowserView
        const result = await instance.browserController.create(mainWindow, bounds);
        if (!result.success) {
            return result;
        }
        // 标记已创建
        manager.markCreated(tabId);
        // 创建后重新调整层级，确保激活 Tab 的 view 在最上层
        // 层级顺序（从底至上）：Tab View -> Browser View -> Overlay
        const activeTabId = manager.getActiveTabId();
        if (activeTabId) {
            // 1. 先把激活 Tab 的 Tab View 移到最上层
            tabController.bringActiveTabToFront();
            // 2. 如果激活 Tab 有 Browser View 和 Overlay，也移到最上层
            const activeInstance = manager.getInstance(activeTabId);
            if (activeInstance?.isCreated) {
                activeInstance.browserController.bringToFront();
                activeInstance.overlayController.bringToFront();
            }
        }
        return result;
    });
    // 销毁浏览器视图
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_DESTROY, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId) {
            return { success: false, error: 'Cannot determine tab ID' };
        }
        return manager.destroyInstance(tabId);
    });
    // 获取状态
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_GET_STATE, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.getState();
    });
    // 设置边界
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_SET_BOUNDS, async (event, bounds) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId) {
            return { success: false, error: 'Cannot determine tab ID' };
        }
        manager.updateBounds(tabId, bounds);
        return { success: true };
    });
    // 设置缩放
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_SET_ZOOM, async (event, factor) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.setZoomFactor(factor);
    });
    // ============================================
    // 导航
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_NAVIGATE, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.navigate(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_GO_BACK, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.goBack();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_GO_FORWARD, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.goForward();
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_RELOAD, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.reload();
    });
    // ============================================
    // 交互
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_CLICK, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.click(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_TYPE, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.type(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_PRESS_KEY, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.pressKey(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_SCROLL, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.scroll(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_HOVER, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.hover(params);
    });
    // ============================================
    // 获取信息
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_SCREENSHOT, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.screenshot(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_GET_DOM, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.getDOM(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_HTML_TO_MARKDOWN, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.htmlToMarkdown(params);
    });
    // ============================================
    // 高级
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_WAIT_FOR, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.waitFor(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_EVALUATE, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getBrowserController(tabId);
        if (!controller)
            return { success: false, error: 'Browser not created' };
        return controller.evaluate(params);
    });
    // ============================================
    // 覆盖层
    // ============================================
    // 创建覆盖层
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_OVERLAY_CREATE, async (event, params) => {
        // 优先使用 windowManager.getWindowByType('main')，确保获取到正确的主窗口
        const mainWindow = manager_1.windowManager.getWindowByType('main') || getMainWindow();
        if (!mainWindow) {
            return { success: false, error: 'Main window not found' };
        }
        const tabId = getTabIdFromEvent(event);
        if (!tabId) {
            return { success: false, error: 'Cannot determine tab ID' };
        }
        const instance = manager.getInstance(tabId);
        if (!instance) {
            return { success: false, error: 'Browser agent not created' };
        }
        const result = await instance.overlayController.create(mainWindow, params.bounds);
        if (!result.success) {
            return result;
        }
        // 创建后重新调整层级，确保激活 Tab 的 view 在最上层
        // 层级顺序（从底至上）：Tab View -> Browser View -> Overlay
        const activeTabId = manager.getActiveTabId();
        if (activeTabId) {
            // 1. 先把激活 Tab 的 Tab View 移到最上层
            tabController.bringActiveTabToFront();
            // 2. 如果激活 Tab 有 Browser View 和 Overlay，也移到最上层
            const activeInstance = manager.getInstance(activeTabId);
            if (activeInstance?.isCreated) {
                activeInstance.browserController.bringToFront();
                activeInstance.overlayController.bringToFront();
            }
        }
        return result;
    });
    // 销毁覆盖层
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_OVERLAY_DESTROY, async (event) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getOverlayController(tabId);
        if (!controller)
            return { success: false, error: 'Overlay not created' };
        return controller.destroy();
    });
    // 设置覆盖层边界
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_OVERLAY_SET_BOUNDS, async (event, bounds) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId) {
            return { success: false, error: 'Cannot determine tab ID' };
        }
        const instance = manager.getInstance(tabId);
        if (!instance) {
            return { success: false, error: 'Browser agent not created' };
        }
        // 只有活动 Tab 才更新实际位置
        if (tabId === manager.getActiveTabId()) {
            instance.overlayController.setBounds(bounds);
        }
        return { success: true };
    });
    // 显示操作反馈
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BROWSER_OVERLAY_SHOW_FEEDBACK, async (event, params) => {
        const tabId = getTabIdFromEvent(event);
        if (!tabId)
            return { success: false, error: 'Cannot determine tab ID' };
        const controller = manager.getOverlayController(tabId);
        if (!controller)
            return { success: false, error: 'Overlay not created' };
        return controller.showActionFeedback(params);
    });
}
