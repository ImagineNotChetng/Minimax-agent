"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainWindow = getMainWindow;
const manager_1 = require("./manager");
/**
 * 获取当前窗口引用
 */
function getMainWindow() {
    return manager_1.windowManager.getWindow();
}
