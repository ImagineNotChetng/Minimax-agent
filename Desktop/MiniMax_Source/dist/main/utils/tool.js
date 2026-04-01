"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIsEn = exports.isLoggedIn = exports.getStandardUserAgent = void 0;
exports.fmtAgentJSONResult = fmtAgentJSONResult;
const electron_1 = require("electron");
const storage_ipc_1 = require("../ipc/storage.ipc");
const env_1 = require("../config/env");
/**
 * 获取标准 Chrome User-Agent（移除 Electron 标识）
 * example: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) @mmx-agent/electron/1.0.0 Chrome/140.0.7339.240 Electron/38.3.0 Safari/537.36
 * return: MiniMaxAgent Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.7339.240 Safari/537.36
 */
const getStandardUserAgent = () => {
    return ('MiniMaxAgent ' +
        electron_1.app.userAgentFallback
            .replace(/@mmx-agent\/electron\/[\d.]+\s+/, '') // 移除 @mmx-agent/electron/x.x.x
            .replace(/\s+Electron\/[\d.]+/, '')); // 移除 Electron/x.x.x
};
exports.getStandardUserAgent = getStandardUserAgent;
/**
 * 格式化 Agent 返回的 JSON 结果
 * LLM 返回的数据可能是字符串或对象，统一处理
 */
function fmtAgentJSONResult(result) {
    if (typeof result === 'object') {
        return { isObject: true, data: result, original: result };
    }
    try {
        const data = JSON.parse(result);
        if (typeof data === 'object' && data !== null) {
            return { isObject: true, data, original: result };
        }
        else {
            return { isObject: false, data: result, original: result };
        }
    }
    catch {
        return { isObject: false, data: result, original: result };
    }
}
/**
 * 检查是否已登录
 */
const isLoggedIn = () => {
    const tokens = (0, storage_ipc_1.getTokens)();
    return !!tokens.accessToken;
};
exports.isLoggedIn = isLoggedIn;
/**
 * 当前是否是英文环境
 */
const getIsEn = () => {
    try {
        const config = (0, storage_ipc_1.getDesktopConfig)();
        return config.language === 'en';
    }
    catch {
        return env_1.isEn;
    }
};
exports.getIsEn = getIsEn;
