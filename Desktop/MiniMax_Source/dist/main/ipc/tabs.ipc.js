"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTabIPC = setupTabIPC;
/**
 * Tab Controller IPC 处理
 * 处理多 Tab 的 IPC 通信
 */
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const tabs_1 = require("../modules/tabs");
const constants_1 = require("../config/constants");
const windows_1 = require("../windows");
/**
 * 设置 Tab Controller IPC 处理器
 */
function setupTabIPC(getMainWindow) {
    const controller = (0, tabs_1.getTabController)();
    // 获取 preload 脚本路径
    const getPreloadPath = () => {
        return path_1.default.join(__dirname, '..', 'preload.js');
    };
    // 初始化
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_INIT, async (_, params) => {
        // 优先使用 main 类型的窗口，确保 TabController 绑定到正确的窗口
        const mainWindow = windows_1.windowManager.getWindowByType('main') || getMainWindow();
        if (!mainWindow) {
            return { success: false, error: 'Main window not found' };
        }
        // 验证窗口类型，确保不会绑定到 login 或 onboarding 窗口
        const windowType = windows_1.windowManager.getTypeByWindowId(mainWindow.id);
        if (windowType && windowType !== 'main') {
            return { success: false, error: `Invalid window type: ${windowType}, expected 'main'` };
        }
        const preloadPath = getPreloadPath();
        return controller.init(mainWindow, params.bounds, preloadPath);
    });
    // 销毁
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_DESTROY, async () => {
        return controller.destroy();
    });
    // 设置边界
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_SET_BOUNDS, async (_, bounds) => {
        controller.setBounds(bounds);
        return { success: true };
    });
    // 创建新 Tab
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_CREATE_TAB, async (_, url) => {
        return controller.createTab(url);
    });
    // 关闭 Tab
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_CLOSE_TAB, async (_, tabId) => {
        return controller.closeTab(tabId);
    });
    // 激活 Tab
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_ACTIVATE_TAB, async (_, tabId) => {
        return controller.activateTab(tabId);
    });
    // 设置 Tab 的 parentChatId
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_SET_PARENT_CHAT_ID, async (event, parentChatId) => {
        // 通过 event.sender.id 获取调用者所在的 tabId
        const tabId = controller.getTabIdByWebContentsId(event.sender.id);
        if (!tabId) {
            return { success: false, error: 'Tab not found for this webContents' };
        }
        return controller.setTabParentChatId(tabId, parentChatId);
    });
    // 通过 parentChatId 查找已打开该对话的 Tab
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_FIND_TAB_BY_PARENT_CHAT_ID, async (_, parentChatId) => {
        const tabId = controller.findTabByParentChatId(parentChatId);
        return { success: true, tabId };
    });
    // 请求关闭 Tab（带确认流程）
    // 主窗口 Tab 栏调用，获取目标 Tab 的 parentChatId
    // 如果有 parentChatId，则向激活 Tab 发送确认事件让其检查运行状态并显示弹窗
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_REQUEST_CLOSE_TAB, async (_, tabId) => {
        const { parentChatId } = controller.requestCloseTab(tabId);
        if (parentChatId !== null) {
            // 有关联的对话，向激活 Tab 发送确认关闭事件
            controller.sendConfirmCloseTabToActiveTab(tabId, parentChatId);
            return { success: true, needConfirm: true, parentChatId };
        }
        // 没有关联的对话，可以直接关闭
        return { success: true, needConfirm: false };
    });
    // 设置当前 tab 是否是 OpenClaw 页面
    // 由渲染进程调用，因为 OpenClaw 对话页路由是 /chat，无法通过 URL 判断
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_SET_IS_OPENCLAW_TAB, async (event, isOpenClaw) => {
        const tabId = controller.getTabIdByWebContentsId(event.sender.id);
        if (!tabId) {
            return { success: false, error: 'Tab not found for this webContents' };
        }
        controller.setIsOpenClawTab(tabId, isOpenClaw);
        return { success: true };
    });
    // 查找已打开 OpenClaw 页面的 Tab
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TAB_BROWSER_FIND_OPENCLAW_TAB, async () => {
        const tabId = controller.findOpenClawTab();
        return { success: true, tabId };
    });
}
