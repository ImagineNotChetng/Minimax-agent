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
exports.createContextMenu = createContextMenu;
exports.createTray = createTray;
exports.destroyTray = destroyTray;
exports.getTray = getTray;
exports.setTrayIcon = setTrayIcon;
exports.setTrayTooltip = setTrayTooltip;
/**
 * 系统托盘模块
 * 在系统托盘区域显示图标，支持点击唤起应用
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("../../config");
const constants_1 = require("../../config/constants");
const window_1 = require("../../utils/window");
const tabs_1 = require("../tabs");
const storage_ipc_1 = require("../../ipc/storage.ipc");
const windows_1 = require("../../windows");
let tray = null;
/**
 * 获取托盘图标
 * macOS: 需要使用 Template 图标（16x16 或 22x22，黑白色）
 * Windows: 可以使用彩色图标（建议 16x16 或 32x32）
 *
 * 图标文件说明：
 * - resources/trayTemplate.png: macOS 托盘图标（16x13，黑色图标，透明背景）
 * - resources/trayTemplate@2x.png: macOS Retina 托盘图标（32x26，macOS 自动加载）
 * - resources/tray.png: Windows/Linux 托盘图标（32x32，可彩色）
 * - resources/tray.ico: Windows 托盘图标（多尺寸 ico 文件）
 */
function getTrayIcon() {
    const resourcesPath = config_1.isDev
        ? path.join(electron_1.app.getAppPath(), 'resources')
        : path.join(process.resourcesPath, 'resources');
    let icon;
    if (process.platform === 'darwin') {
        // macOS: 尝试加载 Template 图标
        const templatePath = path.join(resourcesPath, 'trayTemplate.png');
        icon = electron_1.nativeImage.createFromPath(templatePath);
        if (icon.isEmpty()) {
            // 如果没有专用托盘图标，使用应用图标并调整大小
            const icnsPath = path.join(resourcesPath, 'icon.icns');
            icon = electron_1.nativeImage.createFromPath(icnsPath);
            if (!icon.isEmpty()) {
                icon = icon.resize({ width: 22, height: 22 });
            }
        }
        // 设置为 Template 图标（自动适应系统主题）
        icon.setTemplateImage(true);
    }
    else if (process.platform === 'win32') {
        // Windows: 尝试加载 ico 或 png
        const icoPath = path.join(resourcesPath, 'tray.ico');
        const pngPath = path.join(resourcesPath, 'tray.png');
        icon = electron_1.nativeImage.createFromPath(icoPath);
        if (icon.isEmpty()) {
            icon = electron_1.nativeImage.createFromPath(pngPath);
        }
        if (icon.isEmpty()) {
            // 使用应用图标
            const iconPath = path.join(resourcesPath, 'icon.ico');
            icon = electron_1.nativeImage.createFromPath(iconPath);
            if (!icon.isEmpty()) {
                icon = icon.resize({ width: 32, height: 32 });
            }
        }
    }
    else {
        // Linux
        const pngPath = path.join(resourcesPath, 'tray.png');
        icon = electron_1.nativeImage.createFromPath(pngPath);
        if (icon.isEmpty()) {
            const icnsPath = path.join(resourcesPath, 'icon.icns');
            icon = electron_1.nativeImage.createFromPath(icnsPath);
            if (!icon.isEmpty()) {
                icon = icon.resize({ width: 22, height: 22 });
            }
        }
    }
    return icon;
}
/**
 * 创建托盘右键菜单
 * 先留着，万一后面要用到
 */
function createContextMenu() {
    const config = (0, storage_ipc_1.getDesktopConfig)();
    const isEn = config.language === 'en';
    return electron_1.Menu.buildFromTemplate([
        {
            label: isEn ? 'Open MiniMax Agent' : '打开 MiniMax Agent',
            click: () => {
                (0, window_1.bringToFront)();
            },
        },
        { type: 'separator' },
        {
            label: isEn ? 'New Chat' : '新建对话',
            click: () => {
                // 先检查 activeWebContents 是否存在，避免在窗口状态异常时创建新窗口
                const activeWebContents = (0, tabs_1.getTabController)().getActiveWebContents();
                if (activeWebContents) {
                    (0, window_1.bringToFront)();
                    activeWebContents.send(constants_1.IPC_CHANNELS.MENU_NEW_CHAT);
                }
                else {
                    // 如果没有 activeWebContents，只唤起窗口，不发送新建对话消息
                    (0, window_1.bringToFront)();
                }
            },
        },
        {
            label: isEn ? 'Open MiniChat' : '打开小窗',
            click: () => {
                (0, windows_1.showMiniChatWindow)();
            },
        },
        { type: 'separator' },
        {
            label: isEn ? 'Quit' : '退出',
            click: () => {
                electron_1.app.quit();
            },
        },
    ]);
}
/**
 * 创建系统托盘
 */
function createTray() {
    // 如果已经存在托盘，先销毁
    if (tray) {
        tray.destroy();
        tray = null;
    }
    try {
        const icon = getTrayIcon();
        if (icon.isEmpty()) {
            console.error('[Tray] Failed to load any tray icon');
            return null;
        }
        tray = new electron_1.Tray(icon);
        // 设置提示文字
        tray.setToolTip('MiniMax Agent');
        // 设置右键菜单
        tray.setContextMenu(createContextMenu());
        // 双击托盘图标（Windows）
        tray.on('double-click', () => {
            (0, window_1.bringToFront)();
        });
        return tray;
    }
    catch (error) {
        console.error('[Tray] Failed to create:', error);
        return null;
    }
}
/**
 * 销毁托盘
 */
function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}
/**
 * 获取托盘实例
 */
function getTray() {
    return tray;
}
/**
 * 设置托盘图标
 */
function setTrayIcon(iconPath) {
    if (tray) {
        const icon = electron_1.nativeImage.createFromPath(iconPath);
        if (process.platform === 'darwin') {
            icon.setTemplateImage(true);
        }
        tray.setImage(icon);
    }
}
/**
 * 设置托盘提示文字
 */
function setTrayTooltip(tooltip) {
    if (tray) {
        tray.setToolTip(tooltip);
    }
}
