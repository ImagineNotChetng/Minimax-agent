"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOpenClawIPC = setupOpenClawIPC;
/**
 * OpenClaw WebContentsView IPC 处理
 *
 * 参考 browser-agent-manager.ts 的设计：
 * - OpenClaw View 保持在 contentView 中，不移除、不移到屏幕外
 * - 切换 Tab 时，通过层级顺序控制显示/隐藏
 * - 切换到 OpenClaw Tab 时：bringToFront 移到最上层
 * - 切换到其他 Tab 时：不需要做任何事，Tab View 会自然覆盖
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const manager_1 = require("../windows/manager");
const tabs_1 = require("../modules/tabs");
const openclaw_1 = require("../modules/openclaw");
const logger_1 = __importDefault(require("../utils/logger"));
// 记录 OpenClaw View 所属的 Tab ID
let openClawTabId = null;
// 状态监听定时器
let statusPollingTimer = null;
// 上一次的状态（用于检测变化）
let lastGatewayStatus = null;
// 状态轮询间隔（毫秒）
const STATUS_POLLING_INTERVAL = 5000;
/**
 * 通过 IPC event 获取对应的 tabId
 */
function getTabIdFromEvent(event) {
    const tabController = (0, tabs_1.getTabController)();
    return tabController.getTabIdByWebContentsId(event.sender.id);
}
/**
 * 设置 OpenClaw IPC 处理器
 */
function setupOpenClawIPC(getMainWindow) {
    const controller = (0, openclaw_1.getOpenClawViewController)();
    const tabController = (0, tabs_1.getTabController)();
    // 监听 Tab 激活事件
    // 参考 browser-agent-manager.ts 的 setActiveTab 设计
    tabController.onTabActivated((tabId) => {
        if (!controller.isCreated())
            return;
        // 切回 OpenClaw Tab 时，将 view 移到最上层
        // 切换到其他 Tab 时不需要做任何事，Tab View 会自然覆盖 OpenClaw View
        if (tabId === openClawTabId) {
            controller.bringToFront();
        }
    });
    // 创建 OpenClaw WebContentsView
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_VIEW_CREATE, async (event, bounds) => {
        const mainWindow = manager_1.windowManager.getWindowByType('main') || getMainWindow();
        if (!mainWindow) {
            return { success: false, error: 'Main window not found' };
        }
        // 记录 OpenClaw 所属的 Tab
        openClawTabId = getTabIdFromEvent(event);
        const result = await controller.create(mainWindow, bounds);
        if (!result.success) {
            return result;
        }
        // 创建后将 OpenClaw View 移到最上层
        tabController.bringActiveTabToFront();
        controller.bringToFront();
        return result;
    });
    // 销毁 OpenClaw WebContentsView
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_VIEW_DESTROY, () => {
        openClawTabId = null;
        return controller.destroy();
    });
    // 设置边界
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_VIEW_SET_BOUNDS, (_, bounds) => {
        return controller.setBounds(bounds);
    });
    // 启动 Gateway
    // ipcMain.handle(IPC_CHANNELS.OPENCLAW_GATEWAY_START, async () => {
    //   return controller.startGateway();
    // });
    // // 停止 Gateway
    // ipcMain.handle(IPC_CHANNELS.OPENCLAW_GATEWAY_STOP, async () => {
    //   return controller.stopGateway();
    // });
    // // 重启 Gateway
    // ipcMain.handle(IPC_CHANNELS.OPENCLAW_GATEWAY_RESTART, async () => {
    //   return controller.restartGateway();
    // });
    // // 卸载 OpenClaw
    // ipcMain.handle(IPC_CHANNELS.OPENCLAW_UNINSTALL, async () => {
    //   openClawTabId = null;
    //   return controller.uninstall();
    // });
    // 获取 Gateway 状态
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_GET_STATUS, async () => {
        return controller.getGatewayStatus();
    });
    // 截图
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_TAKE_SCREENSHOT, async () => {
        return controller.takeScreenshot();
    });
    // 开始监听 Gateway 状态变化
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_START_STATUS_POLLING, async () => {
        // 如果已经在轮询，先停止
        if (statusPollingTimer) {
            clearInterval(statusPollingTimer);
        }
        // 立即获取一次状态
        lastGatewayStatus = await controller.getGatewayStatus();
        // 开始轮询
        statusPollingTimer = setInterval(async () => {
            const currentStatus = await controller.getGatewayStatus();
            // 只有状态变化时才通知
            if (currentStatus !== lastGatewayStatus) {
                logger_1.default.info(`[OpenClaw] Gateway status changed: ${lastGatewayStatus} -> ${currentStatus}`);
                lastGatewayStatus = currentStatus;
                // 通知所有 Tab
                const activeTabView = tabController.getActiveTabView();
                if (activeTabView && !activeTabView?.webContents?.isDestroyed?.()) {
                    activeTabView.webContents.send(constants_1.IPC_CHANNELS.OPENCLAW_STATUS_CHANGED, currentStatus);
                }
                // 如果当前状态是running，需要重新加载 WebContentsView，即 gatewayurl
                if (currentStatus === 'running') {
                    controller.reloadView();
                }
            }
        }, STATUS_POLLING_INTERVAL);
        return { success: true, status: lastGatewayStatus };
    });
    // 停止监听 Gateway 状态变化
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPENCLAW_STOP_STATUS_POLLING, () => {
        if (statusPollingTimer) {
            clearInterval(statusPollingTimer);
            statusPollingTimer = null;
        }
        return { success: true };
    });
}
