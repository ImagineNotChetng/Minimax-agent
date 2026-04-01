"use strict";
/**
 * 热更新模块配置常量
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MIN_APP_VERSION = exports.CHECK_INTERVAL = exports.STATE_FILENAME = exports.HOT_UPDATE_DIR = exports.MANIFEST_FILENAME = exports.HOT_UPDATE_BASE_URL = void 0;
const config_1 = require("../../config");
/** 热更新 CDN 基础 URL */
exports.HOT_UPDATE_BASE_URL = config_1.isEn
    ? config_1.isProd
        ? 'https://file.cdn.minimax.io/public/minimax-agent/hot-update/en/prod'
        : config_1.isStaging
            ? 'https://file.cdn.minimax.io/public/minimax-agent/hot-update/en/staging'
            : config_1.isTest
                ? 'https://file.cdn.minimax.io/public/minimax-agent/hot-update/en/test'
                : ''
    : config_1.isProd
        ? 'https://filecdn.minimax.chat/public/minimax-agent/hot-update/zh/prod'
        : config_1.isStaging
            ? 'https://filecdn.minimax.chat/public/minimax-agent/hot-update/zh/staging'
            : config_1.isTest
                ? 'https://filecdn.minimax.chat/public/minimax-agent/hot-update/zh/test'
                : '';
/** 清单文件名 */
exports.MANIFEST_FILENAME = 'manifest.json';
/** 热更新缓存目录名 */
exports.HOT_UPDATE_DIR = 'hot-update';
/** 状态文件名 */
exports.STATE_FILENAME = 'state.json';
/** 检查间隔（毫秒）- 默认 6 小时 */
exports.CHECK_INTERVAL = 6 * 60 * 60 * 1000;
/** 默认最低支持热更新的应用版本 */
exports.DEFAULT_MIN_APP_VERSION = '3.0.6';
