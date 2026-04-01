"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveWorkingDirectory = getEffectiveWorkingDirectory;
exports.setupBashIPC = setupBashIPC;
/**
 * Bash Tools IPC 处理器
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const bash_1 = require("../modules/bash");
const storage_ipc_1 = require("./storage.ipc");
/**
 * 获取有效的工作目录
 * 优先级：
 * 1. 用户传入的 cwd 参数
 * 2. 用户在设置中配置的 workingDirectory
 * 3. 系统默认的工作目录
 *
 * @param cwd 用户传入的工作目录
 * @returns 有效的工作目录路径
 */
function getEffectiveWorkingDirectory(cwd) {
    // 1. 如果用户传入了 cwd，直接使用
    if (cwd) {
        return cwd;
    }
    // 2. 尝试从用户配置中获取
    const config = (0, storage_ipc_1.getDesktopConfig)();
    if (config.workingDirectory) {
        return config.workingDirectory;
    }
    // 3. 使用系统默认工作目录
    return (0, storage_ipc_1.getDefaultWorkingDirectory)();
}
/**
 * 设置 Bash Tools IPC 处理器
 */
function setupBashIPC() {
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BASH_EXECUTE, async (_, params) => {
        // 填充默认工作目录
        const effectiveParams = {
            ...params,
            cwd: getEffectiveWorkingDirectory(params.cwd),
        };
        return (0, bash_1.executeBashCommand)(effectiveParams);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BASH_GET_OUTPUT, async (_, params) => {
        return (0, bash_1.getBashOutput)(params);
    });
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.BASH_KILL_SHELL, async (_, params) => {
        return (0, bash_1.killBashShell)(params);
    });
}
