"use strict";
/**
 * 热更新模块工具函数
 */
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
exports.getHotUpdateDir = getHotUpdateDir;
exports.getHotUpdateResourceDir = getHotUpdateResourceDir;
exports.ensureDir = ensureDir;
exports.fetchText = fetchText;
exports.calculateFileSha256 = calculateFileSha256;
exports.downloadFile = downloadFile;
exports.parseRendererVersion = parseRendererVersion;
exports.compareRendererVersions = compareRendererVersions;
exports.getAppVersion = getAppVersion;
exports.getBaseAppVersion = getBaseAppVersion;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../utils");
const logger_1 = require("../../utils/logger");
const config_1 = require("./config");
const logger = (0, logger_1.getCategoryLogger)('update');
// ==================== 路径相关 ====================
/**
 * 获取热更新缓存目录路径
 */
function getHotUpdateDir() {
    return path.join(electron_1.app.getPath('userData'), config_1.HOT_UPDATE_DIR);
}
/**
 * 获取热更新资源目录路径（解压后的资源）
 */
function getHotUpdateResourceDir() {
    return path.join(getHotUpdateDir(), 'resources');
}
/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
// ==================== 网络请求 ====================
/**
 * 使用 Electron net.fetch 发起 GET 请求
 */
async function fetchText(url) {
    const response = await electron_1.net.fetch(url, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.text();
}
/**
 * 计算文件的 SHA256 哈希值
 */
async function calculateFileSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
/**
 * 使用 Electron net.fetch 下载文件到本地
 */
async function downloadFile(url, destPath, options) {
    ensureDir(path.dirname(destPath));
    const { expectedSha256, onProgress } = options || {};
    const response = await electron_1.net.fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedSize = 0;
    const fileStream = fs.createWriteStream(destPath);
    const reader = response.body?.getReader?.();
    if (!reader) {
        throw new Error('Response body is not readable');
    }
    try {
        let done = false;
        while (!done) {
            const result = await reader.read();
            done = result.done;
            if (result.value) {
                fileStream.write(Buffer.from(result.value));
                downloadedSize += result.value.length;
                if (onProgress && totalSize > 0) {
                    onProgress(downloadedSize, totalSize);
                }
            }
        }
        await new Promise((resolve, reject) => {
            fileStream.end((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        // 验证 SHA256
        if (expectedSha256) {
            logger.info('[HotUpdate] Verifying file integrity...');
            const actualSha256 = await calculateFileSha256(destPath);
            if (actualSha256 !== expectedSha256) {
                // 删除损坏的文件
                fs.unlinkSync(destPath);
                throw new Error(`SHA256 mismatch: expected ${expectedSha256}, got ${actualSha256}`);
            }
            logger.info('[HotUpdate] File integrity verified');
        }
    }
    catch (error) {
        fileStream.destroy();
        // 删除不完整或损坏的文件
        if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
        }
        throw error;
    }
    finally {
        // 释放 reader 资源
        reader?.releaseLock?.();
    }
}
// ==================== 版本相关 ====================
/**
 * 解析热更新版本号
 * 格式：{appVersion}-renderer.{n}
 * 例如：3.0.3-renderer.1
 */
function parseRendererVersion(version) {
    const match = version.match(/^(.+)-renderer\.(\d+)$/);
    if (!match) {
        return null;
    }
    return {
        appVersion: match[1],
        rendererNum: parseInt(match[2], 10),
    };
}
/**
 * 比较热更新版本号
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareRendererVersions(v1, v2) {
    // null 表示打包版本，任何热更新版本都 > null
    if (v1 === null && v2 === null)
        return 0;
    if (v1 === null)
        return -1;
    if (v2 === null)
        return 1;
    const parsed1 = parseRendererVersion(v1);
    const parsed2 = parseRendererVersion(v2);
    // 如果解析失败，按字符串比较
    if (!parsed1 || !parsed2) {
        return v1.localeCompare(v2);
    }
    // 先比较应用版本
    const appCompare = (0, utils_1.compareVersions)(parsed1.appVersion, parsed2.appVersion);
    if (appCompare !== 0) {
        return appCompare;
    }
    // 应用版本相同，比较渲染版本号
    if (parsed1.rendererNum > parsed2.rendererNum)
        return 1;
    if (parsed1.rendererNum < parsed2.rendererNum)
        return -1;
    return 0;
}
/**
 * 获取当前应用版本
 */
function getAppVersion() {
    return electron_1.app.getVersion();
}
/**
 * 获取应用基础版本号（去掉 -test.xx, -staging.xx 等后缀）
 * 例如：3.0.6-test.76 -> 3.0.6
 */
function getBaseAppVersion() {
    const version = electron_1.app.getVersion();
    // 匹配 x.y.z 格式，忽略后面的 -xxx.xx 后缀
    const match = version.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : version;
}
