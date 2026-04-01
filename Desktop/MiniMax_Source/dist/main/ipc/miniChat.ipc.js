"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMiniChatIPC = setupMiniChatIPC;
/**
 * Mini Chat Window IPC 处理器
 * 处理小窗的创建、关闭等操作
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const miniChatWindow_1 = require("../windows/miniChatWindow");
const windows_1 = require("../windows");
const tabs_1 = require("../modules/tabs");
const window_1 = require("../utils/window");
/**
 * 设置 Mini Chat Window 相关的 IPC 处理器
 */
function setupMiniChatIPC() {
    /**
     * 创建或显示小窗
     * @param chatId - 可选，指定要显示的聊天 ID
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_CREATE, async (_, chatId) => {
        try {
            await (0, miniChatWindow_1.createMiniChatWindow)(chatId);
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to create window:', error);
            return { success: false, error: String(error) };
        }
    });
    /**
     * 关闭小窗
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_CLOSE, async () => {
        try {
            (0, miniChatWindow_1.closeMiniChatWindow)();
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to close window:', error);
            return { success: false, error: String(error) };
        }
    });
    /**
     * 显示小窗
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_SHOW, async () => {
        try {
            (0, miniChatWindow_1.showMiniChatWindow)();
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to show window:', error);
            return { success: false, error: String(error) };
        }
    });
    /**
     * 隐藏小窗
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_HIDE, async () => {
        try {
            (0, miniChatWindow_1.hideMiniChatWindow)();
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to hide window:', error);
            return { success: false, error: String(error) };
        }
    });
    /**
     * 调整小窗高度
     * @param height - 目标高度
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_RESIZE, async (_, height, resizable) => {
        try {
            (0, miniChatWindow_1.resizeMiniChatWindow)(height, resizable);
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to resize window:', error);
            return { success: false, error: String(error) };
        }
    });
    /**
     * 打开主窗口并执行相应操作
     * @param chatId - 可选，指定要显示的聊天 ID
     *   - chatId > 0: 参考 sidebar 的 handleSelectChat，打开指定对话
     *   - chatId <= 0 或 null/undefined: 参考 useAddNewChat，创建新对话
     */
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.MINI_CHAT_MAXIMIZE, async (_, chatId) => {
        try {
            console.log('[MiniChat IPC] Bringing main window to front');
            // 将主窗口带到前台，没有的话就创建一个
            await (0, window_1.bringToFrontAsync)();
            // 等待窗口完全显示
            await new Promise((resolve) => setTimeout(resolve, 100));
            // 优先使用 windowManager.getWindowByType('main')，确保获取到正确的主窗口
            const mainWindow = windows_1.windowManager.getWindowByType('main') || (0, windows_1.getMainWindow)();
            if (!mainWindow) {
                console.error('[MiniChat IPC] Main window not found');
                return { success: false, error: 'Main window not found' };
            }
            // 获取 MainWindow 的 Tab Controller
            const tabController = (0, tabs_1.getTabController)();
            // 验证 TabController 是否绑定到 MainWindow
            const checkMainWindowValid = () => {
                const parentWindow = tabController.getParentWindow();
                if (!parentWindow || parentWindow !== mainWindow) {
                    console.error('[MiniChat IPC] TabController is not bound to MainWindow', 'parentWindow:', parentWindow?.id, 'mainWindow:', mainWindow.id);
                    return { success: false, error: 'TabController not bound to MainWindow' };
                }
                else {
                    return { success: true };
                }
            };
            let checkResult = checkMainWindowValid();
            if (!checkResult.success) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                checkResult = checkMainWindowValid();
                if (!checkResult.success) {
                    return checkResult;
                }
            }
            // 获取当前激活的 tab
            const activeTabView = tabController.getActiveTabView();
            // 安全检查：确保 activeTabView 存在且未销毁
            if (!activeTabView || activeTabView.webContents.isDestroyed()) {
                console.warn('[MiniChat IPC] No active tab view found or it is destroyed');
                return { success: false, error: 'No active tab view' };
            }
            // 向激活的 tab (MainWindow 中包含 Sidebar 的页面) 发送消息
            activeTabView.webContents.send(constants_1.IPC_CHANNELS.MAIN_WINDOW_SELECT_CHAT, chatId);
            console.log('[MiniChat IPC] Messages sent to active tab in MainWindow');
            return { success: true };
        }
        catch (error) {
            console.error('[MiniChat IPC] Failed to open main window:', error);
            return { success: false, error: String(error) };
        }
    });
}
