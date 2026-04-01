"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDialogWithoutOverlay = showDialogWithoutOverlay;
exports.getWindowFromEvent = getWindowFromEvent;
exports.resolveParentWindow = resolveParentWindow;
/**
 * 对话框相关工具函数
 */
const electron_1 = require("electron");
const screen_1 = require("./screen");
/**
 * 显示对话框而不产生遮罩层
 * 使用隐藏的临时窗口作为对话框的 parent，避免模态遮罩
 *
 * 定位策略：
 * - Dock/任务栏在底部时：临时窗口定位到 workArea 底部居中，使对话框吸附在任务栏上方
 * - Dock 在侧边或无 Dock 时：以父窗口为参考定位
 */
async function showDialogWithoutOverlay(parentWindow, dialogFn, options) {
    if (!parentWindow) {
        return dialogFn(undefined);
    }
    const display = electron_1.screen.getPrimaryDisplay();
    const { workArea } = display;
    const dockInfo = (0, screen_1.getDockInfo)();
    // 计算临时窗口位置
    let x, y;
    if (dockInfo.position === 'bottom') {
        // Dock/任务栏 在底部：窗口放在 workArea 底部居中，使对话框吸附任务栏上方
        x = Math.round(workArea.x + workArea.width / 2);
        y = workArea.y + workArea.height - 1; // 紧贴 workArea 底部
    }
    else {
        // Dock 在侧边或无 Dock：以父窗口为参考
        const bounds = parentWindow.getBounds();
        x = Math.round(bounds.x + bounds.width / 2);
        y = Math.round(bounds.y + bounds.height - 100);
    }
    // 禁用父窗口鼠标交互（模拟模态效果，阻止用户在文件选择期间操作小窗）
    parentWindow.setIgnoreMouseEvents(true);
    // 创建隐藏的临时窗口，后期可以拓展自定义参数
    const tempWindow = new electron_1.BrowserWindow({
        ...options,
        x,
        y,
        width: 1,
        height: 1,
        show: false,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        focusable: false,
        alwaysOnTop: true,
    });
    try {
        const result = await dialogFn(tempWindow);
        return result;
    }
    finally {
        // 恢复父窗口鼠标交互
        if (!parentWindow.isDestroyed()) {
            parentWindow.setIgnoreMouseEvents(false);
        }
        tempWindow.destroy();
    }
}
/**
 * 根据 webContents 获取所属的 BrowserWindow
 * 支持主窗口和 WebContentsView
 */
function getWindowFromEvent(event) {
    // 尝试从 event.sender 获取窗口
    const senderWindow = electron_1.BrowserWindow.fromWebContents(event.sender);
    if (senderWindow) {
        return senderWindow;
    }
    // 如果 sender 是 WebContentsView，尝试获取其父窗口
    // WebContentsView 的 webContents 没有直接关联 BrowserWindow
    // 但我们可以遍历所有窗口找到包含这个 webContents 的窗口
    const allWindows = electron_1.BrowserWindow.getAllWindows();
    for (const win of allWindows) {
        // 检查主窗口的 webContents
        if (win.webContents.id === event.sender.id) {
            return win;
        }
        // 检查子视图
        const views = win.contentView?.children || [];
        for (const view of views) {
            if ('webContents' in view && view.webContents?.id === event.sender.id) {
                return win;
            }
        }
    }
    return null;
}
/**
 * 解析对话框的父窗口
 *
 * 策略：
 * 1. 优先从 IPC 事件中获取发送方窗口（最准确）
 * 2. 尝试获取当前焦点窗口（用户正在交互的窗口）
 * 3. 回退到主窗口
 *
 * @param event IPC 事件
 * @param getMainWindow 获取主窗口的函数
 */
function resolveParentWindow(event, getMainWindow) {
    // 1. 优先从事件中获取发送方窗口
    const fromEvent = getWindowFromEvent(event);
    if (fromEvent)
        return fromEvent;
    // 2. 尝试获取当前焦点窗口（自动处理所有窗口类型，包括 MiniChat）
    const focused = electron_1.BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed())
        return focused;
    // 3. 回退到主窗口
    return getMainWindow();
}
