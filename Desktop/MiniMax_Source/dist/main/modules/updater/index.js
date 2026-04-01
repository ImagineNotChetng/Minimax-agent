"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTUP_CHECK_DELAY = exports.getUpdateServerUrl = exports.getCachedProgress = exports.getCachedUpdateInfo = exports.resetUpdateCache = exports.resetTempFlags = exports.isUpToDate = exports.isDownloaded = exports.isDownloading = exports.isChecking = exports.setUpdateStatus = exports.getUpdateStatus = exports.setUserTriggeredCheck = void 0;
exports.scheduleStartupUpdateCheck = scheduleStartupUpdateCheck;
exports.initUpdater = initUpdater;
/**
 * 更新模块入口
 *
 * 基于 electron-updater 实现应用的检查更新、下载、安装功能
 *
 * 支持三种触发方式（统一使用 React UI）：
 * 1. 菜单栏检查更新 - 打开 React 弹窗
 * 2. 启动时静默检查 - 静默下载，退出时安装（无 UI）
 * 3. Feature 弹窗 / 设置页面按钮 - 打开 React 弹窗
 */
const electron_updater_1 = require("electron-updater");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const config_1 = require("./config");
const events_1 = require("./events");
const state_1 = require("./state");
const logger = (0, logger_1.getCategoryLogger)('update');
// 导出状态管理函数
var state_2 = require("./state");
Object.defineProperty(exports, "setUserTriggeredCheck", { enumerable: true, get: function () { return state_2.setIsUserTriggeredCheck; } });
Object.defineProperty(exports, "getUpdateStatus", { enumerable: true, get: function () { return state_2.getUpdateStatus; } });
Object.defineProperty(exports, "setUpdateStatus", { enumerable: true, get: function () { return state_2.setUpdateStatus; } });
Object.defineProperty(exports, "isChecking", { enumerable: true, get: function () { return state_2.isChecking; } });
Object.defineProperty(exports, "isDownloading", { enumerable: true, get: function () { return state_2.isDownloading; } });
Object.defineProperty(exports, "isDownloaded", { enumerable: true, get: function () { return state_2.isDownloaded; } });
Object.defineProperty(exports, "isUpToDate", { enumerable: true, get: function () { return state_2.isUpToDate; } });
Object.defineProperty(exports, "resetTempFlags", { enumerable: true, get: function () { return state_2.resetTempFlags; } });
Object.defineProperty(exports, "resetUpdateCache", { enumerable: true, get: function () { return state_2.resetUpdateCache; } });
Object.defineProperty(exports, "getCachedUpdateInfo", { enumerable: true, get: function () { return state_2.getCachedUpdateInfo; } });
Object.defineProperty(exports, "getCachedProgress", { enumerable: true, get: function () { return state_2.getCachedProgress; } });
// 导出配置
var config_2 = require("./config");
Object.defineProperty(exports, "getUpdateServerUrl", { enumerable: true, get: function () { return config_2.getUpdateServerUrl; } });
Object.defineProperty(exports, "STARTUP_CHECK_DELAY", { enumerable: true, get: function () { return config_2.STARTUP_CHECK_DELAY; } });
/**
 * 应用启动时自动检查更新
 * 延迟执行以确保应用完全启动
 */
function scheduleStartupUpdateCheck() {
    logger.info(`[Updater] 将在 ${config_1.STARTUP_CHECK_DELAY / 1000} 秒后自动检查更新`);
    setTimeout(async () => {
        // 如果已经有检查在进行中（用户可能已经手动触发），则跳过
        if ((0, state_1.isChecking)()) {
            logger.info('[Updater] 已有检查更新任务在进行中，跳过启动时自动检查');
            return;
        }
        try {
            logger.info('[Updater] 开始启动时自动检查更新');
            // 标记为非用户触发（静默检查），不显示 UI
            (0, state_1.setIsUserTriggeredCheck)(false);
            (0, state_1.setUpdateStatus)('checking');
            await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[Updater] 启动时检查更新失败: ${errorMessage}`);
            (0, state_1.setUpdateStatus)('error');
        }
    }, config_1.STARTUP_CHECK_DELAY);
}
/**
 * 初始化更新模块
 * 配置 autoUpdater 并设置事件监听
 */
function initUpdater() {
    // 开发环境不启用自动更新
    if (env_1.isDev) {
        logger.info('[Updater] 开发环境，跳过自动更新初始化');
        return;
    }
    // 配置 autoUpdater
    (0, config_1.configureAutoUpdater)();
    // 设置事件监听
    (0, events_1.setupAutoUpdaterEvents)();
    // 应用启动后自动检查更新
    scheduleStartupUpdateCheck();
    logger.info('[Updater] 更新模块初始化完成');
}
