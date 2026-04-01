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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProtocolScheme = registerProtocolScheme;
exports.setupProtocolHandler = setupProtocolHandler;
exports.getResourcePaths = getResourcePaths;
/**
 * 自定义协议处理模块
 * 用于在生产模式下加载 Next.js 静态导出的资源
 *
 * 这是 Electron + Next.js 静态导出的标准做法
 * 类似于 electron-serve 库的实现
 *
 * 热更新支持：
 * - 优先从热更新缓存目录加载资源
 * - 如果热更新资源不存在，回退到打包时的资源
 */
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const hotUpdate_1 = require("../hotUpdate");
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * 注册自定义协议 scheme
 * 必须在 app ready 之前调用
 */
function registerProtocolScheme() {
    electron_1.protocol.registerSchemesAsPrivileged([
        {
            scheme: 'app',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                corsEnabled: true,
            },
        },
    ]);
}
/**
 * 解析请求路径到实际文件路径
 * @param basePaths - 按优先级排序的基础路径数组
 * @param urlPath - URL 路径
 * @returns 解析后的文件路径
 */
function resolveFilePath(basePaths, urlPath) {
    // 遍历所有基础路径，找到第一个存在的文件
    for (const basePath of basePaths) {
        const filePath = path.join(basePath, urlPath);
        // 如果有扩展名，检查文件是否存在
        if (path.extname(filePath)) {
            if (fs.existsSync(filePath)) {
                return filePath;
            }
            continue;
        }
        // 检查是否是目录，加载 index.html
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            if (fs.existsSync(indexPath)) {
                return indexPath;
            }
        }
        // 尝试 .html 扩展名
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
            return htmlPath;
        }
        // 尝试目录下的 index.html
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return indexPath;
        }
    }
    // 如果都没找到，返回第一个基础路径下的文件（让 net.fetch 处理 404）
    const primaryPath = basePaths[0];
    const filePath = path.join(primaryPath, urlPath);
    if (path.extname(filePath)) {
        return filePath;
    }
    // 默认返回 index.html
    return path.join(primaryPath, urlPath, 'index.html');
}
/**
 * 设置自定义协议处理器
 * 支持热更新：优先从热更新缓存目录加载，回退到打包资源
 */
function setupProtocolHandler() {
    // 打包时的资源目录
    const bundledOutPath = path.join(electron_1.app.getAppPath(), 'out');
    // 热更新资源目录
    const hotUpdatePath = (0, hotUpdate_1.getHotUpdateResourceDir)();
    logger_1.default.info(`[Protocol] Bundled resources path: ${bundledOutPath}`);
    logger_1.default.info(`[Protocol] Hot update resources path: ${hotUpdatePath}`);
    electron_1.protocol.handle('app', (request) => {
        const url = new URL(request.url);
        let urlPath = decodeURIComponent(url.pathname);
        // 处理根路径
        if (urlPath === '/' || urlPath === '') {
            urlPath = '/index.html';
        }
        // 构建资源路径优先级列表
        // 如果热更新启用且热更新目录存在，优先使用热更新资源
        const basePaths = [];
        if ((0, hotUpdate_1.isHotUpdateEnabled)() && fs.existsSync(hotUpdatePath)) {
            basePaths.push(hotUpdatePath);
            // 打包资源作为回退
            basePaths.push(bundledOutPath);
        }
        else {
            // 只使用打包资源
            basePaths.push(bundledOutPath);
        }
        const filePath = resolveFilePath(basePaths, urlPath);
        // 记录资源加载来源（仅在开发调试时有用）
        const isFromHotUpdate = filePath.startsWith(hotUpdatePath);
        if (isFromHotUpdate) {
            logger_1.default.debug(`[Protocol] Loading from hot update: ${urlPath}`);
        }
        return electron_1.net.fetch('file://' + filePath);
    });
}
/**
 * 获取当前资源加载路径信息
 * 用于调试和状态显示
 */
function getResourcePaths() {
    const bundledPath = path.join(electron_1.app.getAppPath(), 'out');
    const hotUpdatePath = (0, hotUpdate_1.getHotUpdateResourceDir)();
    const isHotUpdateActive = (0, hotUpdate_1.isHotUpdateEnabled)() &&
        fs.existsSync(hotUpdatePath) &&
        fs.existsSync(path.join(hotUpdatePath, 'index.html'));
    return {
        bundledPath,
        hotUpdatePath,
        activeSource: isHotUpdateActive ? 'hot-update' : 'bundled',
    };
}
