"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLoginMenu = setupLoginMenu;
exports.setupMenu = setupMenu;
/**
 * 应用菜单模块
 */
const electron_1 = require("electron");
const config_1 = require("../../config");
const constants_1 = require("../../config/constants");
const window_1 = require("../../utils/window");
const tabs_1 = require("../tabs");
const storage_ipc_1 = require("../../ipc/storage.ipc");
const miniChatWindow_1 = require("../../windows/miniChatWindow");
const logViewerWindow_1 = require("../../windows/logViewerWindow");
const system_ipc_1 = require("../../ipc/system.ipc");
const tool_1 = require("../../utils/tool");
/**
 * 通知渲染进程打开更新弹窗
 * 发送到当前激活的 tab 对应的 webContents
 */
function notifyRendererToOpenUpdateModal() {
    const tabController = (0, tabs_1.getTabController)();
    const activeTabView = tabController?.getActiveTabView();
    if (activeTabView && !activeTabView.webContents.isDestroyed()) {
        activeTabView.webContents.send(constants_1.IPC_CHANNELS.UPDATER_OPEN_MODAL);
    }
}
/**
 * 设置登录窗口的简化菜单
 */
function setupLoginMenu() {
    const isMac = process.platform === 'darwin';
    const isEn = (0, tool_1.getIsEn)();
    const template = [
        // 应用菜单 (仅 macOS)
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        {
                            role: 'about',
                            label: isEn ? 'About MiniMax Agent' : '关于 MiniMax Agent',
                        },
                        { type: 'separator' },
                        { role: 'hide', label: isEn ? 'Hide' : '隐藏' },
                        { role: 'hideOthers', label: isEn ? 'Hide Others' : '隐藏其他' },
                        { role: 'unhide', label: isEn ? 'Unhide' : '显示所有' },
                        { type: 'separator' },
                        { role: 'quit', label: isEn ? 'Quit' : '退出' },
                    ],
                },
            ]
            : []),
        // 编辑菜单（保留基本编辑功能）
        {
            label: isEn ? 'Edit' : '编辑',
            submenu: [
                { role: 'undo', label: isEn ? 'Undo' : '撤销' },
                { role: 'redo', label: isEn ? 'Redo' : '重做' },
                { type: 'separator' },
                { role: 'cut', label: isEn ? 'Cut' : '剪切' },
                { role: 'copy', label: isEn ? 'Copy' : '复制' },
                { role: 'paste', label: isEn ? 'Paste' : '粘贴' },
                { role: 'selectAll', label: isEn ? 'Select All' : '全选' },
            ],
        },
        // 窗口菜单
        {
            label: isEn ? 'Window' : '窗口',
            submenu: [
                { role: 'minimize', label: isEn ? 'Minimize' : '最小化' },
                ...(isMac
                    ? [{ role: 'close', label: isEn ? 'Close' : '关闭' }]
                    : [{ role: 'quit', label: isEn ? 'Quit' : '退出' }]),
            ],
        },
        // 帮助菜单
        {
            label: isEn ? 'Help' : '帮助',
            submenu: [
                {
                    label: isEn ? 'Contribute' : '贡献',
                    click: async () => {
                        await electron_1.shell.openExternal('https://minimax-contributor-program.space.minimax.io/');
                    },
                },
                {
                    label: isEn ? 'Docs' : '产品文档',
                    click: async () => {
                        await electron_1.shell.openExternal(`${constants_1.DOMAIN_URL}/docs/changelog`);
                    },
                },
                // 线上/预发环境上传日志
                ...(config_1.isProd || config_1.isStaging || config_1.isTest
                    ? [
                        { type: 'separator' },
                        {
                            label: isEn ? 'Upload Logs' : '上传日志',
                            click: async () => {
                                const result = await (0, system_ipc_1.uploadLog)();
                                if (result.success) {
                                    // 复制到粘贴板
                                    const content = `uid: ${(0, storage_ipc_1.getUserInfo)()?.realUserID}\nuploadId: ${result.uploadId}`;
                                    electron_1.dialog.showMessageBox({
                                        message: content,
                                    });
                                }
                            },
                        },
                    ]
                    : []),
                // 打开日志（仅测试和预发环境）
                ...(config_1.isStaging || config_1.isTest
                    ? [
                        { type: 'separator' },
                        {
                            label: isEn ? 'Open Logs' : '打开日志',
                            click: async () => {
                                await (0, logViewerWindow_1.createLogViewerWindow)();
                            },
                        },
                    ]
                    : []),
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
/**
 * 设置主窗口的完整菜单
 */
function setupMenu() {
    const isMac = process.platform === 'darwin';
    const isEn = (0, tool_1.getIsEn)();
    const template = [
        // 应用菜单 (仅 macOS)
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        {
                            role: 'about',
                            label: isEn ? 'About MiniMax Agent' : '关于 MiniMax Agent',
                        },
                        { type: 'separator' },
                        {
                            label: isEn ? 'Settings' : '设置',
                            accelerator: 'CmdOrCtrl+,',
                            click: () => {
                                // 先检查 activeWebContents 是否存在，避免在窗口状态异常时创建新窗口
                                const activeWebContents = (0, tabs_1.getTabController)().getActiveWebContents();
                                if (activeWebContents) {
                                    (0, window_1.bringToFront)();
                                    activeWebContents.send(constants_1.IPC_CHANNELS.MENU_OPEN_SETTINGS);
                                }
                            },
                        },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide', label: isEn ? 'Hide' : '隐藏' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit', label: isEn ? 'Quit' : '退出' },
                    ],
                },
            ]
            : []),
        // 文件菜单
        {
            label: isEn ? 'File' : '文件',
            submenu: [
                {
                    label: isEn ? 'New Chat' : '新建对话',
                    accelerator: 'CommandOrControl+K',
                    click: () => {
                        // 先检查 activeWebContents 是否存在，避免在窗口状态异常时创建新窗口
                        const activeWebContents = (0, tabs_1.getTabController)().getActiveWebContents();
                        if (activeWebContents) {
                            (0, window_1.bringToFront)();
                            activeWebContents.send(constants_1.IPC_CHANNELS.MENU_NEW_CHAT);
                        }
                    },
                },
                // 小窗口
                {
                    label: isEn ? 'New Mini Chat' : '新建小窗',
                    accelerator: 'Alt+A',
                    click: () => {
                        (0, miniChatWindow_1.createMiniChatWindow)();
                    },
                },
                {
                    label: isEn ? 'New Tab' : '新建标签页',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => {
                        (0, tabs_1.getTabController)().createTab();
                    },
                },
                {
                    label: isEn ? 'Close Tab' : '关闭标签页',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        (0, tabs_1.getTabController)().requestCloseActiveTab();
                    },
                },
            ],
        },
        // 编辑菜单
        {
            label: isEn ? 'Edit' : '编辑',
            submenu: [
                { role: 'undo', label: isEn ? 'Undo' : '撤销' },
                { role: 'redo', label: isEn ? 'Redo' : '重做' },
                { type: 'separator' },
                { role: 'cut', label: isEn ? 'Cut' : '剪切' },
                { role: 'copy', label: isEn ? 'Copy' : '复制' },
                { role: 'paste', label: isEn ? 'Paste' : '粘贴' },
                { role: 'delete', label: isEn ? 'Delete' : '删除' },
                { role: 'selectAll', label: isEn ? 'Select All' : '全选' },
            ],
        },
        // 视图菜单
        {
            label: isEn ? 'Window' : '窗口',
            submenu: [
                { role: 'minimize', label: isEn ? 'Minimize' : '最小化' },
                { role: 'togglefullscreen', label: isEn ? 'Toggle Fullscreen' : '切换全屏' },
                { type: 'separator' },
                { role: 'reload', label: isEn ? 'Reload' : '重新加载' },
                { type: 'separator' },
                isMac
                    ? { role: 'close', label: isEn ? 'Close' : '关闭' }
                    : { role: 'quit', label: isEn ? 'Quit' : '退出' },
            ],
        },
        // 帮助菜单
        {
            label: isEn ? 'Help' : '帮助',
            submenu: [
                {
                    label: isEn ? 'Contribute' : '贡献',
                    click: async () => {
                        await electron_1.shell.openExternal('https://minimax-contributor-program.space.minimax.io/');
                    },
                },
                {
                    label: isEn ? 'Docs' : '产品文档',
                    click: async () => {
                        await electron_1.shell.openExternal(`${constants_1.DOMAIN_URL}/docs/changelog`);
                    },
                },
                // 检查更新
                ...(config_1.isDev
                    ? []
                    : [
                        {
                            label: isEn ? 'Check for Updates' : '检查更新',
                            click: () => {
                                // 通知渲染进程打开更新弹窗，由 React UI 处理
                                notifyRendererToOpenUpdateModal();
                            },
                        },
                    ]),
                // 线上/预发环境上传日志
                ...(config_1.isProd || config_1.isStaging || config_1.isTest
                    ? [
                        { type: 'separator' },
                        {
                            label: isEn ? 'Upload Logs' : '上传日志',
                            click: async () => {
                                const result = await (0, system_ipc_1.uploadLog)();
                                if (result.success) {
                                    // 复制到粘贴板
                                    const content = `uid: ${(0, storage_ipc_1.getUserInfo)()?.realUserID}\nuploadId: ${result.uploadId}`;
                                    electron_1.dialog.showMessageBox({
                                        message: content,
                                    });
                                }
                            },
                        },
                    ]
                    : []),
                // 打开日志（仅测试和预发环境）
                ...(config_1.isStaging || config_1.isTest
                    ? [
                        { type: 'separator' },
                        {
                            label: isEn ? 'Open Logs' : '打开日志',
                            click: async () => {
                                await (0, logViewerWindow_1.createLogViewerWindow)();
                            },
                        },
                    ]
                    : []),
            ],
        },
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
