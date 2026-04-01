"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForServer = exports.bringToFrontAsync = exports.bringToFront = void 0;
const windows_1 = require("../windows");
const electron_1 = require("electron");
/**
 * 将主窗口带到前台
 * @param options.createIfNotExists 窗口不存在时是否创建新窗口，默认 true
 */
const bringToFront = (options = {}) => {
    const { createIfNotExists = true } = options;
    let mainWindow = (0, windows_1.getMainWindow)();
    // 检查窗口是否存在且未被销毁
    if (!mainWindow || mainWindow.isDestroyed()) {
        if (createIfNotExists) {
            // 如果窗口不存在或已销毁，创建新窗口
            windows_1.windowManager.createInitialWindow();
            mainWindow = (0, windows_1.getMainWindow)();
        }
        else {
            // 不创建新窗口，直接返回
            return;
        }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        // 如果窗口最小化了，恢复它
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        // 显示窗口（如果隐藏了）
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
        // macOS: 先激活应用，确保应用成为前台应用
        if (process.platform === 'darwin') {
            electron_1.app.dock?.show();
            electron_1.app.focus({ steal: true });
        }
        // 聚焦窗口
        mainWindow.focus();
    }
};
exports.bringToFront = bringToFront;
/**
 * 将主窗口带到前台（异步版本）
 * @param options.createIfNotExists 窗口不存在时是否创建新窗口，默认 true
 */
const bringToFrontAsync = async (options = {}) => {
    const { createIfNotExists = true } = options;
    let mainWindow = (0, windows_1.getMainWindow)();
    // 检查窗口是否存在且未被销毁
    if (!mainWindow || mainWindow.isDestroyed()) {
        if (createIfNotExists) {
            // 如果窗口不存在或已销毁，创建新窗口
            await windows_1.windowManager.createInitialWindow();
            mainWindow = (0, windows_1.getMainWindow)();
        }
        else {
            // 不创建新窗口，直接返回
            return;
        }
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        // 如果窗口最小化了，恢复它
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        // 显示窗口（如果隐藏了）
        if (!mainWindow.isVisible()) {
            mainWindow.show();
        }
        // macOS: 先激活应用，确保应用成为前台应用
        if (process.platform === 'darwin') {
            electron_1.app.dock?.show();
            electron_1.app.focus({ steal: true });
        }
        // 聚焦窗口
        mainWindow.focus();
    }
};
exports.bringToFrontAsync = bringToFrontAsync;
/**
 * 窗口工具函数
 * 等待服务器就绪
 */
const waitForServer = async (url, maxAttempts = 30) => {
    const http = require('http');
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    if (res.statusCode === 200) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Status: ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.setTimeout(1000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
            // eslint-disable-next-line no-console
            console.log('Next.js server is ready');
            return true;
        }
        catch {
            // eslint-disable-next-line no-console
            console.log(`Waiting for Next.js server... (${i + 1}/${maxAttempts})`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    return false;
};
exports.waitForServer = waitForServer;
