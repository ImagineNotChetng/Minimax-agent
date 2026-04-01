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
exports.createOnboardingWindow = createOnboardingWindow;
/**
 * 引导窗口
 * 首次启动时显示，引导用户了解应用功能
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const config_1 = require("../config");
const menu_1 = require("../modules/menu");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
/**
 * 创建引导窗口
 */
async function createOnboardingWindow(context) {
    const isMac = process.platform === 'darwin';
    const window = new electron_1.BrowserWindow({
        width: config_1.ONBOARDING_WINDOW_WIDTH,
        height: config_1.ONBOARDING_WINDOW_HEIGHT,
        resizable: false,
        title: config_1.MAIN_WINDOW_TITLE,
        titleBarStyle: (0, utils_2.getTitleBarStyle)(process.platform),
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: (0, utils_2.getBackgroundColor)(),
        // Windows 上隐藏菜单栏
        autoHideMenuBar: !isMac && config_1.isProd,
        webPreferences: {
            ...utils_2.DEFAULT_SECURE_WEB_PREFERENCES,
            preload: path.join(__dirname, '..', 'preload.js'),
        },
        show: false,
    });
    context.setWindow(window);
    context.setWindowType('onboarding');
    // 窗口准备好后显示
    window.once('ready-to-show', () => {
        window?.show();
        window?.focus();
    });
    // 加载引导页
    if (config_1.isDev) {
        const serverReady = await (0, utils_1.waitForServer)(config_1.PAGE_URLS.ONBOARDING);
        if (serverReady) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.loadURL(config_1.PAGE_URLS.ONBOARDING);
        }
        else {
            console.error('Failed to connect to Next.js server');
            electron_1.app.quit();
            return;
        }
        // window.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        window.loadURL(config_1.PAGE_URLS.ONBOARDING);
    }
    // 窗口关闭事件
    window.on('closed', () => {
        context.setWindow(null);
        context.setWindowType(null);
    });
    // 设置引导窗口的简化菜单（与登录窗口相同）
    (0, menu_1.setupLoginMenu)();
}
