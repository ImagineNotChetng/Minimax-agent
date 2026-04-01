"use strict";
/**
 * 渲染进程热更新模块
 *
 * 版本格式：{appVersion}-renderer.{n}
 * 例如：3.0.3-renderer.1, 3.0.3-renderer.2
 *
 * 工作流程：
 * 1. 构建 App 时使用默认的 out/ 资源（没有热更新版本）
 * 2. 发布热更新时，生成 manifest.json 和 zip 包上传到 CDN
 * 3. 用户打开 App → 检测到热更新 → 下载 → 应用
 * 4. 如需回退，清除缓存即可使用打包时的版本
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setHotUpdateEnabled = exports.isHotUpdateEnabled = exports.getHotUpdateStatus = exports.clearHotUpdateCache = exports.downloadAndApplyHotUpdate = exports.checkForHotUpdate = exports.hotUpdateManager = exports.HotUpdateManager = exports.saveState = exports.readState = exports.getBaseAppVersion = exports.getAppVersion = exports.compareRendererVersions = exports.parseRendererVersion = exports.downloadFile = exports.calculateFileSha256 = exports.fetchText = exports.ensureDir = exports.getHotUpdateResourceDir = exports.getHotUpdateDir = exports.DEFAULT_MIN_APP_VERSION = exports.CHECK_INTERVAL = exports.STATE_FILENAME = exports.HOT_UPDATE_DIR = exports.MANIFEST_FILENAME = exports.HOT_UPDATE_BASE_URL = void 0;
// 导出配置
var config_1 = require("./config");
Object.defineProperty(exports, "HOT_UPDATE_BASE_URL", { enumerable: true, get: function () { return config_1.HOT_UPDATE_BASE_URL; } });
Object.defineProperty(exports, "MANIFEST_FILENAME", { enumerable: true, get: function () { return config_1.MANIFEST_FILENAME; } });
Object.defineProperty(exports, "HOT_UPDATE_DIR", { enumerable: true, get: function () { return config_1.HOT_UPDATE_DIR; } });
Object.defineProperty(exports, "STATE_FILENAME", { enumerable: true, get: function () { return config_1.STATE_FILENAME; } });
Object.defineProperty(exports, "CHECK_INTERVAL", { enumerable: true, get: function () { return config_1.CHECK_INTERVAL; } });
Object.defineProperty(exports, "DEFAULT_MIN_APP_VERSION", { enumerable: true, get: function () { return config_1.DEFAULT_MIN_APP_VERSION; } });
// 导出工具函数
var utils_1 = require("./utils");
Object.defineProperty(exports, "getHotUpdateDir", { enumerable: true, get: function () { return utils_1.getHotUpdateDir; } });
Object.defineProperty(exports, "getHotUpdateResourceDir", { enumerable: true, get: function () { return utils_1.getHotUpdateResourceDir; } });
Object.defineProperty(exports, "ensureDir", { enumerable: true, get: function () { return utils_1.ensureDir; } });
Object.defineProperty(exports, "fetchText", { enumerable: true, get: function () { return utils_1.fetchText; } });
Object.defineProperty(exports, "calculateFileSha256", { enumerable: true, get: function () { return utils_1.calculateFileSha256; } });
Object.defineProperty(exports, "downloadFile", { enumerable: true, get: function () { return utils_1.downloadFile; } });
Object.defineProperty(exports, "parseRendererVersion", { enumerable: true, get: function () { return utils_1.parseRendererVersion; } });
Object.defineProperty(exports, "compareRendererVersions", { enumerable: true, get: function () { return utils_1.compareRendererVersions; } });
Object.defineProperty(exports, "getAppVersion", { enumerable: true, get: function () { return utils_1.getAppVersion; } });
Object.defineProperty(exports, "getBaseAppVersion", { enumerable: true, get: function () { return utils_1.getBaseAppVersion; } });
// 导出状态管理
var state_1 = require("./state");
Object.defineProperty(exports, "readState", { enumerable: true, get: function () { return state_1.readState; } });
Object.defineProperty(exports, "saveState", { enumerable: true, get: function () { return state_1.saveState; } });
// 导出管理器
const manager_1 = require("./manager");
Object.defineProperty(exports, "HotUpdateManager", { enumerable: true, get: function () { return manager_1.HotUpdateManager; } });
// 导出单例
exports.hotUpdateManager = manager_1.HotUpdateManager.getInstance();
// 导出便捷函数
const checkForHotUpdate = (force) => exports.hotUpdateManager.checkForUpdate(force);
exports.checkForHotUpdate = checkForHotUpdate;
const downloadAndApplyHotUpdate = (manifest) => exports.hotUpdateManager.downloadAndApply(manifest);
exports.downloadAndApplyHotUpdate = downloadAndApplyHotUpdate;
const clearHotUpdateCache = () => exports.hotUpdateManager.clearCache();
exports.clearHotUpdateCache = clearHotUpdateCache;
const getHotUpdateStatus = () => exports.hotUpdateManager.getStatus();
exports.getHotUpdateStatus = getHotUpdateStatus;
const isHotUpdateEnabled = () => exports.hotUpdateManager.isEnabled();
exports.isHotUpdateEnabled = isHotUpdateEnabled;
const setHotUpdateEnabled = (enabled) => exports.hotUpdateManager.setEnabled(enabled);
exports.setHotUpdateEnabled = setHotUpdateEnabled;
