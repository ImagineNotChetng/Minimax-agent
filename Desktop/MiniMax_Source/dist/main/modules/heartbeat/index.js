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
exports.heartbeatManager = void 0;
exports.initHeartbeat = initHeartbeat;
exports.stopHeartbeat = stopHeartbeat;
/**
 * 心跳检测模块
 * 在 Electron 主进程中每隔 10 秒发送心跳检测
 * 用于检测当前用户是否已退出 app
 */
const os = __importStar(require("os"));
const electron_1 = require("electron");
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
const storage_ipc_1 = require("../../ipc/storage.ipc");
const tool_1 = require("../../utils/tool");
const logger_1 = require("../../utils/logger");
const hotUpdate_1 = require("../hotUpdate");
const logger = (0, logger_1.getCategoryLogger)('heartbeat');
/** 心跳检测间隔（毫秒） */
const HEARTBEAT_INTERVAL = 10000; // 10 秒
/** 心跳 API 路径 */
const HEARTBEAT_API_PATH = '/matrix/api/v1/chat/desktop_heartbeat';
/** 应用常量 */
const BIZ_ID = 3;
const APP_ID = '3001';
const VERSION_CODE = '22201';
/**
 * 获取 MAC 地址
 * @returns MAC 地址字符串，如果获取失败则返回空字符串
 */
function getMacAddress() {
    try {
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
            const interfaces = networkInterfaces[name];
            if (!interfaces)
                continue;
            for (const iface of interfaces) {
                // 跳过内部接口和没有 MAC 地址的接口
                if (iface.internal || !iface.mac || iface.mac === '00:00:00:00:00:00') {
                    continue;
                }
                return iface.mac;
            }
        }
        return '';
    }
    catch (error) {
        console.error('[Heartbeat] Failed to get MAC address:', error);
        return '';
    }
}
/**
 * 心跳管理器类
 */
class HeartbeatManager {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.macAddress = '';
    }
    /**
     * 启动心跳检测
     */
    start() {
        // 避免重复启动
        if (this.isRunning) {
            return;
        }
        // 获取 MAC 地址
        this.macAddress = getMacAddress();
        if (!this.macAddress) {
            console.warn('[Heartbeat] MAC address not available, heartbeat disabled');
            return;
        }
        this.isRunning = true;
        // 设置定时器，每 10 秒发送一次
        this.intervalId = setInterval(() => {
            this.sendHeartbeat();
        }, HEARTBEAT_INTERVAL);
    }
    /**
     * 停止心跳检测
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }
    /**
     * 发送心跳请求
     */
    async sendHeartbeat() {
        if (!this.macAddress) {
            return;
        }
        // 获取用户信息
        const userInfo = (0, storage_ipc_1.getUserInfo)();
        const userId = userInfo?.realUserID || userInfo?.userID || '0';
        // 构建请求参数
        const params = new URLSearchParams({
            device_platform: 'web',
            is_desktop: '1',
            biz_id: String(BIZ_ID),
            app_id: APP_ID,
            version_code: VERSION_CODE,
            // 桌面端版本号
            desktop_version: electron_1.app.getVersion(),
            // 桌面端热更新的 web 版本号
            desktop_web_version: hotUpdate_1.hotUpdateManager.getCurrentVersion() || '',
            unix: String(Date.now()),
            timezone_offset: String(new Date().getTimezoneOffset() * -60),
            lang: env_1.LOCALE === 'zh' ? 'zh' : 'en',
            os_name: process.platform === 'darwin'
                ? 'Mac'
                : process.platform === 'win32'
                    ? 'Windows'
                    : 'Unknown',
            user_id: userId,
            client: 'desktop',
        });
        const url = `${env_1.isDev
            ? env_1.isEn
                ? 'https://matrix-overseas-test.xaminim.com'
                : 'https://matrix-test.xaminim.com'
            : constants_1.DOMAIN_URL}${HEARTBEAT_API_PATH}?${params.toString()}`;
        try {
            await electron_1.net.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': (0, tool_1.getStandardUserAgent)(),
                    Origin: constants_1.DOMAIN_URL,
                    Referer: constants_1.DOMAIN_URL + '/',
                },
                body: JSON.stringify({
                    mac_address: this.macAddress,
                }),
            });
            if (!env_1.isDev) {
                // 发送完心跳打一次日志
                logger.info(`[Heartbeat] Sent heartbeat successfully: ${url}, mac_address: ${this.macAddress}`);
            }
        }
        catch (error) {
            // 心跳失败不需要处理，静默失败
            // 网络问题或服务端问题都可能导致失败
            if (!env_1.isDev) {
                logger.error(`[Heartbeat] Failed: ${url}, mac_address: ${this.macAddress}, error: ${JSON.stringify(error)}`);
            }
        }
    }
    /**
     * 检查心跳是否正在运行
     */
    isActive() {
        return this.isRunning;
    }
    /**
     * 获取当前使用的 MAC 地址
     */
    getMacAddress() {
        return this.macAddress;
    }
}
/** 心跳管理器单例 */
exports.heartbeatManager = new HeartbeatManager();
/**
 * 初始化并启动心跳检测
 * 应在 app ready 后调用
 */
function initHeartbeat() {
    exports.heartbeatManager.start();
    // 监听系统休眠/唤醒事件，避免休眠唤醒后时间漂移
    electron_1.powerMonitor.on('suspend', () => {
        logger.info('system suspend, stop heartbeat');
        exports.heartbeatManager.stop();
    });
    electron_1.powerMonitor.on('resume', () => {
        logger.info('system resume, start heartbeat');
        exports.heartbeatManager.start();
    });
}
/**
 * 停止心跳检测
 * 应在 app quit 时调用
 */
function stopHeartbeat() {
    exports.heartbeatManager.stop();
}
