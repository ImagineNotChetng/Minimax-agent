"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebsiteIPC = setupWebsiteIPC;
/**
 * Website Tools IPC 处理器
 */
const electron_1 = require("electron");
const constants_1 = require("../config/constants");
const website_1 = require("../modules/website");
/**
 * 设置 Website Tools IPC 处理器
 */
function setupWebsiteIPC() {
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WEBSITE_EXTRACT_CONTENT, async (_, params) => {
        return (0, website_1.extractContentFromWebsites)(params);
    });
}
