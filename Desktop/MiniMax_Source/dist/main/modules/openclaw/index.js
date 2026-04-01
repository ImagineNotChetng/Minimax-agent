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
exports.getOpenClawViewController = getOpenClawViewController;
/**
 * OpenClaw WebContentsView 管理模块
 * 用于在 Electron 中嵌入 OpenClaw Gateway WebUI
 *
 * 参考 browser-agent-manager.ts 的设计：
 * - OpenClaw View 保持在 contentView 中，不移除
 * - 切换 Tab 时，通过层级顺序控制显示/隐藏
 */
const electron_1 = require("electron");
// import { exec } from 'child_process';
// import { promisify } from 'util';
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_1 = require("../../utils");
// const execAsync = promisify(exec);
const DEFAULT_GATEWAY_PORT = 18789;
const GATEWAY_URL = `http://127.0.0.1:${DEFAULT_GATEWAY_PORT}`;
const OPENCLAW_CONFIG_DIR = path.join(os.homedir(), '.openclaw');
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_CONFIG_DIR, 'openclaw.json');
const GATEWAY_CONFIG_PATH = path.join(OPENCLAW_CONFIG_DIR, 'gateway.json');
/**
 * OpenClaw WebContentsView 控制器类
 */
class OpenClawViewController {
    constructor() {
        this.webContentsView = null;
        this.parentWindow = null;
        // /**
        //  * 启动 Gateway
        //  * 参考官方文档: https://docs.openclaw.ai/cli/gateway
        //  *
        //  * 注意: 如果服务未加载（比如之前执行过 stop），start 会失败
        //  * 此时需要先 install 再 start
        //  *
        //  * 实际状态变化由轮询机制监听，这里只负责执行命令
        //  */
        // async startGateway(): Promise<{ success: boolean; error?: string }> {
        //   try {
        //     const { stdout, stderr } = await execAsync('openclaw gateway start', { timeout: 30000 });
        //     console.log('[OpenClaw] Gateway start output:', stdout, stderr);
        //     // 检查输出是否包含 "not loaded" 提示，说明需要先 install
        //     if (stdout.includes('not loaded') || stderr.includes('not loaded')) {
        //       await execAsync('openclaw gateway install', { timeout: 30000 });
        //       await execAsync('openclaw gateway start', { timeout: 30000 });
        //     }
        //     return { success: true };
        //   } catch (error) {
        //     console.error('[OpenClaw] Failed to start gateway:', error);
        //     return { success: false, error: String(error) };
        //   }
        // }
        // /**
        //  * 停止 Gateway
        //  * 参考官方文档: https://docs.openclaw.ai/cli/gateway
        //  *
        //  * 如果服务未加载（not loaded），说明 Gateway 不是通过服务管理器运行的，
        //  * 此时先 install 注册服务，再 stop
        //  *
        //  * 实际状态变化由轮询机制监听，这里只负责执行命令
        //  */
        // async stopGateway(): Promise<{ success: boolean; error?: string }> {
        //   try {
        //     const { stdout, stderr } = await execAsync('openclaw gateway stop', { timeout: 30000 });
        //     console.log('[OpenClaw] Gateway stop output:', stdout, stderr);
        //     // 如果服务未加载，先 install 再 stop
        //     if (stdout.includes('not loaded') || stderr.includes('not loaded')) {
        //       console.log('[OpenClaw] Service not loaded, installing first...');
        //       await execAsync('openclaw gateway install', { timeout: 30000 });
        //       await execAsync('openclaw gateway stop', { timeout: 30000 });
        //     }
        //     return { success: true };
        //   } catch (error) {
        //     console.error('[OpenClaw] Failed to stop gateway:', error);
        //     return { success: false, error: String(error) };
        //   }
        // }
        // /**
        //  * 重启 Gateway
        //  * 参考官方文档: https://docs.openclaw.ai/cli/gateway
        //  *
        //  * 如果服务未加载，先 install 注册服务，再 restart
        //  *
        //  * 实际状态变化由轮询机制监听，这里只负责执行命令
        //  */
        // async restartGateway(): Promise<{ success: boolean; error?: string }> {
        //   try {
        //     const { stdout, stderr } = await execAsync('openclaw gateway restart', { timeout: 30000 });
        //     console.log('[OpenClaw] Gateway restart output:', stdout, stderr);
        //     // 如果服务未加载，先 install 再 restart
        //     if (stdout.includes('not loaded') || stderr.includes('not loaded')) {
        //       console.log('[OpenClaw] Service not loaded, installing first...');
        //       await execAsync('openclaw gateway install', { timeout: 30000 });
        //       await execAsync('openclaw gateway restart', { timeout: 30000 });
        //     }
        //     return { success: true };
        //   } catch (error) {
        //     console.error('[OpenClaw] Failed to restart gateway:', error);
        //     return { success: false, error: String(error) };
        //   }
        // }
        // /**
        //  * 卸载 OpenClaw
        //  * 参考官方文档: https://docs.openclaw.ai/zh-CN/install/uninstall
        //  *
        //  * 步骤:
        //  * 1. 销毁 WebContentsView
        //  * 2. 停止 Gateway: openclaw gateway stop
        //  * 3. 卸载 Gateway 服务: openclaw gateway uninstall
        //  * 4. 删除状态+配置目录: rm -rf ~/.openclaw
        //  */
        // async uninstall(): Promise<{ success: boolean; error?: string }> {
        //   try {
        //     // 1. 先销毁 WebContentsView
        //     this.destroy();
        //     // 2. 停止 Gateway
        //     try {
        //       await execAsync('openclaw gateway stop', { timeout: 30000 });
        //     } catch (error) {
        //       // 如果 gateway 没有运行，stop 命令可能会失败，这是正常的
        //       console.error('[OpenClaw] Gateway stop result:', error);
        //     }
        //     // 3. 卸载 Gateway 服务
        //     try {
        //       await execAsync('openclaw gateway uninstall', { timeout: 60000 });
        //     } catch (error) {
        //       // 如果服务没有安装，uninstall 命令可能会失败，这是正常的
        //       console.error('[OpenClaw] Gateway uninstall result:', error);
        //     }
        //     // 4. 删除状态+配置目录
        //     const configDir = path.join(os.homedir(), '.openclaw');
        //     if (fs.existsSync(configDir)) {
        //       await fs.promises.rm(configDir, { recursive: true, force: true });
        //     }
        //     return { success: true };
        //   } catch (error) {
        //     console.error('[OpenClaw] Uninstall failed:', error);
        //     return { success: false, error: String(error) };
        //   }
        // }
    }
    /**
     * 获取 contentView（带窗口有效性检查）
     */
    get contentView() {
        if (!this.parentWindow || this.parentWindow.isDestroyed()) {
            return null;
        }
        return this.parentWindow.contentView;
    }
    /**
     * 安全地从 contentView 中移除 view
     */
    safeRemoveFromContentView(view) {
        if (!this.contentView)
            return;
        try {
            const children = this.contentView.children;
            if (children.includes(view)) {
                this.contentView.removeChildView(view);
            }
        }
        catch (error) {
            console.error('[OpenClawView] Failed to remove from contentView:', error);
        }
    }
    /**
     * 安全地添加 view 到 contentView
     */
    safeAddToContentView(view) {
        if (!this.contentView)
            return;
        try {
            const children = this.contentView.children;
            if (!children.includes(view)) {
                this.contentView.addChildView(view);
            }
        }
        catch (error) {
            console.error('[OpenClawView] Failed to add to contentView:', error);
        }
    }
    /**
     * 从配置文件读取 Gateway token
     */
    /**
     * 从配置文件读取 Gateway token
     * 优先从 gateway.json 读取，如果没有则从 openclaw.json 读取
     */
    getGatewayToken() {
        // 1. 先尝试从 openclaw.json 读取
        try {
            if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
                const content = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
                const config = JSON.parse(content);
                const token = config?.gateway?.auth?.token;
                if (token) {
                    return token;
                }
            }
        }
        catch (error) {
            console.error('[OpenClawView] Failed to read openclaw.json:', error);
        }
        // 2. 再尝试从 gateway.json 读取
        try {
            if (fs.existsSync(GATEWAY_CONFIG_PATH)) {
                const content = fs.readFileSync(GATEWAY_CONFIG_PATH, 'utf-8');
                const config = JSON.parse(content);
                const token = config?.gateway?.auth?.token;
                if (token) {
                    return token;
                }
            }
        }
        catch (error) {
            console.error('[OpenClawView] Failed to read gateway.json:', error);
        }
        return null;
    }
    /**
     * 获取带 token 的 Gateway URL
     */
    getGatewayUrlWithToken() {
        const token = this.getGatewayToken();
        if (token) {
            return `${GATEWAY_URL}/#token=${token}`;
        }
        return GATEWAY_URL;
    }
    /**
     * 检查 Gateway 是否可访问（HTTP 探测）
     */
    async checkGatewayAvailable() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(GATEWAY_URL, {
                method: 'HEAD',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取 OpenClaw Gateway 状态
     * 参考官方文档: https://docs.openclaw.ai/cli/gateway
     *
     * 状态判断逻辑:
     * 1. not-installed: ~/.openclaw 目录不存在
     * 2. not-init: ~/.openclaw/openclaw.json 不存在或无效
     * 3. running: Gateway 正在运行（HTTP 探测成功）
     * 4. stopped: 配置存在但 Gateway 未运行
     */
    async getGatewayStatus() {
        try {
            // 1. 检查 ~/.openclaw 目录是否存在
            if (!fs.existsSync(OPENCLAW_CONFIG_DIR)) {
                return 'not-installed';
            }
            // 2. 检查 openclaw.json 配置文件是否存在且有效
            if (!fs.existsSync(OPENCLAW_CONFIG_PATH)) {
                return 'not-init';
            }
            try {
                const configContent = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
                const config = JSON.parse(configContent);
                // 检查是否有 gateway 配置（说明已初始化）
                if (!config?.gateway) {
                    return 'not-init';
                }
            }
            catch {
                return 'not-init';
            }
            // 3. 检查 Gateway 是否正在运行
            const isRunning = await this.checkGatewayAvailable();
            if (isRunning) {
                return 'running';
            }
            // 4. 配置存在但 Gateway 未运行
            return 'stopped';
        }
        catch (error) {
            console.error('[OpenClaw] Failed to get gateway status:', error);
            // 发生异常时无法确定状态，保守返回 not-installed
            return 'not-installed';
        }
    }
    /**
     * 使用 CDP 截图
     * 截图保存到 ~/.openclaw/user-screenshot/ 目录
     * 同时返回 base64 数据供渲染进程创建 File 对象
     */
    async takeScreenshot() {
        try {
            if (!this.webContentsView?.webContents) {
                return { success: false, error: 'WebContentsView not created' };
            }
            const webContents = this.webContentsView.webContents;
            if (webContents?.isDestroyed()) {
                return { success: false, error: 'WebContents is destroyed' };
            }
            // 确保截图目录存在
            const screenshotDir = path.join(OPENCLAW_CONFIG_DIR, 'user-screenshot');
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            // 使用 CDP 截图
            const debugger_ = webContents.debugger;
            // 附加 debugger
            if (!debugger_.isAttached()) {
                debugger_.attach('1.3');
            }
            try {
                // 使用 Page.captureScreenshot 截图
                const result = await debugger_.sendCommand('Page.captureScreenshot', {
                    format: 'png',
                });
                // 生成文件名（时间戳）
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `screenshot-${timestamp}.png`;
                const filePath = path.join(screenshotDir, fileName);
                // 保存截图
                const buffer = Buffer.from(result.data, 'base64');
                fs.writeFileSync(filePath, buffer);
                return {
                    success: true,
                    filePath,
                    fileName,
                    base64: result.data, // 返回 base64 数据
                };
            }
            finally {
                // 分离 debugger
                if (debugger_.isAttached()) {
                    debugger_.detach();
                }
            }
        }
        catch (error) {
            console.error('[OpenClaw] Failed to take screenshot:', error);
            return { success: false, error: String(error) };
        }
    }
    /**
     * 检查 webContentsView 是否有效（存在且未被销毁）
     */
    isViewValid() {
        if (!this.webContentsView?.webContents)
            return false;
        try {
            // 尝试访问 webContents，如果已销毁会抛出异常
            return !this.webContentsView.webContents?.isDestroyed?.();
        }
        catch {
            return false;
        }
    }
    /**
     * 创建 OpenClaw WebContentsView
     */
    async create(window, bounds) {
        try {
            // 检查窗口是否有效
            if (!window || window?.isDestroyed?.()) {
                return { success: false, error: 'Window is destroyed' };
            }
            // 如果 parentWindow 变了（窗口重建），需要清理旧的 view
            if (this.parentWindow && this.parentWindow !== window) {
                this.destroy();
            }
            // 幂等：如果已创建且有效，直接返回
            if (this.isViewValid()) {
                return { success: true };
            }
            // 如果存在但已销毁，先清理
            if (this.webContentsView) {
                try {
                    this.safeRemoveFromContentView(this.webContentsView);
                }
                catch {
                    // 忽略清理错误
                }
                this.webContentsView = null;
            }
            this.parentWindow = window;
            this.webContentsView = new electron_1.WebContentsView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: true,
                },
            });
            this.webContentsView.setBounds(bounds);
            // 始终添加到 contentView，通过层级顺序控制显示/隐藏
            this.safeAddToContentView(this.webContentsView);
            const url = this.getGatewayUrlWithToken();
            utils_1.logger.info(`[OpenClawView] Loading URL: ${url}`);
            // 先获取网关状态，如果不是 running，则先打开空网页，保证 view 创建不失败
            const status = await this.getGatewayStatus();
            if (status !== 'running') {
                await this.webContentsView.webContents.loadURL('about:blank');
            }
            else {
                await this.webContentsView.webContents.loadURL(url);
            }
            return { success: true };
        }
        catch (error) {
            console.error('[OpenClawView] Failed to create:', error);
            // 创建失败时清理状态
            this.webContentsView = null;
            return { success: false, error: String(error) };
        }
    }
    /**
     * 销毁 OpenClaw WebContentsView
     */
    destroy() {
        try {
            if (this.webContentsView?.webContents) {
                this.safeRemoveFromContentView(this.webContentsView);
                this.webContentsView.webContents.close();
                this.webContentsView = null;
            }
            this.parentWindow = null;
            return { success: true };
        }
        catch (error) {
            console.error('[OpenClawView] Failed to destroy:', error);
            this.webContentsView = null;
            this.parentWindow = null;
            return { success: false, error: String(error) };
        }
    }
    /**
     * 设置边界
     * view 始终保持在 contentView 中，通过层级顺序控制显示/隐藏
     */
    setBounds(bounds) {
        try {
            if (!this.webContentsView) {
                return { success: true };
            }
            this.webContentsView.setBounds(bounds);
            return { success: true };
        }
        catch (error) {
            console.error('[OpenClawView] Failed to set bounds:', error);
            return { success: false, error: String(error) };
        }
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
     * 重新加载 Gateway URL
     * 用于 Gateway 状态变为 running 时刷新页面
     */
    reloadView() {
        if (!this.isViewValid())
            return;
        try {
            const url = this.getGatewayUrlWithToken();
            utils_1.logger.info(`[OpenClawView] Reloading URL: ${url}`);
            this.webContentsView?.webContents?.loadURL?.(url);
        }
        catch (error) {
            //
        }
    }
    /**
     * 获取 view 实例
     */
    getView() {
        return this.webContentsView;
    }
    /**
     * 获取父窗口
     */
    getParentWindow() {
        return this.parentWindow;
    }
    /**
     * 检查是否已创建且有效
     */
    isCreated() {
        return this.isViewValid();
    }
}
// 全局单例
let controllerInstance = null;
/**
 * 获取 OpenClaw View 控制器单例
 */
function getOpenClawViewController() {
    if (!controllerInstance) {
        controllerInstance = new OpenClawViewController();
    }
    return controllerInstance;
}
