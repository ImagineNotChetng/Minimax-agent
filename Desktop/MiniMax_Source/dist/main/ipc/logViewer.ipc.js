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
exports.setupLogViewerIPC = setupLogViewerIPC;
/**
 * 日志查看器 IPC 处理
 * 仅在测试环境可用
 */
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_log_1 = __importDefault(require("electron-log"));
const constants_1 = require("../config/constants");
const env_1 = require("../config/env");
const windows_1 = require("../windows");
/**
 * 获取日志目录路径
 */
function getLogDirectory() {
    // electron-log 默认日志目录
    const logFile = electron_log_1.default.transports.file.getFile();
    return path.dirname(logFile.path);
}
/**
 * 获取所有日志文件列表
 */
function getLogFiles() {
    const logDir = getLogDirectory();
    if (!fs.existsSync(logDir)) {
        return [];
    }
    try {
        const files = fs.readdirSync(logDir);
        const logFiles = [];
        for (const file of files) {
            if (file.endsWith('.log')) {
                const filePath = path.join(logDir, file);
                const stat = fs.statSync(filePath);
                logFiles.push({
                    name: file,
                    path: filePath,
                    size: stat.size,
                    modifiedTime: stat.mtime.toISOString(),
                });
            }
        }
        // 按修改时间倒序排列（最新的在前）
        logFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        return logFiles;
    }
    catch (error) {
        console.error('[LogViewer] Failed to get log files:', error);
        return [];
    }
}
/**
 * 解析日志行
 * 格式: [2024-01-15 10:30:45.123] [info] message
 */
function parseLogLine(line) {
    if (!line.trim()) {
        return null;
    }
    // 匹配格式: [日期时间] [级别] 消息
    const match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{3})?)\] \[(\w+)\] (.*)$/);
    if (match) {
        const [, timestamp, level, message] = match;
        return {
            timestamp,
            level: level.toLowerCase(),
            message,
            raw: line,
        };
    }
    // 如果不匹配标准格式，作为普通消息返回
    return {
        timestamp: '',
        level: 'info',
        message: line,
        raw: line,
    };
}
/**
 * 读取日志文件内容
 */
function getLogContent(filePath, maxLines = 1000) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        // 取最后 maxLines 行
        const recentLines = lines.slice(-maxLines);
        const entries = [];
        for (const line of recentLines) {
            const entry = parseLogLine(line);
            if (entry) {
                entries.push(entry);
            }
        }
        return entries;
    }
    catch (error) {
        console.error('[LogViewer] Failed to read log file:', error);
        return [];
    }
}
/**
 * 设置日志查看器 IPC 处理器
 */
function setupLogViewerIPC() {
    // 仅在测试环境启用
    if (!env_1.isTest && !env_1.isStaging) {
        return;
    }
    // 打开日志查看器窗口
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.LOG_VIEWER_OPEN, async () => {
        await (0, windows_1.createLogViewerWindow)();
        return { success: true };
    });
    // 获取日志文件列表
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.LOG_VIEWER_GET_FILES, () => {
        return getLogFiles();
    });
    // 获取日志文件内容
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.LOG_VIEWER_GET_CONTENT, (_, filePath, maxLines) => {
        // 安全检查：确保只能读取日志目录下的文件
        const logDir = getLogDirectory();
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith(logDir)) {
            console.error('[LogViewer] Attempted to read file outside log directory:', filePath);
            return [];
        }
        return getLogContent(normalizedPath, maxLines);
    });
    console.log('[LogViewer] IPC handlers registered');
}
