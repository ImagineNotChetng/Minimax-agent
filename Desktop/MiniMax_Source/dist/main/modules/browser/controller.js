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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserController = void 0;
exports.getBrowserController = getBrowserController;
/**
 * Browser Controller
 * 控制嵌入式浏览器窗口的核心模块
 *
 */
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const turndown_1 = __importDefault(require("turndown"));
const constants_1 = require("../../config/constants");
const tool_1 = require("../../utils/tool");
const stealth_1 = require("./stealth");
// import { isDev } from '../../config/env';
// 页面加载超时时间 (ms)
const PAGE_LOAD_TIMEOUT = 30000;
/**
 * 浏览器控制器
 * 管理嵌入式 WebContentsView 并提供各种操作方法
 *
 * WebContentsView 是 Electron 30+ 推荐使用的替代 BrowserView 的方案
 * 通过 window.contentView.addChildView() 添加到窗口中
 */
class BrowserController {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {
        this.webContentsView = null;
        this.parentWindow = null;
        this.bounds = {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
        };
        /**
         * 获取 DOM
         * 同时返回 HTML 和结构化数据：
         * - html: 清理后的 HTML（用于文本提取）
         * - structure: 结构化数据，包含可交互元素列表（用于替代截图进行页面分析）
         *
         * 结构化数据根据大小决定返回方式：
         * - < 20KB: 直接在 message 字段返回 JSON 字符串
         * - >= 20KB: 保存到文件，返回 structure_file_path
         */
        /**
         * CDP debugger 状态
         */
        this.cdpDebuggerAttached = false;
    }
    /**
     * 获取 WebContents
     */
    get webContents() {
        const wc = this.webContentsView?.webContents;
        if (!wc || wc.isDestroyed?.())
            return null;
        return wc;
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
     * 创建浏览器视图
     */
    async create(parentWindow, bounds) {
        try {
            if (this.webContentsView) {
                this.destroy();
            }
            this.parentWindow = parentWindow;
            this.bounds = bounds;
            this.webContentsView = new electron_1.WebContentsView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    autoplayPolicy: 'user-gesture-required',
                    sandbox: true,
                    webSecurity: true,
                    backgroundThrottling: false, // 防止非活动 Tab 被后台节流，确保 browser agent 流程继续执行
                },
            });
            // 加载空白页面以初始化 webContents（Windows 平台必需，否则后续操作可能失败）
            await this.webContentsView.webContents.loadURL('about:blank');
            // 默认静音，避免视频网站自动播放声音
            this.webContentsView.webContents.setAudioMuted(true);
            // 通过 contentView.addChildView 添加到窗口
            parentWindow.contentView.addChildView(this.webContentsView);
            // 设置边界
            this.webContentsView.setBounds(bounds);
            // if (isDev && !this.webContentsView.webContents.isDevToolsOpened()) {
            //   this.webContentsView.webContents.openDevTools({ mode: 'detach' });
            // }
            // 设置反爬虫相关配置
            this.setupAntiDetection();
            // 设置事件监听
            this.setupEventListeners();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 销毁浏览器视图
     */
    destroy() {
        try {
            if (this.webContentsView) {
                this.safeRemoveFromContentView(this.webContentsView);
                this.webContentsView = null;
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 更新边界
     */
    setBounds(bounds) {
        if (!this.webContentsView || !this.contentView)
            return;
        // 检查 bounds 是否变化，避免重复操作
        const boundsChanged = this.bounds.x !== bounds.x ||
            this.bounds.y !== bounds.y ||
            this.bounds.width !== bounds.width ||
            this.bounds.height !== bounds.height;
        if (!boundsChanged)
            return;
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
            else {
                // 显示时确保在 contentView 中
                this.safeRemoveFromContentView(this.webContentsView);
                this.safeAddToContentView(this.webContentsView);
            }
        }
        this.webContentsView.setBounds(bounds);
    }
    /**
     * 将 view 移动到 contentView 的最上层
     */
    bringToFront() {
        if (!this.webContentsView || !this.contentView)
            return;
        // 先移除再添加，确保在最上层
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
     * 设置缩放因子
     * @param factor 缩放因子，1.0 表示 100%
     */
    setZoomFactor(factor) {
        const wc = this.webContents;
        if (!wc) {
            return { success: false, error: 'Browser not created' };
        }
        try {
            wc.setZoomFactor(factor);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 获取缩放因子
     */
    getZoomFactor() {
        return this.webContents?.getZoomFactor() || 1;
    }
    /**
     * 获取当前状态
     */
    getState() {
        const wc = this.webContents;
        return {
            isCreated: !!this.webContentsView,
            isLoading: wc?.isLoading() || false,
            url: wc?.getURL() || '',
            title: wc?.getTitle() || '',
            canGoBack: wc?.navigationHistory?.canGoBack() || false,
            canGoForward: wc?.navigationHistory?.canGoForward() || false,
        };
    }
    /**
     * 设置反爬虫/反检测配置
     * 使用 stealth 模块的完整实现，绕过 Cloudflare 等反爬虫检测
     */
    setupAntiDetection() {
        const wc = this.webContents;
        if (!wc)
            return;
        // 使用 stealth 模块应用反检测配置
        (0, stealth_1.applyStealthToWebContents)(wc);
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
     * 设置事件监听
     */
    setupEventListeners() {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return;
        }
        wc.on('did-start-loading', () => {
            if (wc.isDestroyed())
                return;
            this.safeSendToParent(constants_1.IPC_CHANNELS.BROWSER_ON_LOAD_START, {
                url: wc.getURL(),
            });
        });
        wc.on('did-finish-load', () => {
            if (wc.isDestroyed())
                return;
            this.safeSendToParent(constants_1.IPC_CHANNELS.BROWSER_ON_LOAD_FINISH, {
                url: wc.getURL(),
                title: wc.getTitle(),
            });
        });
        wc.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
            if (wc.isDestroyed())
                return;
            this.safeSendToParent(constants_1.IPC_CHANNELS.BROWSER_ON_ERROR, {
                errorCode,
                errorDescription,
                url: validatedURL,
            });
        });
        wc.on('did-navigate', (_, url) => {
            if (wc.isDestroyed())
                return;
            this.safeSendToParent(constants_1.IPC_CHANNELS.BROWSER_ON_NAVIGATE, {
                url,
                title: wc.getTitle(),
            });
        });
        // 拦截新窗口打开请求
        // 允许所有弹窗以支持网站的登录、授权等功能（如 Google OAuth、Twitter 登录等）
        wc.setWindowOpenHandler(({ url, features }) => {
            if (wc.isDestroyed()) {
                return { action: 'deny' };
            }
            // 检测是否是弹窗类型的请求（通常有 width/height 特性，或 popup 关键字）
            const isPopup = features.includes('popup') ||
                features.includes('width=') ||
                features.includes('height=') ||
                features.includes('menubar=no') ||
                features.includes('toolbar=no');
            if (isPopup) {
                // 弹窗类型：允许打开新窗口，支持 window.opener.postMessage
                // 这对于 OAuth 登录、支付确认等场景是必需的
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        width: 600,
                        height: 600,
                        center: true,
                        resizable: true,
                        minimizable: false,
                        maximizable: false,
                        // 不设置 parent，避免模态窗口问题
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            // 允许弹窗与 opener 通信
                            sandbox: false,
                        },
                    },
                };
            }
            // 普通链接：在当前 view 中导航（避免打开过多窗口）
            wc.loadURL(url);
            return { action: 'deny' };
        });
    }
    // ============================================
    // 导航操作
    // ============================================
    /**
     * 导航到指定 URL
     * 设置 30 秒超时，超时后返回错误信息
     */
    async navigate(params) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc.isDestroyed()) {
            return { success: false, error: 'Browser not created or destroyed', url: '', title: '' };
        }
        let timeoutId = null;
        try {
            // 创建超时 Promise
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error('PAGE_LOAD_TIMEOUT'));
                }, PAGE_LOAD_TIMEOUT);
            });
            // 竞争：loadURL 完成 或 超时
            await Promise.race([wc.loadURL(params.url), timeoutPromise]);
            // 清理超时定时器
            if (timeoutId)
                clearTimeout(timeoutId);
            return {
                success: true,
                url: wc?.getURL?.() || params.url,
                title: wc?.getTitle?.() || '',
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            // 清理超时定时器
            if (timeoutId)
                clearTimeout(timeoutId);
            const errorMsg = String(error);
            const isTimeout = errorMsg.includes('PAGE_LOAD_TIMEOUT');
            // 检查 webContents 是否在加载过程中被销毁
            const isDestroyed = wc?.isDestroyed?.();
            const currentUrl = isDestroyed ? params.url : wc?.getURL?.() || params.url;
            const currentTitle = isDestroyed ? '' : wc?.getTitle?.() || '';
            const timeoutSeconds = PAGE_LOAD_TIMEOUT / 1000;
            const timeoutMsg = `Page load timeout (${timeoutSeconds}s). The page may still be loading. ` +
                'You can try reload() to refresh the page, or proceed with other actions if the page is already usable.';
            return {
                success: false,
                error: isTimeout ? timeoutMsg : errorMsg,
                url: currentUrl,
                title: currentTitle,
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * 后退
     */
    async goBack() {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        if (wc.navigationHistory.canGoBack()) {
            wc.navigationHistory.goBack();
            return { success: true };
        }
        return { success: false, error: 'Cannot go back' };
    }
    /**
     * 前进
     */
    async goForward() {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        if (wc.navigationHistory.canGoForward()) {
            wc.navigationHistory.goForward();
            return { success: true };
        }
        return { success: false, error: 'Cannot go forward' };
    }
    /**
     * 刷新
     */
    async reload() {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        wc.reload();
        return { success: true };
    }
    // ============================================
    // 交互操作
    // ============================================
    /**
     * 解析 normalized_position，支持对象或 JSON 字符串
     * LLM 可能返回字符串格式的 JSON，需要兼容处理
     */
    parseNormalizedPosition(pos) {
        if (!pos)
            return null;
        const { isObject, data } = (0, tool_1.fmtAgentJSONResult)(pos);
        if (isObject && typeof data.x === 'number' && typeof data.y === 'number') {
            return { x: data.x, y: data.y };
        }
        return null;
    }
    /**
     * 将归一化坐标转换为像素坐标
     * @param normalizedX 归一化 X 坐标 (0-1)
     * @param normalizedY 归一化 Y 坐标 (0-1)
     * @returns 像素坐标
     */
    normalizedToPixel(normalizedX, normalizedY) {
        const { width, height } = this.bounds;
        return {
            x: Math.round(normalizedX * width),
            y: Math.round(normalizedY * height),
        };
    }
    /**
     * 点击元素或位置
     */
    async click(params) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        try {
            // 解析 normalized_position（可能是字符串或对象）
            const normalizedPos = this.parseNormalizedPosition(params.normalized_position);
            if (params.selector) {
                // 通过选择器点击，使用 JSON.stringify 安全转义
                const selectorJson = JSON.stringify(params.selector);
                await wc.executeJavaScript(`
          (function() {
            const selector = ${selectorJson};
            const el = document.querySelector(selector);
            if (!el) throw new Error('Element not found: ' + selector);
            el.click();
          })();
        `);
            }
            else if (normalizedPos) {
                // 通过归一化坐标点击（推荐方式）
                const { x, y } = this.normalizedToPixel(normalizedPos.x, normalizedPos.y);
                // 确保 click_count 是数字类型（服务端可能传递字符串）
                const clickCount = typeof params.click_count === 'string'
                    ? parseInt(params.click_count, 10) || 1
                    : params.click_count || 1;
                // 先发送 mouseMove 事件，模拟真实用户行为
                // 很多网页需要先接收 mouseMove/mouseEnter 事件才能正确响应点击
                wc.sendInputEvent({ type: 'mouseMove', x, y });
                await this.sleep(50);
                wc.sendInputEvent({
                    type: 'mouseDown',
                    x,
                    y,
                    button: params.button || 'left',
                    clickCount,
                });
                // mouseDown 和 mouseUp 之间默认有 50ms 延迟，模拟真实点击
                await this.sleep(params.delay || 50);
                wc.sendInputEvent({
                    type: 'mouseUp',
                    x,
                    y,
                    button: params.button || 'left',
                    clickCount,
                });
            }
            else {
                return {
                    success: false,
                    error: 'Either selector, normalized_position or position is required',
                };
            }
            // 点击后等待一小段时间，让页面有时间响应（如触发事件、加载内容等）
            await this.sleep(100);
            return { success: true, duration: Date.now() - startTime };
        }
        catch (error) {
            return { success: false, error: String(error), duration: Date.now() - startTime };
        }
    }
    /**
     * 输入文本
     * 支持通过 selector 或 normalized_position 定位输入框
     */
    async type(params) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        try {
            // 解析 normalized_position（可能是字符串或对象）
            const normalizedPos = this.parseNormalizedPosition(params.normalized_position);
            // 如果指定了归一化坐标，先点击该位置以聚焦
            if (normalizedPos) {
                const { x, y } = this.normalizedToPixel(normalizedPos.x, normalizedPos.y);
                // 三击以选中整个输入框内容（兼容性更好）
                if (params.clear) {
                    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 3 });
                    await this.sleep(50);
                    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 3 });
                    await this.sleep(100);
                }
                else {
                    // 单击聚焦
                    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
                    await this.sleep(50);
                    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
                    await this.sleep(100);
                }
            }
            else if (params.selector) {
                // 通过选择器聚焦
                const selectorJson = JSON.stringify(params.selector);
                const clearScript = params.clear
                    ? "if (el.select) el.select(); else if ('value' in el) el.value = '';"
                    : '';
                await wc.executeJavaScript(`
          (function() {
            const selector = ${selectorJson};
            const el = document.querySelector(selector);
            if (!el) throw new Error('Element not found: ' + selector);
            el.focus();
            ${clearScript}
          })();
        `);
            }
            // 确保 delay 是数字类型
            const delay = typeof params.delay === 'string' ? parseInt(params.delay, 10) : params.delay;
            // 使用 insertText 输入文本（支持中文等非 ASCII 字符）
            if (delay && delay > 0) {
                // 如果需要延迟，逐字符输入
                for (const char of params.text) {
                    wc.insertText(char);
                    await this.sleep(delay);
                }
            }
            else {
                // 无延迟时直接输入整个文本
                wc.insertText(params.text);
            }
            return { success: true, duration: Date.now() - startTime };
        }
        catch (error) {
            return { success: false, error: String(error), duration: Date.now() - startTime };
        }
    }
    /**
     * 按下键盘按键
     */
    async pressKey(params) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        try {
            const { key } = params;
            // 确保 modifiers 是数组（服务端可能传递空字符串或其他非数组值）
            let modifiers = [];
            if (Array.isArray(params.modifiers)) {
                modifiers = params.modifiers;
            }
            else if (typeof params.modifiers === 'string' && params.modifiers) {
                // 如果是非空字符串，尝试解析为数组或单个修饰键
                try {
                    const parsed = JSON.parse(params.modifiers);
                    modifiers = Array.isArray(parsed) ? parsed : [params.modifiers];
                }
                catch {
                    modifiers = [params.modifiers];
                }
            }
            // 将修饰键转换为 Electron 支持的小写格式
            // Electron 支持: 'shift', 'control', 'ctrl', 'alt', 'meta', 'command', 'cmd'
            const normalizedModifiers = modifiers.map((m) => {
                const lower = m.toLowerCase();
                // 统一处理各种修饰键名称
                if (lower === 'meta' || lower === 'command' || lower === 'cmd') {
                    return 'meta'; // macOS 上 meta 对应 Command 键
                }
                if (lower === 'control' || lower === 'ctrl') {
                    return 'control';
                }
                return lower;
            });
            // 使用 modifiers 属性发送带修饰键的键盘事件
            // 这是 Electron 正确模拟组合键的方式
            wc.sendInputEvent({
                type: 'keyDown',
                keyCode: key,
                modifiers: normalizedModifiers,
            });
            wc.sendInputEvent({
                type: 'keyUp',
                keyCode: key,
                modifiers: normalizedModifiers,
            });
            return { success: true, duration: Date.now() - startTime };
        }
        catch (error) {
            return { success: false, error: String(error), duration: Date.now() - startTime };
        }
    }
    /**
     * 滚动
     * - direction + distance: 按方向滚动指定像素距离（direction 默认为 'down'）
     * - normalized_position + direction: 在指定归一化坐标位置进行滚动（用于模拟鼠标滚轮）
     */
    async scroll(params) {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        try {
            // direction 默认为 'down'
            const direction = params.direction || 'down';
            // 按方向滚动，默认滚动视口高度的 80%（更接近翻页效果）
            // 如果指定了 distance 则使用指定值
            const defaultDistance = Math.round(this.bounds.height * 0.8);
            const distance = params.distance || defaultDistance;
            let scrollX = 0;
            let scrollY = 0;
            if (direction === 'left')
                scrollX = -distance;
            else if (direction === 'right')
                scrollX = distance;
            else if (direction === 'up')
                scrollY = -distance;
            else if (direction === 'down')
                scrollY = distance;
            // 如果提供了 normalized_position，使用鼠标滚轮事件在该位置滚动
            const normalizedPos = this.parseNormalizedPosition(params.normalized_position);
            if (normalizedPos) {
                const { x, y } = this.normalizedToPixel(normalizedPos.x, normalizedPos.y);
                // 先移动鼠标到指定位置
                wc.sendInputEvent({ type: 'mouseMove', x, y });
                // 发送滚轮事件
                wc.sendInputEvent({
                    type: 'mouseWheel',
                    x,
                    y,
                    deltaX: scrollX,
                    deltaY: scrollY,
                });
            }
            else {
                // 使用 JavaScript 滚动
                await wc.executeJavaScript(`window.scrollBy(${scrollX}, ${scrollY})`);
            }
            // 等待滚动动画完成
            await this.sleep(150);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * 悬停
     */
    async hover(params) {
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed' };
        }
        try {
            let x, y;
            // 解析 normalized_position（可能是字符串或对象）
            const normalizedPos = this.parseNormalizedPosition(params.normalized_position);
            if (params.selector) {
                // 获取元素位置，使用 JSON.stringify 安全转义
                const selectorJson = JSON.stringify(params.selector);
                const rect = await wc.executeJavaScript(`
          (function() {
            const selector = ${selectorJson};
            const el = document.querySelector(selector);
            if (!el) throw new Error('Element not found: ' + selector);
            const rect = el.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          })();
        `);
                x = rect.x;
                y = rect.y;
            }
            else if (normalizedPos) {
                // 通过归一化坐标悬停（推荐方式）
                const pixel = this.normalizedToPixel(normalizedPos.x, normalizedPos.y);
                x = pixel.x;
                y = pixel.y;
            }
            else {
                return {
                    success: false,
                    error: 'Either selector, normalized_position or position is required',
                };
            }
            wc.sendInputEvent({ type: 'mouseMove', x, y });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    // ============================================
    // 获取信息
    // ============================================
    /**
     * 截图
     * 固定视口全屏截图，PNG 格式
     */
    async screenshot(params = {}) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return {
                success: false,
                error: 'Screenshot unavailable: Browser not created or destroyed',
                image: '',
                format: 'png',
                width: 0,
                height: 0,
            };
        }
        try {
            const win = this.parentWindow;
            const isMinimized = win?.isMinimized();
            const isVisible = win?.isVisible();
            const isFocused = win?.isFocused();
            // 如果窗口最小化或不在前台或不可见，返回失败让模型走 DOM 分析
            if (isMinimized || !isVisible || !isFocused) {
                return {
                    success: false,
                    error: 'Screenshot unavailable: App is minimized or in background. Please use DOM analysis instead.',
                    image: '',
                    format: 'png',
                    width: 0,
                    height: 0,
                    duration: Date.now() - startTime,
                };
            }
            // 正常截图流程（窗口在前台且可见）
            const image = await wc.capturePage();
            const buffer = image.toPNG();
            const result = {
                success: true,
                image: buffer.toString('base64'),
                format: 'png',
                width: image.getSize().width,
                height: image.getSize().height,
                duration: Date.now() - startTime,
            };
            // 如果提供了保存路径，则保存到文件
            if (params.file_path) {
                try {
                    // 确保目录存在
                    const dir = path.dirname(params.file_path);
                    await fs.promises.mkdir(dir, { recursive: true });
                    // 保存文件
                    await fs.promises.writeFile(params.file_path, buffer);
                    result.file_path = params.file_path;
                }
                catch (saveError) {
                    // 保存失败不影响截图结果，只是不返回 filePath
                    console.error('Failed to save screenshot:', saveError);
                }
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: 'Screenshot unavailable: Failed to capture page. Please use DOM analysis instead.',
                image: '',
                format: 'png',
                width: 0,
                height: 0,
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * 确保 CDP debugger 已连接
     */
    async ensureCDPAttached() {
        const wc = this.webContents;
        if (!wc)
            return false;
        if (!this.cdpDebuggerAttached) {
            try {
                wc.debugger.attach('1.3');
                this.cdpDebuggerAttached = true;
            }
            catch {
                // 可能已经 attached
                this.cdpDebuggerAttached = true;
            }
        }
        return true;
    }
    /**
     * 使用 CDP Accessibility API 获取可交互元素
     * 流程：
     * 1. CDP Accessibility.getFullAXTree 获取可访问性树（识别所有可交互元素，包括 React/Vue 等框架）
     * 2. CDP DOM.pushNodesByBackendIdsToFrontend 转换节点 ID
     * 3. CDP DOM.setAttributeValue 并行标记元素
     * 4. 一次 executeJavaScript 收集所有标记元素的选择器和位置信息
     *
     * 优势：
     * - 浏览器原生识别可交互元素，无需手动维护选择器列表
     * - 支持 React/Vue/Angular 等框架的生产环境
     * - 批量处理，性能高效
     *
     * 设计原则：
     * - 允许静默失败，返回空数组
     * - 不影响主流程（HTML 获取）
     * - 内部错误只记录日志，不抛出
     */
    async getInteractiveElementsViaCDP() {
        const wc = this.webContents;
        if (!wc || wc.isDestroyed?.())
            return [];
        // 尝试连接 CDP，失败则静默返回
        const attached = await this.ensureCDPAttached().catch(() => false);
        if (!attached)
            return [];
        try {
            // 启用必要的 CDP 域（静默处理错误）
            await Promise.all([
                wc.debugger.sendCommand('DOM.enable').catch(() => undefined),
                wc.debugger.sendCommand('Accessibility.enable').catch(() => undefined),
            ]);
            // 1. 获取可访问性树（设置超时）
            const axResult = (await Promise.race([
                wc.debugger.sendCommand('Accessibility.getFullAXTree'),
                new Promise((resolve) => setTimeout(() => resolve(null), 5000)), // 5s 超时
            ]));
            if (!axResult?.nodes || axResult.nodes.length === 0)
                return [];
            // 定义可交互的角色
            const interactiveRoles = new Set([
                'button',
                'link',
                'textbox',
                'searchbox',
                'checkbox',
                'radio',
                'switch',
                'combobox',
                'listbox',
                'spinbutton',
                'slider',
                'option',
                'menuitem',
                'menuitemcheckbox',
                'menuitemradio',
                'tab',
                'treeitem',
                'gridcell',
            ]);
            // 收集可交互节点信息
            const interactiveNodes = [];
            for (const node of axResult.nodes) {
                if (!node.backendDOMNodeId)
                    continue;
                const role = typeof node.role === 'object' ? node.role?.value : node.role;
                if (!role)
                    continue;
                const roleLower = role.toLowerCase();
                const isInteractiveRole = interactiveRoles.has(roleLower);
                const focusable = node.properties?.find((p) => p.name === 'focusable');
                const isFocusable = focusable?.value?.value === true;
                const editable = node.properties?.find((p) => p.name === 'editable');
                const isEditable = editable?.value?.value === 'plaintext' || editable?.value?.value === 'richtext';
                if (isInteractiveRole || isFocusable || isEditable) {
                    const name = typeof node.name === 'object' ? node.name?.value : node.name;
                    const disabled = node.properties?.find((p) => p.name === 'disabled');
                    const isDisabled = disabled?.value?.value === true;
                    interactiveNodes.push({
                        backendDOMNodeId: node.backendDOMNodeId,
                        role: roleLower,
                        name: name || '',
                        disabled: isDisabled,
                    });
                }
            }
            if (interactiveNodes.length === 0)
                return [];
            // 限制处理的元素数量，避免页面元素过多导致性能问题
            const MAX_ELEMENTS = 500;
            const nodesToProcess = interactiveNodes.slice(0, MAX_ELEMENTS);
            // 2. 获取 document 并批量转换 backendNodeIds
            try {
                await wc.debugger.sendCommand('DOM.getDocument');
            }
            catch {
                // DOM.getDocument 失败，可能页面正在加载，静默返回
                return [];
            }
            const backendNodeIds = nodesToProcess.map((n) => n.backendDOMNodeId);
            let nodeIds;
            try {
                const result = (await wc.debugger.sendCommand('DOM.pushNodesByBackendIdsToFrontend', {
                    backendNodeIds,
                }));
                nodeIds = result.nodeIds || [];
            }
            catch {
                // 转换失败，静默返回
                return [];
            }
            if (nodeIds.length === 0)
                return [];
            // 3. 并行批量标记元素（使用临时属性）
            // 使用 Promise.allSettled 确保即使部分失败也不影响整体
            const markPromises = nodeIds.map((nodeId, i) => {
                if (nodeId > 0) {
                    return wc.debugger
                        .sendCommand('DOM.setAttributeValue', {
                        nodeId,
                        name: 'data-ax-index',
                        value: String(i),
                    })
                        .catch(() => {
                        // 某些节点可能无法设置属性，忽略
                    });
                }
                return Promise.resolve();
            });
            await Promise.allSettled(markPromises);
            // 4. 一次 executeJavaScript 收集所有标记元素的信息
            const nodeInfoMap = JSON.stringify(Object.fromEntries(nodesToProcess.map((n, i) => [
                String(i),
                { role: n.role, name: n.name, disabled: n.disabled },
            ])));
            const elements = (await wc.executeJavaScript(`
        (function() {
          try {
            const nodeInfo = ${nodeInfoMap};
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const elements = [];
          
          // 生成唯一选择器
          function getUniqueSelector(el) {
            if (el.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(el.id)) {
              const selector = '#' + CSS.escape(el.id);
              if (document.querySelectorAll(selector).length === 1) return selector;
            }
            if (el.dataset.testid) {
              const selector = '[data-testid="' + CSS.escape(el.dataset.testid) + '"]';
              if (document.querySelectorAll(selector).length === 1) return selector;
            }
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) {
              const tag = el.tagName.toLowerCase();
              const selector = tag + '[aria-label="' + CSS.escape(ariaLabel) + '"]';
              if (document.querySelectorAll(selector).length === 1) return selector;
            }
            if (el.name) {
              const tag = el.tagName.toLowerCase();
              const selector = tag + '[name="' + CSS.escape(el.name) + '"]';
              if (document.querySelectorAll(selector).length === 1) return selector;
            }
            // 构建路径选择器
            const path = [];
            let current = el;
            while (current && current !== document.body && path.length < 4) {
              let sel = current.tagName.toLowerCase();
              if (current.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(current.id)) {
                path.unshift('#' + CSS.escape(current.id));
                break;
              }
              const parent = current.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                  sel += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
                }
              }
              path.unshift(sel);
              current = current.parentElement;
            }
            return path.join(' > ');
          }
          
          // 获取重要属性
          function getAttributes(el) {
            const attrs = {};
            ['href', 'src', 'placeholder', 'value', 'aria-label', 'aria-expanded', 
             'aria-selected', 'aria-checked', 'type', 'name'].forEach(attr => {
              const val = el.getAttribute(attr);
              if (val) attrs[attr] = val;
            });
            if (el.checked !== undefined) attrs.checked = String(el.checked);
            return attrs;
          }
          
          // 遍历所有标记的元素
          document.querySelectorAll('[data-ax-index]').forEach((el, idx) => {
            const axIndex = el.getAttribute('data-ax-index');
            const info = nodeInfo[axIndex];
            if (!info) return;
            
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            
            const selector = getUniqueSelector(el);
            
            elements.push({
              index: elements.length,
              selector: selector,
              tag: el.tagName.toLowerCase(),
              type: info.role,
              text: info.name || el.innerText?.trim().slice(0, 100) || '',
              normalizedPosition: {
                x: Math.round(((rect.left + rect.width / 2) / viewportWidth) * 1000) / 1000,
                y: Math.round(((rect.top + rect.height / 2) / viewportHeight) * 1000) / 1000
              },
              boundingBox: {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              isInViewport: rect.top < viewportHeight && rect.bottom > 0 && 
                           rect.left < viewportWidth && rect.right > 0,
              isInteractable: !info.disabled,
              attributes: getAttributes(el)
            });
            
            // 清理临时属性
            el.removeAttribute('data-ax-index');
          });
          
          return elements;
          } catch (e) {
            // 清理所有临时标记，即使出错也要清理
            document.querySelectorAll('[data-ax-index]').forEach(el => {
              el.removeAttribute('data-ax-index');
            });
            return [];
          }
        })()
      `));
            return elements || [];
        }
        catch (error) {
            // 静默失败，只记录日志
            console.warn('Failed to get interactive elements via CDP:', error);
            // 尝试清理可能残留的临时标记
            try {
                await wc.executeJavaScript(`
          document.querySelectorAll('[data-ax-index]').forEach(el => {
            el.removeAttribute('data-ax-index');
          });
        `);
            }
            catch {
                // 清理失败也忽略
            }
            return [];
        }
    }
    async getDOM(params = {}) {
        const startTime = Date.now();
        const wc = this.webContents;
        // 结构化数据大小阈值：20KB
        const STRUCTURE_SIZE_THRESHOLD = 20000;
        if (!wc || wc?.isDestroyed?.()) {
            return {
                success: false,
                error: 'Browser not created or destroyed',
                url: '',
                title: '',
            };
        }
        try {
            // 等待页面基本渲染完成
            await wc.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve, { once: true });
            setTimeout(resolve, 5000);
          }
        })
      `);
            // 并行获取：可交互元素 + 页面基础信息
            // 可交互元素获取允许静默失败，不影响整体流程
            const [interactiveElements, pageInfo] = await Promise.all([
                // 获取可交互元素（静默失败，返回空数组）
                this.getInteractiveElementsViaCDP().catch((error) => {
                    console.warn('Failed to get interactive elements via CDP:', error);
                    return [];
                }),
                // 获取页面基础信息
                wc
                    .executeJavaScript(`
          (function() {
            try {
              // 获取焦点元素选择器
              let focusedSelector = null;
              const focused = document.activeElement;
              if (focused && focused !== document.body) {
                if (focused.id) {
                  focusedSelector = '#' + focused.id;
                } else if (focused.dataset?.testid) {
                  focusedSelector = '[data-testid="' + focused.dataset.testid + '"]';
                }
              }
              
              return {
                url: window.location.href,
                title: document.title,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                scrollPosition: { x: window.scrollX, y: window.scrollY },
                pageHeight: document.documentElement.scrollHeight,
                focusedElement: focusedSelector
              };
            } catch (e) {
              return {
                url: window.location.href,
                title: document.title,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                scrollPosition: { x: 0, y: 0 },
                pageHeight: 0,
                focusedElement: null
              };
            }
          })()
        `)
                    .catch(() => ({
                    url: wc.getURL(),
                    title: wc.getTitle(),
                    viewport: { width: 0, height: 0 },
                    scrollPosition: { x: 0, y: 0 },
                    pageHeight: 0,
                    focusedElement: null,
                })),
            ]);
            // 构建压缩格式的结构化数据
            const typeMap = {
                button: 'btn',
                link: 'lnk',
                textbox: 'txt',
                searchbox: 'txt',
                checkbox: 'chk',
                radio: 'rad',
                combobox: 'sel',
                listbox: 'sel',
                menuitem: 'menu',
                tab: 'tab',
                switch: 'sw',
                generic: 'gene',
                tabpanel: 'tpnl',
            };
            const compactStructure = {
                u: pageInfo.url,
                t: pageInfo.title,
                v: [pageInfo.viewport.width, pageInfo.viewport.height],
                s: [pageInfo.scrollPosition.x, pageInfo.scrollPosition.y],
                h: pageInfo.pageHeight,
                c: interactiveElements.length,
                e: interactiveElements.map((el, idx) => {
                    const shortType = typeMap[el.type] || el.type.slice(0, 4);
                    const item = {
                        i: idx,
                        s: el.selector,
                        t: shortType,
                        n: el.text,
                        p: [el.normalizedPosition.x, el.normalizedPosition.y],
                    };
                    // 只保留有值的关键属性
                    const attrs = {};
                    if (el.attributes.placeholder)
                        attrs.ph = el.attributes.placeholder;
                    if (el.attributes.value)
                        attrs.v = el.attributes.value;
                    if (el.attributes['aria-expanded'] === 'true')
                        attrs.exp = '1';
                    if (el.attributes.checked === 'true')
                        attrs.chk = '1';
                    if (Object.keys(attrs).length > 0) {
                        item.a = attrs;
                    }
                    return item;
                }),
                f: pageInfo.focusedElement ?? undefined,
            };
            // 获取 HTML
            let html;
            if (params.selector) {
                const selectorJson = JSON.stringify(params.selector);
                html = await wc.executeJavaScript(`
          (function() {
            const selector = ${selectorJson};
            const el = document.querySelector(selector);
            if (!el) throw new Error('Element not found: ' + selector);
            return el.outerHTML;
          })();
        `);
            }
            else {
                html = await wc.executeJavaScript(`
          (function() {
            const body = document.body;
            if (!body) return '<body></body>';
            
            const clone = body.cloneNode(true);
            
            clone.querySelectorAll('script, noscript, style, link, template').forEach(el => el.remove());
            clone.querySelectorAll('svg defs, svg symbol').forEach(el => el.remove());
            
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
            const comments = [];
            while (walker.nextNode()) comments.push(walker.currentNode);
            comments.forEach(c => c.remove());
            
            clone.querySelectorAll('[style*="display: none"], [style*="display:none"]')
              .forEach(el => el.remove());
            clone.querySelectorAll('[style*="visibility: hidden"], [style*="visibility:hidden"]')
              .forEach(el => el.remove());
            clone.querySelectorAll('[hidden], [aria-hidden="true"]').forEach(el => el.remove());
            clone.querySelectorAll('iframe, object, embed').forEach(el => el.remove());
            
            clone.querySelectorAll('*').forEach(el => {
              // 保留尽可能有用的属性，用于文本提取和元素定位
              const keepAttrs = [
                // 链接和资源
                'href', 'src', 'alt', 'title',
                // 表单相关
                'type', 'name', 'id', 'class', 'for',
                'placeholder', 'value', 'checked', 'disabled', 'readonly', 'required',
                'min', 'max', 'pattern', 'maxlength', 'minlength',
                // 语义和可访问性
                'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
                'aria-expanded', 'aria-selected', 'aria-checked', 'aria-disabled',
                'aria-haspopup', 'aria-controls', 'aria-hidden',
                // 测试和数据属性
                'data-testid', 'data-id', 'data-value', 'data-name',
                // 表格相关
                'colspan', 'rowspan', 'scope',
                // 其他有用属性
                'target', 'rel', 'download', 'action', 'method', 'enctype',
                'tabindex', 'contenteditable', 'lang', 'dir'
              ];
              const attrs = Array.from(el.attributes);
              attrs.forEach(attr => {
                // 保留 keepAttrs 中的属性、所有 aria-* 属性和所有 data-* 属性
                const name = attr.name;
                if (!keepAttrs.includes(name) && !name.startsWith('aria-') && !name.startsWith('data-')) {
                  el.removeAttribute(name);
                }
              });
            });
            
            return clone.outerHTML;
          })();
        `);
            }
            // 构建结果（使用压缩格式）
            const result = {
                success: true,
                html,
                compact_structure: compactStructure,
                url: wc.getURL(),
                title: wc.getTitle(),
                duration: Date.now() - startTime,
            };
            // 处理结构化数据：根据大小决定返回方式
            const structureJson = JSON.stringify(compactStructure);
            const structureSize = Buffer.byteLength(structureJson, 'utf-8');
            if (structureSize >= STRUCTURE_SIZE_THRESHOLD && params.structure_file_path) {
                // 大于等于阈值且提供了保存路径：保存到文件
                try {
                    const dir = path.dirname(params.structure_file_path);
                    await fs.promises.mkdir(dir, { recursive: true });
                    await fs.promises.writeFile(params.structure_file_path, structureJson, 'utf-8');
                    result.structure_file_path = params.structure_file_path;
                    // 大文件时不在结果中包含 compact_structure 对象，避免传输大数据
                    delete result.compact_structure;
                }
                catch (saveError) {
                    console.error('Failed to save DOM structure:', saveError);
                    // 保存失败时保留 compact_structure 对象
                }
            }
            // 小于阈值时：compact_structure 对象已经在 result 中，直接返回
            // 保存 HTML 到文件（如果提供了路径）
            if (params.file_path) {
                try {
                    const dir = path.dirname(params.file_path);
                    await fs.promises.mkdir(dir, { recursive: true });
                    await fs.promises.writeFile(params.file_path, html, 'utf-8');
                    result.file_path = params.file_path;
                }
                catch (saveError) {
                    console.error('Failed to save DOM HTML:', saveError);
                }
            }
            return result;
        }
        catch (error) {
            return {
                success: false,
                error: String(error),
                url: wc.getURL(),
                title: wc.getTitle(),
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * 将 HTML 文件转换为 Markdown
     * 使用 turndown 库进行转换
     *
     * @param params.file_path - HTML 文件路径（从 browser_get_dom 的结果获取）
     * @returns Markdown 文件路径
     */
    async htmlToMarkdown(params) {
        const startTime = Date.now();
        try {
            // 读取 HTML 文件
            const htmlContent = await fs.promises.readFile(params.file_path, 'utf-8');
            // 创建 TurndownService 实例并配置
            const turndownService = new turndown_1.default({
                headingStyle: 'atx', // 使用 # 风格的标题
                hr: '---',
                bulletListMarker: '-',
                codeBlockStyle: 'fenced',
                fence: '```',
                emDelimiter: '*',
                strongDelimiter: '**',
                linkStyle: 'inlined',
                linkReferenceStyle: 'full',
            });
            // 添加自定义规则：保留代码块的语言标识
            // 使用 any 类型是因为 turndown 内部模拟 DOM，Electron 主进程没有 DOM 类型定义
            turndownService.addRule('fencedCodeBlock', {
                filter: (node) => {
                    return !!(node.nodeName === 'PRE' &&
                        node.firstChild &&
                        node.firstChild.nodeName === 'CODE');
                },
                replacement: (_content, node) => {
                    const codeElement = node.firstChild;
                    const className = codeElement?.getAttribute?.('class') || '';
                    const languageMatch = className.match(/language-(\w+)/);
                    const language = languageMatch ? languageMatch[1] : '';
                    const code = codeElement?.textContent || '';
                    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
                },
            });
            // 添加规则：处理表格（turndown 默认不支持表格）
            // 使用 any 类型是因为 turndown 内部模拟 DOM，Electron 主进程没有 DOM 类型定义
            turndownService.addRule('table', {
                filter: 'table',
                replacement: (_content, node) => {
                    const table = node;
                    const rows = [];
                    // 处理表头
                    const thead = table.querySelector?.('thead');
                    const headerRow = [];
                    if (thead) {
                        thead.querySelectorAll?.('th, td')?.forEach?.((cell) => {
                            headerRow.push((cell.textContent || '').trim().replace(/\|/g, '\\|'));
                        });
                    }
                    // 处理表体
                    const tbody = table.querySelector?.('tbody') || table;
                    tbody.querySelectorAll?.('tr')?.forEach?.((tr, index) => {
                        // 如果没有 thead，第一行作为表头
                        if (!thead && index === 0) {
                            tr.querySelectorAll?.('th, td')?.forEach?.((cell) => {
                                headerRow.push((cell.textContent || '').trim().replace(/\|/g, '\\|'));
                            });
                        }
                        else {
                            const row = [];
                            tr.querySelectorAll?.('th, td')?.forEach?.((cell) => {
                                row.push((cell.textContent || '').trim().replace(/\|/g, '\\|'));
                            });
                            if (row.length > 0) {
                                rows.push(row);
                            }
                        }
                    });
                    if (headerRow.length === 0) {
                        return '';
                    }
                    // 构建 Markdown 表格
                    let markdown = '\n| ' + headerRow.join(' | ') + ' |\n';
                    markdown += '| ' + headerRow.map(() => '---').join(' | ') + ' |\n';
                    rows.forEach((row) => {
                        // 确保列数一致
                        while (row.length < headerRow.length) {
                            row.push('');
                        }
                        markdown += '| ' + row.slice(0, headerRow.length).join(' | ') + ' |\n';
                    });
                    return markdown + '\n';
                },
            });
            // 移除不需要的元素
            turndownService.remove(['script', 'style', 'noscript', 'iframe']);
            // 转换 HTML 到 Markdown
            let markdown = turndownService.turndown(htmlContent);
            // 清理多余的空行
            markdown = markdown
                .replace(/\n{3,}/g, '\n\n') // 最多保留两个换行
                .trim();
            // 确定输出路径：与 HTML 文件同目录同名，扩展名改为 .md
            const markdownPath = params.file_path.replace(/\.html?$/i, '.md') || params.file_path + '.md';
            // 确保目录存在
            const dir = path.dirname(markdownPath);
            await fs.promises.mkdir(dir, { recursive: true });
            // 保存 Markdown 文件
            await fs.promises.writeFile(markdownPath, markdown, 'utf-8');
            return {
                success: true,
                file_path: markdownPath,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: String(error),
                duration: Date.now() - startTime,
            };
        }
    }
    // ============================================
    // 高级操作
    // ============================================
    /**
     * 等待条件
     */
    async waitFor(params) {
        const startTime = Date.now();
        const timeout = params.timeout || 30000;
        if (params.selector) {
            const wc = this.webContents;
            if (!wc || wc?.isDestroyed?.()) {
                return { success: false, error: 'Browser not created or destroyed' };
            }
            const state = params.state || 'visible';
            // 使用 JSON.stringify 安全转义选择器
            const selectorJson = JSON.stringify(params.selector);
            try {
                await this.poll(async () => {
                    const result = await wc.executeJavaScript(`
              (function() {
                const selector = ${selectorJson};
                const el = document.querySelector(selector);
                if (!el) return { exists: false, visible: false };
                const style = window.getComputedStyle(el);
                const visible = style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0';
                return { exists: true, visible };
              })();
            `);
                    switch (state) {
                        case 'attached':
                            return result.exists;
                        case 'detached':
                            return !result.exists;
                        case 'visible':
                            return result.exists && result.visible;
                        case 'hidden':
                            return !result.exists || !result.visible;
                        default:
                            return result.exists;
                    }
                }, timeout, 100);
                return { success: true, duration: Date.now() - startTime };
            }
            catch (error) {
                return { success: false, error: String(error), duration: Date.now() - startTime };
            }
        }
        else if (params.timeout) {
            await this.sleep(params.timeout);
            return { success: true, duration: Date.now() - startTime };
        }
        return { success: false, error: 'Either selector or timeout is required' };
    }
    /**
     * 执行 JavaScript
     */
    async evaluate(params) {
        const startTime = Date.now();
        const wc = this.webContents;
        if (!wc || wc?.isDestroyed?.()) {
            return { success: false, error: 'Browser not created or destroyed', result: null };
        }
        try {
            const result = await wc.executeJavaScript(params.script);
            return { success: true, result, duration: Date.now() - startTime };
        }
        catch (error) {
            return {
                success: false,
                error: String(error),
                result: null,
                duration: Date.now() - startTime,
            };
        }
    }
    // ============================================
    // 工具方法
    // ============================================
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async poll(fn, timeout, interval) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await fn()) {
                return;
            }
            await this.sleep(interval);
        }
        throw new Error('Polling timeout');
    }
}
exports.BrowserController = BrowserController;
// 全局实例
let browserController = null;
/**
 * 获取或创建 BrowserController 实例
 */
function getBrowserController() {
    if (!browserController) {
        browserController = new BrowserController();
    }
    return browserController;
}
