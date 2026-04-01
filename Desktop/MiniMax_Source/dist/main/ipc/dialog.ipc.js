"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDialogIPC = setupDialogIPC;
/**
 * 对话框 IPC 处理
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const dialog_1 = require("../utils/dialog");
/**
 * 设置对话框 IPC 处理器
 */
function setupDialogIPC(getMainWindow) {
    // 选择工作目录
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (event, options) => {
        const parentWindow = (0, dialog_1.resolveParentWindow)(event, getMainWindow);
        const showDialogFn = (win) => electron_1.dialog.showOpenDialog(win || {}, {
            title: options?.title || 'Select Directory',
            defaultPath: options?.defaultPath,
            buttonLabel: options?.buttonLabel || 'Select',
            properties: ['openDirectory', 'createDirectory'],
        });
        const result = options?.withoutOverlay
            ? await (0, dialog_1.showDialogWithoutOverlay)(parentWindow, showDialogFn)
            : await showDialogFn(parentWindow || {});
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, path: null, canceled: true };
        }
        return {
            success: true,
            path: result.filePaths[0],
            canceled: false,
        };
    });
    // 选择文件
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DIALOG_SELECT_FILE, async (event, options) => {
        const parentWindow = (0, dialog_1.resolveParentWindow)(event, getMainWindow);
        console.log('parentWindow', parentWindow);
        const properties = ['openFile'];
        if (options?.multiSelections) {
            properties.push('multiSelections');
        }
        const showDialogFn = (win) => electron_1.dialog.showOpenDialog(win || {}, {
            title: options?.title || 'Select File',
            defaultPath: options?.defaultPath,
            buttonLabel: options?.buttonLabel || 'Select',
            filters: options?.filters,
            properties,
        });
        const result = options?.withoutOverlay
            ? await (0, dialog_1.showDialogWithoutOverlay)(parentWindow, showDialogFn)
            : await showDialogFn(parentWindow || {});
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, paths: [], canceled: true };
        }
        return {
            success: true,
            paths: result.filePaths,
            canceled: false,
        };
    });
    // 保存文件对话框
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DIALOG_SAVE_FILE, async (event, options) => {
        const parentWindow = (0, dialog_1.resolveParentWindow)(event, getMainWindow);
        const showDialogFn = (win) => electron_1.dialog.showSaveDialog(win || {}, {
            title: options?.title || 'Save File',
            defaultPath: options?.defaultPath,
            buttonLabel: options?.buttonLabel || 'Save',
            filters: options?.filters,
        });
        const result = options?.withoutOverlay
            ? await (0, dialog_1.showDialogWithoutOverlay)(parentWindow, showDialogFn)
            : await showDialogFn(parentWindow || {});
        if (result.canceled || !result.filePath) {
            return { success: false, path: null, canceled: true };
        }
        return {
            success: true,
            path: result.filePath,
            canceled: false,
        };
    });
}
