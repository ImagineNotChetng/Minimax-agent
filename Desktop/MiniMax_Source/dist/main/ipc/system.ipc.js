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
exports.setupSystemIPC = setupSystemIPC;
exports.uploadLog = uploadLog;
/**
 * 系统信息 IPC 处理
 * 主题相关、语言设置等
 */
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const archiver_1 = __importDefault(require("archiver"));
const utils_1 = require("../utils");
const constants_1 = require("../config/constants");
const oss_1 = require("../modules/oss");
const storage_ipc_1 = require("./storage.ipc");
/**
 * 设置系统信息 IPC 处理器
 */
function setupSystemIPC(getMainWindow) {
    // 获取系统主题
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_GET_THEME, () => {
        return electron_1.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });
    // 监听系统主题变化
    electron_1.nativeTheme.on('updated', () => {
        getMainWindow()?.webContents.send(constants_1.IPC_CHANNELS.SYSTEM_THEME_CHANGED, electron_1.nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    });
    // 获取日志文件路径
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_GET_LOG_FILE_PATH, () => {
        return (0, utils_1.getLogFilePath)();
    });
    // 打开日志文件（使用系统默认应用）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_OPEN_LOG_FILE, async () => {
        const logPath = (0, utils_1.getLogFilePath)();
        try {
            await electron_1.shell.openPath(logPath);
            return { success: true, path: logPath };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 重启应用（支持指定启动后跳转的页面）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.DESKTOP_RELAUNCH, (_, options) => {
        if (options?.targetUrl) {
            // 通过命令行参数传递目标 URL
            electron_1.app.relaunch({
                args: process.argv.slice(1).concat([`--target-url=${options.targetUrl}`]),
            });
        }
        else {
            electron_1.app.relaunch();
        }
        electron_1.app.exit(0);
    });
    // ============================================
    // 工作区目录
    // ============================================
    // 创建工作区目录（如果已存在则不创建）
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_CREATE_DIR, async (_, dirPath) => {
        try {
            // 使用 recursive: true 可以创建多级目录，且如果目录已存在不会报错
            await fs.promises.mkdir(dirPath, { recursive: true });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 打开指定文件夹
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_OPEN_DIR, async (_, dirPath) => {
        try {
            await electron_1.shell.openPath(dirPath);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    });
    // 在文件夹中显示文件
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_OPEN_FILE_IN_FOLDER, async (_, filePath) => {
        try {
            electron_1.shell.showItemInFolder(filePath);
            return { success: true };
        }
        catch (error) {
            console.error('[FileModule] Show in folder error:', error);
            return { success: false, error: String(error) };
        }
    });
    // 获取用户 home 目录路径
    // macOS/Linux: ~
    // Windows: %USERPROFILE%
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_GET_HOME_PATH, () => {
        return os.homedir();
    });
    // ============================================
    // 渲染进程日志上报
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.LOGGER_LOG, (_, params) => {
        const { level, message, data, category, filenamePrefix } = params;
        const prefix = '[Renderer]';
        const logContent = data !== undefined ? { msg: `${prefix} ${message}`, data } : `${prefix} ${message}`;
        // 根据传入的 category 选择对应的 logger，默认 Main
        const targetLogger = category && category !== 'main' ? (0, utils_1.getCategoryLogger)(category, filenamePrefix) : utils_1.logger;
        switch (level) {
            case 'debug':
                targetLogger.debug(logContent);
                break;
            case 'info':
                targetLogger.info(logContent);
                break;
            case 'warn':
                targetLogger.warn(logContent);
                break;
            case 'error':
                targetLogger.error(logContent);
                break;
            default:
                targetLogger.info(logContent);
        }
        return { success: true };
    });
    // ============================================
    // 上传日志到 OSS
    // ============================================
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SYSTEM_UPLOAD_LOG, async () => {
        return uploadLog();
    });
}
/**
 * 上传日志到 OSS
 * 可在主进程中直接调用
 */
async function uploadLog() {
    try {
        utils_1.logger.info('[UploadLog] Starting log upload...');
        // 获取日志目录
        const logDir = (0, utils_1.getLogDir)();
        if (!fs.existsSync(logDir)) {
            return { success: false, error: 'Log directory not found' };
        }
        // 获取最近 2 天的所有类别日志文件
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const logFiles = [];
        const files = fs.readdirSync(logDir);
        for (const file of files) {
            // 匹配所有类别的日志文件（main-、update-、api-、heartbeat-、chat-）
            if ((0, utils_1.isLogFile)(file)) {
                const filePath = path.join(logDir, file);
                const stat = fs.statSync(filePath);
                // 检查文件修改时间是否在最近 2 天内
                if (stat.mtime >= twoDaysAgo) {
                    logFiles.push({
                        name: file,
                        path: filePath,
                        date: stat.mtime,
                    });
                }
            }
        }
        if (logFiles.length === 0) {
            return { success: false, error: 'No log files found in the last 2 days' };
        }
        // 按日期排序
        logFiles.sort((a, b) => a.date.getTime() - b.date.getTime());
        // 生成日期范围字符串 (格式: YYYYMMDD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        };
        const fromDate = formatDate(logFiles[0].date);
        const toDate = formatDate(logFiles[logFiles.length - 1].date);
        // 获取设备标识（使用 userID 或生成随机 ID）
        const userInfo = (0, storage_ipc_1.getUserInfo)();
        const deviceId = userInfo.realUserID || userInfo.userID || `anonymous_${Date.now()}`;
        // 生成 zip 文件名: logs_YYYYMMDD-YYYYMMDD_timestamp.zip
        const timestamp = Date.now();
        const zipFileName = `logs_${fromDate}-${toDate}_${timestamp}.zip`;
        const zipFilePath = path.join(logDir, zipFileName);
        utils_1.logger.info(`[UploadLog] Creating zip file: ${zipFileName} with ${logFiles.length} log files`);
        // 创建 zip 文件
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipFilePath);
            const archive = (0, archiver_1.default)('zip', {
                zlib: { level: 9 }, // 最高压缩级别
            });
            output.on('close', () => {
                utils_1.logger.info(`[UploadLog] Zip file created: ${archive.pointer()} bytes`);
                resolve();
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            // 添加日志文件到 zip
            for (const logFile of logFiles) {
                archive.file(logFile.path, { name: logFile.name });
            }
            archive.finalize();
        });
        // 上传到 OSS
        utils_1.logger.info(`[UploadLog] Uploading to OSS: ${zipFilePath}`);
        const uploadResult = await (0, oss_1.uploadToOSS)({
            file_path: zipFilePath,
        }, true);
        // 删除本地 zip 文件
        try {
            fs.unlinkSync(zipFilePath);
            utils_1.logger.info(`[UploadLog] Deleted local zip file: ${zipFilePath}`);
        }
        catch (deleteError) {
            utils_1.logger.warn(`[UploadLog] Failed to delete local zip file: ${deleteError}`);
        }
        // 检查上传结果
        if (uploadResult.success === 1) {
            const resultPath = `${deviceId}/${zipFileName}`;
            utils_1.logger.info(`[UploadLog] Upload successful: ${resultPath}`);
            return { success: true, path: resultPath, uploadId: uploadResult.upload_id };
        }
        else {
            utils_1.logger.error(`[UploadLog] Upload failed: ${uploadResult.err_msg}`);
            return { success: false, error: uploadResult.err_msg || 'Upload failed' };
        }
    }
    catch (error) {
        utils_1.logger.error(`[UploadLog] Error: ${error}`);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
