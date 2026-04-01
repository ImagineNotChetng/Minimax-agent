"use strict";
/**
 * Electron 页面路由配置
 * 根据环境自动选择正确的协议
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_URLS = exports.ROUTES = void 0;
exports.getPageURL = getPageURL;
const constants_1 = require("./constants");
const env_1 = require("./env");
/**
 * 页面路由定义
 */
exports.ROUTES = {
    /** app 启动首页 */
    MAIN: '/main',
    /** 主页 */
    HOME: '/',
    /** 登录页面 */
    LOGIN: '/login',
    /** 引导页面 */
    ONBOARDING: '/onboarding',
    /** 设置页面 */
    SETTINGS: '/settings',
    /** 聊天详情页面 */
    CHAT: '/chat',
    /** 浏览器操作反馈页面 */
    BROWSER_OVERLAY: '/browser-overlay',
    /** 定时任务页面 */
    SCHEDULE: '/schedule',
    /** 小窗聊天页面 */
    MINI_CHAT: '/mini-chat',
    /** 日志查看器页面 */
    LOG_VIEWER: '/log-viewer',
    /** 龙虾本地部署介绍页面 */
    OPEN_CLAW: '/open-claw',
};
/**
 * 根据环境获取完整的页面 URL
 * @param route - 路由路径
 * @returns 完整的 URL
 */
function getPageURL(route) {
    if (env_1.isDev) {
        return `${constants_1.DEV_SERVER_URL}${route}`;
    }
    // 生产环境：app://./settings -> 协议处理器会解析为 out/settings/index.html
    return `${constants_1.PROD_PROTOCOL}${route.startsWith('/') ? route.slice(1) : route}`;
}
/**
 * 预定义的页面 URL
 */
exports.PAGE_URLS = {
    get MAIN() {
        return getPageURL(exports.ROUTES.MAIN);
    },
    get HOME() {
        return getPageURL(exports.ROUTES.HOME);
    },
    get LOGIN() {
        return getPageURL(exports.ROUTES.LOGIN);
    },
    get ONBOARDING() {
        return getPageURL(exports.ROUTES.ONBOARDING);
    },
    get SETTINGS() {
        return getPageURL(exports.ROUTES.SETTINGS);
    },
    get CHAT() {
        return getPageURL(exports.ROUTES.CHAT);
    },
    get BROWSER_OVERLAY() {
        return getPageURL(exports.ROUTES.BROWSER_OVERLAY);
    },
    get MINI_CHAT() {
        return getPageURL(exports.ROUTES.MINI_CHAT);
    },
    get LOG_VIEWER() {
        return getPageURL(exports.ROUTES.LOG_VIEWER);
    },
};
