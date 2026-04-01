"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotI18n = void 0;
exports.initScreenshots = initScreenshots;
exports.checkScreenCapturePermission = checkScreenCapturePermission;
exports.openScreenCaptureSettings = openScreenCaptureSettings;
exports.startScreenshot = startScreenshot;
exports.getScreenshotsInstance = getScreenshotsInstance;
exports.getScreenshotLang = getScreenshotLang;
/**
 * Screenshot Module
 * 基于 electron-screenshots 实现截图功能
 * https://github.com/nashaofu/screenshots
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const config_1 = require("../../config");
// 延迟导入 Screenshots，避免在非 Electron 环境报错
let Screenshots = null;
let screenshotsInstance = null;
/**
 * 初始化 Screenshots 实例
 */
function initScreenshots() {
    try {
        // 动态导入 electron-screenshots
        Screenshots = require('electron-screenshots');
        screenshotsInstance = new Screenshots({
            singleWindow: true, // 复用截图窗口，加快显示速度
            lang: getScreenshotLang(config_1.isEn ? 'en' : 'zh'),
        });
        console.log('[Screenshot] Screenshots initialized');
    }
    catch (error) {
        console.error('[Screenshot] Failed to initialize screenshots:', error);
    }
}
/**
 * 检查屏幕录制权限（macOS 10.15+）
 * @returns 权限检查结果
 */
async function checkScreenCapturePermission() {
    // 只在 macOS 上需要检查权限
    if (process.platform !== 'darwin') {
        return {
            hasPermission: true,
            status: 'granted',
            message: 'Screen capture permission is not required on this platform',
        };
    }
    try {
        // 检查是否支持屏幕录制权限 API（macOS 10.15+）
        if (!electron_1.systemPreferences || typeof electron_1.systemPreferences.getMediaAccessStatus !== 'function') {
            console.log('[Screenshot] Screen capture permission API not available, assuming granted');
            return {
                hasPermission: true,
                status: 'granted',
                message: 'Permission API not available (older macOS version)',
            };
        }
        // 获取当前权限状态
        // @ts-ignore - screen 类型在某些 Electron 版本中未定义
        const status = electron_1.systemPreferences.getMediaAccessStatus('screen');
        console.log('[Screenshot] Current screen capture permission status:', status);
        switch (status) {
            case 'granted':
                return {
                    hasPermission: true,
                    status: 'granted',
                };
            case 'not-determined':
                // 尝试请求权限（这会弹出系统权限对话框）
                console.log('[Screenshot] Requesting screen capture permission...');
                try {
                    // askForMediaAccess 是异步的，会弹出系统权限对话框
                    // @ts-ignore - screen 类型在某些 Electron 版本中未定义
                    const granted = await electron_1.systemPreferences.askForMediaAccess('screen');
                    return {
                        hasPermission: granted,
                        status: granted ? 'granted' : 'denied',
                        message: granted ? 'Permission granted' : 'Permission denied by user',
                    };
                }
                catch (error) {
                    console.error('[Screenshot] Failed to request permission:', error);
                    return {
                        hasPermission: false,
                        status: 'not-determined',
                        message: 'Failed to request permission',
                    };
                }
            case 'denied':
                return {
                    hasPermission: false,
                    status: 'denied',
                    message: 'Screen recording permission denied. Please grant permission in System Preferences > Security & Privacy > Privacy > Screen Recording',
                };
            case 'restricted':
                return {
                    hasPermission: false,
                    status: 'restricted',
                    message: 'Screen recording is restricted on this device (e.g., parental controls)',
                };
            default:
                return {
                    hasPermission: false,
                    status: 'unknown',
                    message: `Unknown permission status: ${status}`,
                };
        }
    }
    catch (error) {
        console.error('[Screenshot] Error checking screen capture permission:', error);
        return {
            hasPermission: false,
            status: 'unknown',
            message: `Error checking permission: ${error}`,
        };
    }
}
/**
 * 打开系统设置中的屏幕录制权限页面（macOS）
 */
function openScreenCaptureSettings() {
    if (process.platform === 'darwin') {
        // macOS 10.15+ 系统设置路径
        electron_1.shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
}
/**
 * 开始截图并保存到指定路径
 * @param workspaceDir - 工作目录，截图将保存到 {workspaceDir}/screenshots/ 目录
 * @returns 保存的截图文件路径
 */
async function startScreenshot(workspaceDir) {
    if (!screenshotsInstance) {
        throw new Error('Screenshots not initialized');
    }
    // 检查屏幕录制权限（macOS）
    const permissionResult = await checkScreenCapturePermission();
    console.log('[Screenshot] Permission result:', permissionResult);
    if (!permissionResult.hasPermission) {
        const error = new Error(permissionResult.message || 'Screen capture permission denied');
        error.type = 'permission';
        throw error;
    }
    return new Promise((resolve, reject) => {
        // 确定保存目录
        let saveDir;
        if (workspaceDir) {
            saveDir = path.join(workspaceDir, 'screenshots');
        }
        else {
            // 默认保存到用户下载目录的 screenshots 文件夹
            saveDir = path.join(electron_1.app.getPath('downloads'), 'screenshots');
        }
        // 生成文件名：screenshot_YYYYMMDD_HHmmss.png
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
        const fileName = `screenshot_${timestamp}.png`;
        const filePath = path.join(saveDir, fileName);
        console.log('[Screenshot] Starting capture, will save to:', filePath);
        // 监听确认事件（用户点击确认按钮）
        // eslint-disable-next-line prefer-const
        let onOk;
        // eslint-disable-next-line prefer-const
        let onCancel;
        // 清理监听器的函数
        const cleanup = () => {
            screenshotsInstance.off('ok', onOk);
            screenshotsInstance.off('cancel', onCancel);
        };
        onOk = async (_event, buffer) => {
            try {
                // 确保目录存在
                await fs.mkdir(saveDir, { recursive: true });
                // 保存文件
                await fs.writeFile(filePath, buffer);
                console.log('[Screenshot] Screenshot saved successfully:', filePath);
                // 清理事件监听器
                cleanup();
                resolve(filePath);
            }
            catch (error) {
                console.error('[Screenshot] Failed to save screenshot:', error);
                cleanup();
                reject(error);
            }
        };
        // 监听取消事件（用户点击取消或按 ESC）
        onCancel = () => {
            console.log('[Screenshot] Screenshot cancelled by user');
            cleanup();
            reject(new Error('Screenshot cancelled'));
        };
        // 注册事件监听器
        screenshotsInstance.on('ok', onOk);
        screenshotsInstance.on('cancel', onCancel);
        // 开始截图
        try {
            screenshotsInstance.startCapture();
        }
        catch (error) {
            console.error('[Screenshot] Failed to start capture:', error);
            cleanup();
            reject(error);
        }
    });
}
/**
 * 获取 Screenshots 实例（用于清理）
 */
function getScreenshotsInstance() {
    return screenshotsInstance;
}
exports.screenshotI18n = {
    zh: {
        magnifier_position_label: '坐标',
        operation_ok_title: '确定',
        operation_cancel_title: '取消',
        operation_save_title: '保存',
        operation_redo_title: '重做',
        operation_undo_title: '撤销',
        operation_mosaic_title: '马赛克',
        operation_text_title: '文本',
        operation_brush_title: '画笔',
        operation_arrow_title: '箭头',
        operation_ellipse_title: '椭圆',
        operation_rectangle_title: '矩形',
    },
    en: {
        magnifier_position_label: 'Position',
        operation_ok_title: 'OK',
        operation_cancel_title: 'Cancel',
        operation_save_title: 'Save',
        operation_redo_title: 'Redo',
        operation_undo_title: 'Undo',
        operation_mosaic_title: 'Mosaic',
        operation_text_title: 'Text',
        operation_brush_title: 'Brush',
        operation_arrow_title: 'Arrow',
        operation_ellipse_title: 'Ellipse',
        operation_rectangle_title: 'Rectangle',
    },
};
function getScreenshotLang(locale) {
    return exports.screenshotI18n[locale] || exports.screenshotI18n.zh;
}
