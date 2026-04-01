"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_FILE_PREFIXES = void 0;
exports.getLogDir = getLogDir;
exports.getCategoryLogger = getCategoryLogger;
exports.getLogFilePath = getLogFilePath;
exports.isLogFile = isLogFile;
exports.cleanupOldLogs = cleanupOldLogs;
const config_1 = require("../config");
const electron_log_1 = __importDefault(require("electron-log"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Electron 主进程日志工具
 * 使用 electron-log 实现日志记录，按类别分文件写入
 *
 * 日志类别：
 * - update: 热更新 + 应用更新 (update-02-13.log)
 * - api: 非心跳 API 请求 (api-02-13.log)
 * - heartbeat: 心跳请求 (heartbeat-02-13.log)
 * - chat: WebSocket/消息/对话相关 (chat-{prefix}-02-13.log)
 * - main: 其他主进程日志，默认 (main-02-13.log)
 *
 * 特性：
 * - 开发环境：终端显示彩色日志
 * - 生产环境：终端显示 + 写入日志文件（按类别和日期分割，保留 7 天）
 *
 * 日志文件位置：
 * 国内版:
 *   - macOS: ~/Library/Logs/MiniMax/
 *   - Windows: %USERPROFILE%\AppData\Roaming\MiniMax\logs\
 *   - Linux: ~/.config/MiniMax/logs/
 * 海外版:
 *   - macOS: ~/Library/Logs/MiniMax Agent/
 *   - Windows: %USERPROFILE%\AppData\Roaming\MiniMax Agent\logs\
 *   - Linux: ~/.config/MiniMax Agent/logs/
 */
// 初始化 electron-log（如果 initialize 方法存在）
if (typeof electron_log_1.default.initialize === 'function') {
    electron_log_1.default.initialize();
}
// 控制台配置 - 始终输出到终端
electron_log_1.default.transports.console.level = config_1.isDev ? 'debug' : 'info';
electron_log_1.default.transports.console.format = config_1.isDev
    ? '[{h}:{i}:{s}.{ms}] [{level}] {text}'
    : '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
// 禁用 electron-log 默认的文件写入，改用自定义的分类文件写入
// 保留 file transport 的配置用于获取日志目录路径
electron_log_1.default.transports.file.level = false;
electron_log_1.default.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
electron_log_1.default.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
/**
 * 获取当前日期字符串 MM-DD
 */
function getDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}
// 默认日志文件名（main 类别）
electron_log_1.default.transports.file.fileName = `main-${getDateString()}.log`;
// 错误捕获 - 记录未捕获的异常
electron_log_1.default.errorHandler.startCatching();
/**
 * 获取日志目录路径
 */
function getLogDir() {
    const logFile = electron_log_1.default.transports.file.getFile();
    return path_1.default.dirname(logFile.path);
}
/**
 * 获取指定类别的日志文件名
 * @param category - 日志类别
 * @param filenamePrefix - 文件名前缀（可选），用于在类别基础上进一步区分日志文件
 *   例如传入 chatId 生成 chat-12345-02-13.log
 */
function getLogFileName(category, filenamePrefix) {
    const dateStr = getDateString();
    if (filenamePrefix) {
        return `${category}-${filenamePrefix}-${dateStr}.log`;
    }
    return `${category}-${dateStr}.log`;
}
/**
 * 写入日志到指定类别的文件
 * 非开发环境下，将日志追加写入对应类别的文件
 */
function writeToFile(category, content, filenamePrefix) {
    if (config_1.isDev)
        return;
    try {
        const logDir = getLogDir();
        const fileName = getLogFileName(category, filenamePrefix);
        const filePath = path_1.default.join(logDir, fileName);
        // 确保日志目录存在
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
        fs_1.default.appendFileSync(filePath, content + '\n');
    }
    catch {
        // 静默失败，不影响主流程
    }
}
/**
 * 格式化日志数据对象
 */
function formatLogData(data) {
    if (typeof data === 'string') {
        return data;
    }
    if (typeof data === 'object' && data !== null) {
        try {
            const obj = data;
            if ('msg' in obj) {
                const { msg, ...rest } = obj;
                const restStr = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
                return `${msg}${restStr}`;
            }
            return JSON.stringify(data);
        }
        catch {
            return String(data);
        }
    }
    return String(data);
}
/**
 * 格式化日志行（带时间戳和级别）
 */
function formatLogLine(level, data) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
    return `[${timestamp}] [${level}] ${formatLogData(data)}`;
}
/**
 * 创建指定类别的 logger
 * @param category - 日志类别
 * @param filenamePrefix - 文件名前缀（可选），用于在类别基础上进一步区分日志文件
 */
function createCategoryLogger(category, filenamePrefix) {
    return {
        debug: (data) => {
            electron_log_1.default.debug(formatLogData(data));
            writeToFile(category, formatLogLine('debug', data), filenamePrefix);
        },
        info: (data) => {
            electron_log_1.default.info(formatLogData(data));
            writeToFile(category, formatLogLine('info', data), filenamePrefix);
        },
        warn: (data) => {
            electron_log_1.default.warn(formatLogData(data));
            writeToFile(category, formatLogLine('warn', data), filenamePrefix);
        },
        error: (data) => {
            electron_log_1.default.error(formatLogData(data));
            writeToFile(category, formatLogLine('error', data), filenamePrefix);
        },
    };
}
/**
 * Logger 接口，保持与之前 API 兼容
 * 默认写入 main 类别
 */
const logger = createCategoryLogger('main');
/**
 * 获取指定类别的 logger
 *
 * @example
 * ```ts
 * // 热更新日志
 * const updateLogger = getCategoryLogger('update');
 * updateLogger.info('[HotUpdate] checking...');
 *
 * // API 请求日志
 * const apiLogger = getCategoryLogger('api');
 * apiLogger.info('[IPC Proxy] GET /api/xxx');
 *
 * // 心跳日志
 * const heartbeatLogger = getCategoryLogger('heartbeat');
 * heartbeatLogger.info('[Heartbeat] sent');
 *
 * // 对话日志（带文件名前缀）
 * const chatLogger = getCategoryLogger('chat', '12345');
 * chatLogger.info('[WS] message received');
 * // → 写入 chat-12345-02-13.log
 * ```
 */
function getCategoryLogger(category, filenamePrefix) {
    return createCategoryLogger(category, filenamePrefix);
}
/**
 * 获取日志文件路径（默认 main 类别）
 */
function getLogFilePath() {
    if (config_1.isDev) {
        return '开发环境不写入日志文件';
    }
    return electron_log_1.default.transports.file.getFile().path;
}
/**
 * 匹配所有日志文件的前缀模式
 * 用于日志清理和上传时识别所有类别的日志文件
 */
exports.LOG_FILE_PREFIXES = ['main-', 'update-', 'api-', 'heartbeat-', 'chat-'];
/**
 * 判断文件名是否为日志文件
 */
function isLogFile(fileName) {
    return (fileName.endsWith('.log') && exports.LOG_FILE_PREFIXES.some((prefix) => fileName.startsWith(prefix)));
}
/**
 * 清理过期日志文件（保留最近 7 天）
 * 应在应用启动时调用
 */
function cleanupOldLogs() {
    if (config_1.isDev)
        return;
    try {
        const logDir = getLogDir();
        if (!fs_1.default.existsSync(logDir))
            return;
        const files = fs_1.default.readdirSync(logDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 天
        for (const file of files) {
            if (isLogFile(file)) {
                const filePath = path_1.default.join(logDir, file);
                const stat = fs_1.default.statSync(filePath);
                if (now - stat.mtimeMs > maxAge) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        }
    }
    catch {
        // 静默失败，不影响日志功能
    }
}
exports.default = logger;
