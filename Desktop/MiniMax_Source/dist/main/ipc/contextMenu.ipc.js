"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupContextMenuIPC = setupContextMenuIPC;
/**
 * 右键菜单 IPC 处理器
 * 为渲染进程提供文字选中后的右键复制功能
 */
const electron_1 = require("electron");
const tool_1 = require("../utils/tool");
/**
 * 为 WebContents 设置右键菜单
 */
function setupContextMenuForWebContents(webContents) {
    webContents.on('context-menu', (event, params) => {
        const isEn = (0, tool_1.getIsEn)();
        const menu = new electron_1.Menu();
        // 如果有选中的文字，显示复制选项
        if (params.selectionText) {
            menu.append(new electron_1.MenuItem({
                label: isEn ? 'Copy' : '复制',
                role: 'copy',
            }));
        }
        // 如果是可编辑区域，显示粘贴选项
        if (params.isEditable) {
            menu.append(new electron_1.MenuItem({
                label: isEn ? 'Paste' : '粘贴',
                role: 'paste',
            }));
            // 如果有选中文字，显示剪切选项
            if (params.selectionText) {
                menu.insert(0, new electron_1.MenuItem({
                    label: isEn ? 'Cut' : '剪切',
                    role: 'cut',
                }));
            }
            // 全选
            menu.append(new electron_1.MenuItem({
                label: isEn ? 'Select All' : '全选',
                role: 'selectAll',
            }));
        }
        // 只有当菜单有项目时才显示
        if (menu.items.length > 0) {
            menu.popup();
        }
    });
}
/**
 * 设置右键菜单 IPC
 * 监听所有新创建的 WebContents，为其添加右键菜单支持
 */
function setupContextMenuIPC() {
    // 监听所有新创建的 WebContents
    electron_1.app.on('web-contents-created', (_, webContents) => {
        setupContextMenuForWebContents(webContents);
    });
    // 为已存在的窗口设置右键菜单
    electron_1.BrowserWindow.getAllWindows().forEach((window) => {
        setupContextMenuForWebContents(window.webContents);
    });
}
