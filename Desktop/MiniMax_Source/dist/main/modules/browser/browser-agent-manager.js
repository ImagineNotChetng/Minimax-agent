"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAgentManager = void 0;
exports.getBrowserAgentManager = getBrowserAgentManager;
const controller_1 = require("./controller");
const overlay_controller_1 = require("./overlay-controller");
const DEFAULT_BOUNDS = { x: 0, y: 0, width: 800, height: 600 };
/**
 * Browser Agent Manager
 */
class BrowserAgentManager {
    constructor() {
        this.instances = new Map();
        this.activeTabId = null;
        this.parentWindow = null;
    }
    setParentWindow(window) {
        this.parentWindow = window;
    }
    getParentWindow() {
        return this.parentWindow;
    }
    getActiveTabId() {
        return this.activeTabId;
    }
    /**
     * 获取或创建实例（只创建 JS 对象，不创建 WebContentsView）
     */
    getOrCreateInstance(tabId) {
        let instance = this.instances.get(tabId);
        if (!instance) {
            instance = {
                browserController: new controller_1.BrowserController(),
                overlayController: new overlay_controller_1.OverlayController(),
                savedBounds: { ...DEFAULT_BOUNDS },
                isCreated: false,
            };
            this.instances.set(tabId, instance);
        }
        return instance;
    }
    getInstance(tabId) {
        return this.instances.get(tabId) || null;
    }
    getBrowserController(tabId) {
        return this.instances.get(tabId)?.browserController || null;
    }
    getOverlayController(tabId) {
        return this.instances.get(tabId)?.overlayController || null;
    }
    /**
     * 标记实例的 WebContentsView 已创建
     */
    markCreated(tabId) {
        const instance = this.instances.get(tabId);
        if (instance) {
            instance.isCreated = true;
        }
    }
    /**
     * 保存 bounds（只保存有效位置）
     */
    saveBounds(tabId, bounds) {
        const instance = this.instances.get(tabId);
        if (!instance)
            return;
        // 只保存有效位置（不是屏幕外的隐藏位置）
        if (bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0) {
            instance.savedBounds = { ...bounds };
        }
    }
    /**
     * 设置活动 Tab
     * 通过 bringToFront 将激活 Tab 的 view 移到 contentView 的最上层
     * 非激活 Tab 的 view 保持原位，会被激活 Tab 的内容自然覆盖
     */
    setActiveTab(tabId) {
        this.activeTabId = tabId;
        // 将激活 Tab 的 Browser View 和 Overlay 移到最上层
        if (tabId) {
            const instance = this.instances.get(tabId);
            if (instance?.isCreated) {
                // 确保在最上层（先 Browser View，再 Overlay）
                instance.browserController.bringToFront();
                instance.overlayController.bringToFront();
            }
        }
    }
    /**
     * 更新 bounds
     * 所有 Tab 的 view 都更新位置（它们都在 contentView 中，共享相同的位置）
     */
    updateBounds(tabId, bounds) {
        const instance = this.instances.get(tabId);
        if (!instance)
            return;
        // 保存有效位置
        this.saveBounds(tabId, bounds);
        // 更新实际位置
        if (instance.isCreated) {
            instance.browserController.setBounds(bounds);
            instance.overlayController.setBounds(bounds);
        }
    }
    /**
     * 销毁实例（仅销毁 BrowserView，不影响 activeTabId）
     * 用于同一个 Tab 下重新创建 BrowserView 的情况
     */
    destroyInstance(tabId) {
        const instance = this.instances.get(tabId);
        if (!instance) {
            return { success: true };
        }
        try {
            if (instance.isCreated) {
                instance.browserController.destroy();
                instance.overlayController.destroy();
            }
            this.instances.delete(tabId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    destroyAll() {
        try {
            for (const tabId of this.instances.keys()) {
                this.destroyInstance(tabId);
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    hasInstance(tabId) {
        return this.instances.has(tabId);
    }
    /**
     * 通过 Overlay 的 webContentsId 找到对应的 tabId
     * 用于 Overlay 发送 IPC 消息时，找到对应的 Tab
     */
    getTabIdByOverlayWebContentsId(webContentsId) {
        for (const [tabId, instance] of this.instances.entries()) {
            if (instance.overlayController.getWebContentsId() === webContentsId) {
                return tabId;
            }
        }
        return null;
    }
}
exports.BrowserAgentManager = BrowserAgentManager;
// 全局单例
let browserAgentManager = null;
function getBrowserAgentManager() {
    if (!browserAgentManager) {
        browserAgentManager = new BrowserAgentManager();
    }
    return browserAgentManager;
}
