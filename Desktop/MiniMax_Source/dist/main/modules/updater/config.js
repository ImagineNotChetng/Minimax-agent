"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STARTUP_CHECK_DELAY = void 0;
exports.getUpdateServerUrl = getUpdateServerUrl;
exports.configureAutoUpdater = configureAutoUpdater;
/**
 * 更新模块配置
 */
const electron_updater_1 = require("electron-updater");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.getCategoryLogger)('update');
// 启动时检查更新的延迟时间（毫秒）
// 延迟一段时间再检查，确保应用完全启动并且不影响启动性能
exports.STARTUP_CHECK_DELAY = 5000;
/**
 * 根据环境获取更新服务器 URL
 */
function getUpdateServerUrl() {
    if (env_1.isProd) {
        // 生产环境更新服务器
        return env_1.isZh
            ? 'https://filecdn.minimax.chat/public/minimax-agent-prod/release'
            : 'https://file.cdn.minimax.io/public/minimax-agent-prod/release';
    }
    else if (env_1.isStaging) {
        // 预发布环境更新服务器
        return env_1.isZh
            ? 'https://filecdn.minimax.chat/public/minimax-agent-staging/release'
            : 'https://file.cdn.minimax.io/public/minimax-agent-staging/release';
    }
    else {
        // 测试环境更新服务器
        return env_1.isZh
            ? 'https://filecdn.minimax.chat/public/minimax-agent-test/release'
            : 'https://file.cdn.minimax.io/public/minimax-agent-test/release';
    }
}
/**
 * 配置 autoUpdater
 */
function configureAutoUpdater() {
    // 使用 electron-log 记录日志
    electron_updater_1.autoUpdater.logger = logger;
    // 打印当前环境信息，便于调试
    logger.info(`[Updater] 当前环境: isProd=${env_1.isProd}, isStaging=${env_1.isStaging}, isTest=${env_1.isTest}, isDev=${env_1.isDev}`);
    logger.info(`[Updater] NEXT_PUBLIC_BUILD_ENV=${process.env.NEXT_PUBLIC_BUILD_ENV}`);
    // 动态设置更新服务器 URL（覆盖 package.json 中的 publish 配置）
    const updateUrl = getUpdateServerUrl();
    electron_updater_1.autoUpdater.setFeedURL({
        provider: 'generic',
        url: updateUrl,
        // 禁用多范围请求，避免某些 CDN 的 HTTP/2 兼容性问题
        useMultipleRangeRequest: false,
    });
    logger.info(`[Updater] 更新服务器: ${updateUrl}`);
    // 根据环境设置更新通道
    // test/staging 环境的版本号包含预发布标识（如 2.0.0-test.123），
    // electron-builder 会生成对应的 yml 文件（如 test-mac.yml），
    // 需要设置 channel 才能正确读取
    if (env_1.isTest) {
        electron_updater_1.autoUpdater.channel = 'test';
    }
    else if (env_1.isStaging) {
        electron_updater_1.autoUpdater.channel = 'staging';
    }
    // prod 环境不需要设置，默认就是 latest
    logger.info(`[Updater] 更新通道: ${electron_updater_1.autoUpdater.channel || 'latest'}`);
    // 自动下载，检查更新后就自动下载
    electron_updater_1.autoUpdater.autoDownload = true;
    // 启用退出时自动安装（静默模式的核心功能）
    // 当更新下载完成后，用户退出应用时会自动安装
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    // 允许降级（可选，根据需求配置）
    electron_updater_1.autoUpdater.allowDowngrade = false;
    // 允许预发布版本（可选）
    // test/staging 环境需要允许预发布版本
    electron_updater_1.autoUpdater.allowPrerelease = env_1.isTest || env_1.isStaging;
    logger.info('[Updater] autoUpdater 配置完成');
}
