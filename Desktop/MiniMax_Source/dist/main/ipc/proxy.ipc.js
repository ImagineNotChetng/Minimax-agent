"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupProxyIPC = setupProxyIPC;
/**
 * HTTP 代理 IPC 处理
 * 通过主进程代理 HTTP 请求，绕过 CORS 限制
 *
 * 重要：使用 Electron 的 net.fetch 而不是 Node.js 的 fetch
 * net.fetch 会使用 Chromium 的网络栈，自动遵循系统代理设置
 * 这对于使用 VPN 的用户非常重要，确保请求能正确路由到海外服务器
 */
const electron_1 = require("electron");
const logger_1 = require("../utils/logger");
const tool_1 = require("../utils/tool");
const constants_1 = require("../config/constants");
const storage_ipc_1 = require("./storage.ipc");
const env_1 = require("../config/env");
const logger = (0, logger_1.getCategoryLogger)('api');
// 打印完整的 URL params，但排除敏感字段
const SENSITIVE_PARAMS = ['token'];
// 打印请求体最大长度
const MAX_LOG_BODY_LENGTH = 100;
// 打印响应体最大长度
const MAX_LOG_RESPONSE_LENGTH = 300;
/**
 * 处理代理请求
 */
async function handleProxyFetch(options) {
    const controller = new AbortController();
    const timeout = options.timeout || 120000;
    const startTime = Date.now();
    const responseType = options.responseType || 'json';
    const isBinaryResponse = ['arraybuffer', 'blob', 'stream'].includes(responseType);
    const urlObj = new URL(options.url);
    const logMethod = options.method || 'GET';
    const logHost = urlObj.host;
    const logSearchParams = new URLSearchParams(urlObj.searchParams);
    SENSITIVE_PARAMS.forEach((key) => logSearchParams.delete(key));
    const logSearch = logSearchParams.toString() ? `?${logSearchParams.toString()}` : '';
    const logPath = urlObj.pathname + logSearch;
    const logBody = options.body
        ? options.body.length > MAX_LOG_BODY_LENGTH
            ? options.body.slice(0, MAX_LOG_BODY_LENGTH) + '...'
            : options.body
        : undefined;
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    try {
        // 确保有 User-Agent，避免被 Cloudflare 等安全服务拦截
        // Node 环境可以自由设置 Origin/Referer 等浏览器禁止修改的头
        const urlOrigin = urlObj.origin;
        const requestHeaders = {
            'User-Agent': (0, tool_1.getStandardUserAgent)(),
            Origin: urlOrigin,
            Referer: urlOrigin + '/',
            ...options.headers,
        };
        // 泳道环境：添加泳道请求头
        const desktopConfig = (0, storage_ipc_1.getDesktopConfig)();
        if ((env_1.isTest || env_1.isStaging || env_1.isDev) && desktopConfig.swimLaneName) {
            requestHeaders['lane'] = desktopConfig.swimLaneName;
            requestHeaders['bedrock_lane'] = desktopConfig.swimLaneName;
        }
        const fetchOptions = {
            method: options.method || 'GET',
            headers: requestHeaders,
            signal: controller.signal,
        };
        if (options.body && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
            fetchOptions.body = options.body;
        }
        // 使用 Electron 的 net.fetch 而不是 Node.js 的 fetch
        // net.fetch 会使用 Chromium 的网络栈，自动遵循系统代理设置
        // 这确保 VPN 用户的请求能正确路由到海外服务器
        const response = await electron_1.net.fetch(options.url, fetchOptions);
        clearTimeout(timeoutId);
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        const contentType = response.headers.get('content-type') || '';
        let data;
        if (isBinaryResponse) {
            const buffer = await response.arrayBuffer();
            // 使用 Node.js Buffer 直接转换为 base64，避免循环拼接字符串导致内存问题
            data = Buffer.from(buffer).toString('base64');
        }
        else if (responseType === 'document') {
            data = await response.text();
        }
        else if (responseType === 'text') {
            data = await response.text();
        }
        else {
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                }
                catch {
                    data = await response.text();
                }
            }
            else if (contentType.includes('text/') ||
                contentType.includes('application/xml') ||
                contentType.includes('application/javascript')) {
                data = await response.text();
            }
            else {
                try {
                    data = await response.text();
                }
                catch {
                    data = null;
                }
            }
        }
        const result = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers,
            data,
        };
        const duration = Date.now() - startTime;
        let responsePreview = '';
        if (isBinaryResponse) {
            const dataLen = typeof data === 'string' ? data.length : 0;
            const bytesSize = Math.round((dataLen * 3) / 4);
            responsePreview = `[Binary ${responseType} ${bytesSize} bytes]`;
        }
        else if (data && typeof data === 'object') {
            try {
                const dataStr = JSON.stringify(data);
                responsePreview =
                    dataStr.length > MAX_LOG_RESPONSE_LENGTH
                        ? dataStr.slice(0, MAX_LOG_RESPONSE_LENGTH) + '...'
                        : dataStr;
            }
            catch {
                responsePreview = '[Object]';
            }
        }
        else if (data && typeof data === 'string') {
            responsePreview =
                data.length > MAX_LOG_RESPONSE_LENGTH
                    ? data.slice(0, MAX_LOG_RESPONSE_LENGTH) + '...'
                    : data;
        }
        const logFn = response.ok ? logger.info.bind(logger) : logger.error.bind(logger);
        logFn({
            msg: `[IPC Proxy] ${logMethod} ${logHost}${logPath}`,
            duration: `${duration}ms`,
            status: `${response.status} ${response.statusText}`,
            requestHeaders: requestHeaders,
            responseHeaders: headers,
            request: logBody || undefined,
            response: responsePreview || undefined,
        });
        return result;
    }
    catch (error) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        logger.error({
            msg: `[IPC Proxy] ${logMethod} ${logHost}${logPath}`,
            duration: `${duration}ms`,
            status: isTimeout ? 'TIMEOUT' : 'ERROR',
            error: errorMsg,
            requestHeaders: options.headers,
            request: logBody || undefined,
        });
        if (isTimeout) {
            return {
                ok: false,
                status: 0,
                statusText: 'Request timeout',
                headers: {},
                data: null,
            };
        }
        return {
            ok: false,
            status: 0,
            statusText: errorMsg,
            headers: {},
            data: null,
        };
    }
}
/**
 * 设置代理请求 IPC 处理器
 */
function setupProxyIPC() {
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.PROXY_FETCH, (_, options) => {
        return handleProxyFetch(options);
    });
}
