"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoUpdaterEvents = setupAutoUpdaterEvents;
/**
 * autoUpdater 事件监听
 *
 * 所有 UI 反馈都通过 IPC 发送给渲染进程，由 React UI 处理
 */
const electron_updater_1 = require("electron-updater");
const constants_1 = require("../../config/constants");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.getCategoryLogger)('update');
const state_1 = require("./state");
const tabs_1 = require("../tabs");
/**
 * 设置 autoUpdater 事件监听
 */
function setupAutoUpdaterEvents() {
    const sendStatusToRenderer = (event) => {
        const tabController = (0, tabs_1.getTabController)();
        const activeTabView = tabController?.getActiveTabView();
        if (!activeTabView ||
            !activeTabView?.webContents ||
            activeTabView?.webContents?.isDestroyed?.()) {
            logger.warn(`[Updater] 无法发送状态到渲染进程: 没有激活的 Tab`);
            return;
        }
        logger.info(`[Updater] sendStatusToRenderer: status=${event.status}`);
        activeTabView.webContents.send(constants_1.IPC_CHANNELS.UPDATER_STATUS, event);
        logger.info(`[Updater] 已发送状态到渲染进程: ${event.status}`);
    };
    // 检查更新中
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        logger.info('[Updater] 正在检查更新...');
        (0, state_1.setUpdateStatus)('checking');
        sendStatusToRenderer({ status: 'checking' });
    });
    // 有可用更新
    electron_updater_1.autoUpdater.on('update-available', async (info) => {
        logger.info(`[Updater] 发现新版本: ${info.version}`);
        (0, state_1.setUpdateStatus)('available');
        (0, state_1.setCachedUpdateInfo)({ version: info.version });
        sendStatusToRenderer({
            status: 'available',
            updateInfo: { version: info.version },
        });
        // 确保开始下载
        // autoDownload=true 时 electron-updater 会自动下载
        // autoDownload=false 时需要手动调用 downloadUpdate()
        if (!electron_updater_1.autoUpdater.autoDownload) {
            logger.info('[Updater] autoDownload=false，手动触发下载');
            electron_updater_1.autoUpdater.downloadUpdate();
        }
    });
    // 没有可用更新
    electron_updater_1.autoUpdater.on('update-not-available', async () => {
        const currentVersion = electron_updater_1.autoUpdater.currentVersion.version;
        logger.info(`[Updater] 当前已是最新版本: ${currentVersion}`);
        (0, state_1.setUpdateStatus)('not-available');
        (0, state_1.setCachedUpdateInfo)({ version: currentVersion });
        sendStatusToRenderer({
            status: 'not-available',
            updateInfo: { version: currentVersion },
        });
    });
    // 下载进度
    electron_updater_1.autoUpdater.on('download-progress', (progress) => {
        (0, state_1.setUpdateStatus)('downloading');
        (0, state_1.setCachedProgress)({
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total,
            delta: progress.delta,
        });
        const percent = progress.percent;
        const transferred = (progress.transferred / 1024 / 1024).toFixed(1);
        const total = (progress.total / 1024 / 1024).toFixed(1);
        const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
        logger.info(`[Updater] 下载进度: ${percent.toFixed(1)}% (${transferred}/${total} MB, ${speed} MB/s)`);
        sendStatusToRenderer({
            status: 'downloading',
            updateInfo: { progress },
        });
    });
    // 下载完成
    electron_updater_1.autoUpdater.on('update-downloaded', async (info) => {
        logger.info(`[Updater] 更新下载完成: ${info.version}`);
        (0, state_1.setUpdateStatus)('downloaded');
        (0, state_1.setCachedUpdateInfo)({ version: info.version });
        (0, state_1.setCachedProgress)(null);
        sendStatusToRenderer({
            status: 'downloaded',
            updateInfo: { version: info.version },
        });
        // 静默模式下，等待退出时自动安装（autoInstallOnAppQuit 已设置为 true）
        // 用户触发时，由渲染进程的 React UI 处理安装确认
        if (!(0, state_1.getIsUserTriggeredCheck)()) {
            logger.info('[Updater] 静默模式，更新将在退出时自动安装');
        }
        (0, state_1.resetTempFlags)();
    });
    // 更新错误
    electron_updater_1.autoUpdater.on('error', async (error) => {
        logger.error(`[Updater] 更新错误: ${error.message}`);
        // 检查是否是 HTTP/2 协议错误，如果是则自动重试
        const isHttp2Error = error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
            error.message.includes('ERR_HTTP2') ||
            error.message.includes('PROTOCOL_ERROR');
        if (isHttp2Error && (0, state_1.getRetryCount)() < (0, state_1.getMaxRetryCount)()) {
            const count = (0, state_1.incrementRetryCount)();
            logger.info(`[Updater] 检测到 HTTP/2 错误，正在重试... (${count}/${(0, state_1.getMaxRetryCount)()})`);
            // 等待一段时间后重试
            await new Promise((resolve) => setTimeout(resolve, 2000 * count));
            try {
                await electron_updater_1.autoUpdater.checkForUpdates();
                return; // 重试成功，不发送错误
            }
            catch (retryError) {
                logger.error(`[Updater] 重试失败: ${retryError}`);
            }
        }
        // 重置重试计数
        (0, state_1.resetRetryCount)();
        // 发送错误状态给渲染进程
        (0, state_1.setUpdateStatus)('error');
        sendStatusToRenderer({ status: 'error', error: error.message });
        (0, state_1.resetTempFlags)();
    });
}
