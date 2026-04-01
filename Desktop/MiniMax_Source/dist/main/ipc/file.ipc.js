"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFileIPC = setupFileIPC;
/**
 * File Tools IPC 处理器
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const file_1 = require("../modules/file");
/**
 * 设置 File Tools IPC 处理器
 */
function setupFileIPC() {
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_READ, async (_, params) => {
        return (0, file_1.readFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_WRITE, async (_, params) => {
        return (0, file_1.writeFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_EDIT, async (_, params) => {
        return (0, file_1.editFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_MULTI_EDIT, async (_, params) => {
        return (0, file_1.multiEditFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_GLOB, async (_, params) => {
        return (0, file_1.globSearchCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_GREP, async (_, params) => {
        return (0, file_1.grepSearchCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_LIST, async (_, params) => {
        return (0, file_1.listDirectoryCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_STAT, async (_, params) => {
        return (0, file_1.statFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_DELETE, async (_, params) => {
        return (0, file_1.deleteFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_MOVE, async (_, params) => {
        return (0, file_1.moveFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_COPY, async (_, params) => {
        return (0, file_1.copyFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_TRASH, async (_, params) => {
        return (0, file_1.trashFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_DOWNLOAD, async (_, params) => {
        return (0, file_1.downloadFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_UPLOAD, async (_, params) => {
        return (0, file_1.uploadFileCommand)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.FILE_CHMOD, async (_, params) => {
        return (0, file_1.chmodFileCommand)(params);
    });
}
