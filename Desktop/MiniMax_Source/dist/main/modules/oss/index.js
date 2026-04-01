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
exports.downloadFromOSS = exports.uploadMultipleToOSS = exports.uploadToOSS = exports.getPresignedUrl = void 0;
/**
 * OSS 模块
 * 上传/下载文件到 OSS
 */
const fs = __importStar(require("fs/promises"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const storage_ipc_1 = require("../../ipc/storage.ipc");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = require("../../config");
const tool_1 = require("../../utils/tool");
const FILE_META_SUCCESS = 1;
const FILE_META_FAILED = 0;
const PATH = '/matrix/api/v1/log/upload';
const DESKTOP_UPLOAD_PATH = '/matrix/api/v1/desktop/upload';
/**
 * 获取预签名 URL
 * @returns 预签名 URL 响应
 */
const getPresignedUrl = async (isLog = false, baseFileName) => {
    const userInfo = (0, storage_ipc_1.getUserInfo)();
    const path = `${config_1.isDev
        ? config_1.isEn
            ? 'https://matrix-overseas-test.xaminim.com'
            : 'https://matrix-test.xaminim.com'
        : config_1.DOMAIN_URL}${isLog ? PATH : DESKTOP_UPLOAD_PATH}`;
    try {
        const resp = await electron_1.net.fetch(path, {
            method: 'POST',
            headers: {
                'User-Agent': (0, tool_1.getStandardUserAgent)(),
                Origin: config_1.DOMAIN_URL,
                Referer: config_1.DOMAIN_URL + '/',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                device_id: userInfo.deviceID,
                base_file_name: baseFileName,
            }),
        });
        const data = (await resp.json());
        return data;
    }
    catch (error) {
        logger_1.default.error(`[OSS] Failed to get presigned URL: ${path}, error: ${JSON.stringify(error)}`);
        throw error;
    }
};
exports.getPresignedUrl = getPresignedUrl;
/**
 * 上传单个文件到 OSS
 * @param fileInfo 文件元信息
 * @returns 上传结果
 */
const uploadToOSS = async (fileInfo, isLog = false) => {
    const { file_path } = fileInfo;
    if (!file_path) {
        return {
            ...fileInfo,
            success: FILE_META_FAILED,
            err_msg: 'No file path provided',
        };
    }
    let fileName = '';
    try {
        // 如果是 /user/download/xxx.mp4 -> xxx.mp4
        fileName = path_1.default.basename(file_path);
    }
    catch (error) {
        // ignored
    }
    try {
        const { upload_url: presignedUrl, upload_id: uploadId } = await (0, exports.getPresignedUrl)(isLog, fileName);
        logger_1.default.info(`[OSS] Presigned URL: ${presignedUrl}`);
        logger_1.default.info(`[OSS] Upload ID: ${uploadId}`);
        if (!presignedUrl) {
            return {
                ...fileInfo,
                success: FILE_META_FAILED,
                err_msg: 'No presigned url provided',
            };
        }
        // 检查文件是否存在
        try {
            await fs.access(file_path);
        }
        catch {
            return {
                ...fileInfo,
                success: FILE_META_FAILED,
                err_msg: `File not found: ${file_path}`,
            };
        }
        // 读取文件内容
        const fileBuffer = await fs.readFile(file_path);
        // 使用 PUT 方法上传到预签名 URL
        // ⚠️ 注意：不要设置 Content-Type 和 Content-Length
        // 预签名 URL 的签名已包含这些信息，手动设置会导致签名不匹配
        // 使用 Blob 确保与标准 fetch API 完全兼容
        const uploadResponse = await electron_1.net.fetch(presignedUrl, {
            method: 'PUT',
            body: new Uint8Array(fileBuffer),
        });
        logger_1.default.info(`[OSS] Upload response: ${JSON.stringify(uploadResponse)}`);
        if (!uploadResponse.ok) {
            // 获取错误响应体以便调试
            let errorBody = '';
            try {
                errorBody = await uploadResponse.text();
            }
            catch (e) {
                errorBody = '(unable to read error body)';
            }
            logger_1.default.error(`[OSS] Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            logger_1.default.error(`[OSS] Error body: ${errorBody}`);
            return {
                ...fileInfo,
                success: FILE_META_FAILED,
                err_msg: `Upload failed with status: ${uploadResponse.status} ${uploadResponse.statusText}`,
            };
        }
        // 从预签名 URL 中提取 CDN URL（去掉查询参数）
        const cdnUrl = presignedUrl.split('?')[0];
        logger_1.default.info(`[OSS] Upload successful: from ${file_path} to ${cdnUrl}`);
        return {
            ...fileInfo,
            upload_id: uploadId,
            cdn_url: cdnUrl,
            success: FILE_META_SUCCESS,
        };
    }
    catch (error) {
        logger_1.default.error(`[OSS] Upload error: ${error}`);
        return {
            ...fileInfo,
            success: FILE_META_FAILED,
            err_msg: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};
exports.uploadToOSS = uploadToOSS;
/**
 * 批量上传文件到 OSS
 * @param files 文件元信息数组
 * @returns 上传结果数组
 */
const uploadMultipleToOSS = async (files, isLog = false) => {
    const results = await Promise.all(files.map((file) => (0, exports.uploadToOSS)(file, isLog)));
    return results;
};
exports.uploadMultipleToOSS = uploadMultipleToOSS;
/**
 * 从 OSS 下载文件到本地
 * @param cdnUrl CDN URL
 * @param filePath 本地文件路径
 * @returns 是否下载成功
 */
const downloadFromOSS = async (cdnUrl, filePath) => {
    try {
        const response = await electron_1.net.fetch(cdnUrl);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        // 确保目标目录存在
        const dir = path_1.default.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        const buffer = await response.arrayBuffer();
        await fs.writeFile(path_1.default.normalize(filePath), Buffer.from(buffer));
        logger_1.default.info(`[OSS] Download successful: from ${cdnUrl} to ${filePath}`);
        return true;
    }
    catch (error) {
        logger_1.default.error(`[OSS] Download error: ${error}`);
        throw error;
    }
};
exports.downloadFromOSS = downloadFromOSS;
