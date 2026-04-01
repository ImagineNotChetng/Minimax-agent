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
exports.OverlayController = void 0;
exports.getOverlayController = getOverlayController;
/**
 * Overlay Controller
 * 管理浏览器操作反馈覆盖层的 WebContentsView
 *
 * 这个覆盖层叠在 BrowserController 的 WebContentsView 之上，
 * 加载应用的 /browser-overlay 页面，使用 React 渲染动画效果
 * 这样不会影响底层浏览器的截图等操作
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const routes_1 = require("../../config/routes");
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
/**
 * 覆盖层控制器
 * 管理一个加载应用页面的 WebContentsView 用于显示操作反馈动画
 */
class OverlayController {
    constructor() {
        this.webContentsView = null;
        this.parentWindow = null;
        this.bounds = {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        };
        this.isVisible = false;
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
     * 安全地将 view 添加到 contentView
     */
    safeAddToContentView(view) {
        const cv = this.contentView;
        if (!cv)
            return;
        cv.addChildView(view);
    }
    /**
     * 安全发送消息到父窗口（Tab 渲染进程）
     */
    safeSendToParent(channel, data) {
        if (!this.parentWindow ||
            this.parentWindow.isDestroyed() ||
            !this.parentWindow.webContents ||
            this.parentWindow.webContents.isDestroyed()) {
            return;
        }
        this.parentWindow.webContents.send(channel, data);
    }
    /**
     * 发送日志到 Tab 渲染进程
     * @param level 日志级别
     * @param message 日志消息
     * @param meta 额外的元数据
     */
    log(level, message) {
        this.safeSendToParent(constants_1.IPC_CHANNELS.BROWSER_LOG, {
            level,
            message,
        });
    }
    /**
     * 创建覆盖层视图
     * @param parentWindow 父窗口
     * @param bounds 边界
     * @param baseUrl 应用基础 URL (如 http://localhost:3000)
     */
    async create(parentWindow, bounds) {
        try {
            if (this.webContentsView) {
                this.destroy();
            }
            this.parentWindow = parentWindow;
            this.bounds = bounds;
            // 创建透明的 WebContentsView
            // 使用与主窗口相同的 preload 脚本
            const preloadPath = path.join(__dirname, '..', '..', 'preload.js');
            this.webContentsView = new electron_1.WebContentsView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: false, // 需要关闭 sandbox 才能使用 preload
                    preload: preloadPath,
                },
            });
            // 设置透明背景
            this.webContentsView.setBackgroundColor('#00000000');
            // 添加到窗口（在 BrowserView 之上）
            parentWindow.contentView.addChildView(this.webContentsView);
            // 初始位置设为屏幕外（隐藏）
            this.webContentsView.setBounds({ x: -10000, y: -10000, width: 0, height: 0 });
            // if (isDev) {
            //   this.webContentsView.webContents.openDevTools({ mode: 'detach' });
            // }
            // 监听来自 overlay view 的 console 输出，转发到 Tab 渲染进程
            if (env_1.isDev) {
                this.webContentsView.webContents.on('console-message', (_, level, message) => {
                    this.log(level === 0 ? 'log' : level === 1 ? 'warn' : 'error', message);
                });
            }
            // 加载覆盖层页面
            await this.webContentsView.webContents.loadURL(routes_1.PAGE_URLS.BROWSER_OVERLAY);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 销毁覆盖层视图
     */
    destroy() {
        try {
            if (this.webContentsView) {
                this.safeRemoveFromContentView(this.webContentsView);
            }
            this.webContentsView = null;
            this.isVisible = false;
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 设置边界（与 BrowserView 同步）
     */
    setBounds(bounds) {
        if (!this.webContentsView || !this.contentView) {
            return;
        }
        // 检查 bounds 是否变化，避免重复操作
        const boundsChanged = this.bounds.x !== bounds.x ||
            this.bounds.y !== bounds.y ||
            this.bounds.width !== bounds.width ||
            this.bounds.height !== bounds.height;
        if (!boundsChanged) {
            return;
        }
        // 判断隐藏状态变化（bounds 在屏幕外为隐藏）
        const wasHidden = this.bounds.x < 0 || this.bounds.y < 0;
        const shouldHide = bounds.x < 0 || bounds.y < 0;
        // 更新 bounds
        this.bounds = bounds;
        // 只在隐藏状态变化时才操作 contentView
        if (shouldHide !== wasHidden) {
            if (shouldHide) {
                // 隐藏时从 contentView 中移除，避免拦截事件
                this.safeRemoveFromContentView(this.webContentsView);
            }
            else if (this.isVisible) {
                // 显示时确保在 contentView 中（仅当 isVisible 为 true）
                this.safeRemoveFromContentView(this.webContentsView);
                this.safeAddToContentView(this.webContentsView);
            }
        }
        if (this.isVisible) {
            this.webContentsView.setBounds(bounds);
        }
    }
    /**
     * 将 overlay 移动到 contentView 的最上层
     */
    bringToFront() {
        if (!this.webContentsView || !this.contentView)
            return;
        this.safeRemoveFromContentView(this.webContentsView);
        this.safeAddToContentView(this.webContentsView);
    }
    /**
     * 从父窗口中移除 view（但不销毁）
     * 用于切换 Tab 时隐藏非活动 Tab 的 view，防止事件拦截
     */
    removeFromParent() {
        if (!this.webContentsView)
            return;
        this.safeRemoveFromContentView(this.webContentsView);
    }
    /**
     * 将 view 添加到父窗口中
     * 用于切换 Tab 时恢复 view
     */
    addToParent(parentWindow) {
        if (!this.webContentsView ||
            !parentWindow ||
            parentWindow.isDestroyed() ||
            !parentWindow.contentView) {
            return;
        }
        this.parentWindow = parentWindow;
        // 先移除再添加，防止重复
        this.safeRemoveFromContentView(this.webContentsView);
        this.safeAddToContentView(this.webContentsView);
    }
    /**
     * 显示覆盖层并移动到正确位置
     */
    show() {
        if (this.webContentsView) {
            this.webContentsView.setBounds(this.bounds);
            this.isVisible = true;
        }
    }
    /**
     * 隐藏覆盖层（移到屏幕外）
     */
    hide() {
        if (this.webContentsView) {
            this.webContentsView.setBounds({ x: -10000, y: -10000, width: 0, height: 0 });
            this.isVisible = false;
        }
    }
    /**
     * 显示操作反馈
     * 当 showOverlay 为 false 时，隐藏覆盖层
     */
    async showActionFeedback(params) {
        if (!this.webContentsView) {
            return { success: false, error: 'Overlay not created' };
        }
        try {
            // 如果 showOverlay 明确为 false
            if (params.showOverlay === false) {
                this.hide();
                return { success: true };
            }
            // 否则显示覆盖层
            this.show();
            // 调用页面中的 showFeedback 函数
            await this.webContentsView.webContents.executeJavaScript(`window.overlayAPI?.showFeedback?.(${JSON.stringify(params)})`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 检查是否已创建
     */
    isCreated() {
        return this.webContentsView !== null;
    }
    /**
     * 获取可见状态
     */
    getIsVisible() {
        return this.isVisible;
    }
    /**
     * 获取 webContentsId
     * 用于通过 IPC event.sender.id 找到对应的 Overlay
     */
    getWebContentsId() {
        return this.webContentsView?.webContents.id ?? null;
    }
}
exports.OverlayController = OverlayController;
// 全局实例
let overlayController = null;
/**
 * 获取或创建 OverlayController 实例
 */
function getOverlayController() {
    if (!overlayController) {
        overlayController = new OverlayController();
    }
    return overlayController;
}
