"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetryCount = getRetryCount;
exports.incrementRetryCount = incrementRetryCount;
exports.resetRetryCount = resetRetryCount;
exports.getMaxRetryCount = getMaxRetryCount;
exports.getUpdateStatus = getUpdateStatus;
exports.setUpdateStatus = setUpdateStatus;
exports.isChecking = isChecking;
exports.isDownloading = isDownloading;
exports.isDownloaded = isDownloaded;
exports.isUpToDate = isUpToDate;
exports.getCachedUpdateInfo = getCachedUpdateInfo;
exports.setCachedUpdateInfo = setCachedUpdateInfo;
exports.getCachedProgress = getCachedProgress;
exports.setCachedProgress = setCachedProgress;
exports.getIsUserTriggeredCheck = getIsUserTriggeredCheck;
exports.setIsUserTriggeredCheck = setIsUserTriggeredCheck;
exports.resetTempFlags = resetTempFlags;
exports.resetUpdateCache = resetUpdateCache;
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.getCategoryLogger)('update');
// ============================================
// 状态变量
// ============================================
// 检查更新的重试次数
const MAX_RETRY_COUNT = 3;
let retryCount = 0;
// 当前更新状态
let updateStatus = 'idle';
// 缓存的更新信息
let cachedUpdateInfo = null;
// 缓存的下载进度
let cachedProgress = null;
// 标记当前检查是否为用户主动触发
// 用户主动检查时会显示 React UI，启动时自动检查则静默下载
let isUserTriggeredCheck = false;
// ============================================
// Getter / Setter
// ============================================
function getRetryCount() {
    return retryCount;
}
function incrementRetryCount() {
    return ++retryCount;
}
function resetRetryCount() {
    retryCount = 0;
}
function getMaxRetryCount() {
    return MAX_RETRY_COUNT;
}
// ============================================
// 更新状态管理
// ============================================
function getUpdateStatus() {
    return updateStatus;
}
function setUpdateStatus(status) {
    logger.info(`[Updater] 状态变更: ${updateStatus} -> ${status}`);
    updateStatus = status;
}
// 便捷方法：检查当前状态
function isChecking() {
    return updateStatus === 'checking';
}
function isDownloading() {
    return updateStatus === 'downloading';
}
function isDownloaded() {
    return updateStatus === 'downloaded';
}
function isUpToDate() {
    return updateStatus === 'not-available';
}
// ============================================
// 缓存信息管理
// ============================================
function getCachedUpdateInfo() {
    return cachedUpdateInfo;
}
function setCachedUpdateInfo(info) {
    cachedUpdateInfo = info;
}
function getCachedProgress() {
    return cachedProgress;
}
function setCachedProgress(progress) {
    cachedProgress = progress;
}
// ============================================
// 用户触发标记
// ============================================
function getIsUserTriggeredCheck() {
    return isUserTriggeredCheck;
}
function setIsUserTriggeredCheck(value) {
    isUserTriggeredCheck = value;
    logger.info(`[Updater] 用户主动触发检查: ${value}`);
}
/**
 * 重置所有临时状态标记
 */
function resetTempFlags() {
    isUserTriggeredCheck = false;
}
/**
 * 重置更新缓存（用于重新开始下载流程）
 */
function resetUpdateCache() {
    logger.info('[Updater] 重置更新缓存');
    updateStatus = 'idle';
    cachedUpdateInfo = null;
    cachedProgress = null;
}
