"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUpdaterIPC = setupUpdaterIPC;
/**
 * 自动更新 IPC 处理
 *
 * 具体实现请参考 modules/updater/
 */
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const env_1 = require("../config/env");
const constants_1 = require("../config/constants");
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
const updater_1 = require("../modules/updater");
const logger = (0, logger_1.getCategoryLogger)('update');
/**
 * 设置 IPC 处理器
 */
function setupUpdaterIPCHandlers() {
    // 检查更新
    // options.userTriggered: 是否为用户主动触发
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.UPDATER_CHECK, async (_event, options) => {
        const userTriggered = options?.userTriggered ?? true;
        const currentStatus = (0, updater_1.getUpdateStatus)();
        const cachedInfo = (0, updater_1.getCachedUpdateInfo)();
        logger.info(`[Updater] 收到检查更新请求 (userTriggered: ${userTriggered}, ` +
            `status: ${currentStatus}, cachedVersion: ${cachedInfo?.version})`);
        // 统一设置用户触发标记
        (0, updater_1.setUserTriggeredCheck)(userTriggered);
        // 1. 如果正在检查中，直接返回（避免重复检查）
        if (currentStatus === 'checking') {
            logger.info('[Updater] 已有检查更新任务在进行中');
            return {
                success: true,
                status: 'checking',
            };
        }
        // 2. 如果发现新版本（即将开始下载），直接返回
        if (currentStatus === 'available') {
            logger.info('[Updater] 已发现新版本，即将开始下载');
            return {
                success: true,
                status: 'available',
                updateInfo: {
                    version: cachedInfo?.version,
                },
            };
        }
        // 3. 如果正在下载中，直接返回当前进度（避免中断下载）
        if (currentStatus === 'downloading') {
            logger.info('[Updater] 更新正在下载中');
            const cachedProgress = (0, updater_1.getCachedProgress)();
            return {
                success: true,
                status: 'downloading',
                updateInfo: {
                    version: cachedInfo?.version,
                    progress: cachedProgress || undefined,
                },
            };
        }
        // 4. 用户主动触发时
        if (userTriggered) {
            // 4.1 如果已下载完成，先去服务端检查是否有更新版本
            if (currentStatus === 'downloaded') {
                try {
                    logger.info('[Updater] 用户主动触发，已有下载完成的版本，检查是否有更新');
                    const result = await electron_updater_1.autoUpdater.checkForUpdates();
                    const latestVersion = result?.updateInfo?.version;
                    // 如果服务端有更新的版本，需要重新下载
                    if (latestVersion && (0, utils_1.isVersionLower)(cachedInfo?.version, latestVersion)) {
                        logger.info(`[Updater] 发现更新版本 ${latestVersion}，缓存版本 ${cachedInfo?.version}，重新下载`);
                        (0, updater_1.resetUpdateCache)();
                        // checkForUpdates 已经触发了下载流程，状态会通过事件更新
                        return {
                            success: true,
                            status: 'available',
                            updateInfo: { version: latestVersion },
                        };
                    }
                    // 没有更新版本，返回已下载状态
                    logger.info('[Updater] 已下载的版本就是最新版本');
                    return {
                        success: true,
                        status: 'downloaded',
                        updateInfo: cachedInfo || undefined,
                    };
                }
                catch (error) {
                    // 检查失败，仍然返回已下载状态（让用户可以安装）
                    logger.error(`[Updater] 检查更新版本失败: ${error}`);
                    return {
                        success: true,
                        status: 'downloaded',
                        updateInfo: cachedInfo || undefined,
                    };
                }
            }
            // 4.2 其他状态，去服务端检查
            try {
                logger.info('[Updater] 用户主动触发，检查服务端最新版本');
                (0, updater_1.setUpdateStatus)('checking');
                const result = await electron_updater_1.autoUpdater.checkForUpdates();
                // checkForUpdates 完成后，状态已通过事件更新，返回当前最新状态
                const updatedStatus = (0, updater_1.getUpdateStatus)();
                const updatedInfo = (0, updater_1.getCachedUpdateInfo)();
                const updatedProgress = (0, updater_1.getCachedProgress)();
                return {
                    success: true,
                    status: updatedStatus,
                    updateInfo: {
                        version: updatedInfo?.version || result?.updateInfo?.version,
                        progress: updatedProgress || undefined,
                    },
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`[Updater] 检查更新失败: ${errorMessage}`);
                (0, updater_1.setUpdateStatus)('error');
                return {
                    success: false,
                    status: 'error',
                    error: errorMessage,
                };
            }
        }
        // 5. 非用户触发（静默检查），根据当前状态返回缓存
        if (currentStatus === 'downloaded') {
            logger.info('[Updater] 静默检查：更新已下载完成');
            return {
                success: true,
                status: 'downloaded',
                updateInfo: cachedInfo || undefined,
            };
        }
        if (currentStatus === 'not-available') {
            logger.info('[Updater] 静默检查：已是最新版本');
            return {
                success: true,
                status: 'not-available',
                updateInfo: cachedInfo || undefined,
            };
        }
        // 6. 其他状态（idle/error），开始新的静默检查
        try {
            logger.info(`[Updater] 静默检查更新 (当前状态: ${currentStatus})`);
            (0, updater_1.setUpdateStatus)('checking');
            await electron_updater_1.autoUpdater.checkForUpdates();
            return {
                success: true,
                status: 'checking',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[Updater] 检查更新失败: ${errorMessage}`);
            (0, updater_1.setUpdateStatus)('error');
            return {
                success: false,
                status: 'error',
                error: errorMessage,
            };
        }
    });
    // 安装更新并重启
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.UPDATER_INSTALL, () => {
        logger.info('[Updater] 退出并安装更新');
        // quitAndInstall 会关闭所有窗口并安装更新
        // isSilent: false - 显示安装进度
        // isForceRunAfter: true - 安装后自动启动应用
        electron_updater_1.autoUpdater.quitAndInstall(false, true);
    });
    // 获取当前版本
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.UPDATER_GET_VERSION, () => {
        return electron_updater_1.autoUpdater.currentVersion.version;
    });
}
/**
 * 设置自动更新 IPC 处理器
 */
function setupUpdaterIPC() {
    // 开发环境不启用自动更新，但仍需注册 IPC handlers
    if (env_1.isDev) {
        logger.info('[Updater] 开发环境，仅注册 IPC handlers');
        setupUpdaterIPCHandlers();
        return;
    }
    // 初始化更新模块（配置、事件监听、启动检查）
    (0, updater_1.initUpdater)();
    // 设置 IPC 处理器
    setupUpdaterIPCHandlers();
}
