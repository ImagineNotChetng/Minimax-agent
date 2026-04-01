"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SHORTCUT = exports.SHORTCUT_KEYS = exports.IPC_CHANNELS = exports.DOMAIN_URL = exports.PROD_PROTOCOL = exports.DEV_SERVER_URL = exports.ALLOWED_OAUTH_DOMAINS = exports.ONBOARDING_WINDOW_HEIGHT = exports.ONBOARDING_WINDOW_WIDTH = exports.LOGIN_WINDOW_HEIGHT = exports.LOGIN_WINDOW_WIDTH = exports.MAIN_WINDOW_MIN_HEIGHT = exports.MAIN_WINDOW_MIN_WIDTH = exports.MAIN_WINDOW_HEIGHT = exports.MAIN_WINDOW_WIDTH = exports.MAIN_WINDOW_TITLE = exports.GOOGLE_CLIENT_ID = exports.FIREBASE_AUTH_DOMAIN = void 0;
const env_1 = require("./env");
exports.FIREBASE_AUTH_DOMAIN = env_1.isProd
    ? 'hailuo-ai.firebaseapp.com'
    : 'hailuoai-fd23b.firebaseapp.com';
exports.GOOGLE_CLIENT_ID = env_1.isProd
    ? '759297274593-pfid7m24v4g97qss70j7t5ac8u9mre80.apps.googleusercontent.com'
    : '849613179111-jsumti3qf3rlh48df6b8a97ug0ghtvh7.apps.googleusercontent.com';
exports.MAIN_WINDOW_TITLE = env_1.isEn ? 'MiniMax Agent' : 'MiniMax';
exports.MAIN_WINDOW_WIDTH = 1400;
exports.MAIN_WINDOW_HEIGHT = 900;
exports.MAIN_WINDOW_MIN_WIDTH = 768;
exports.MAIN_WINDOW_MIN_HEIGHT = 600;
// 登录窗口尺寸
exports.LOGIN_WINDOW_WIDTH = env_1.isEn ? 600 : 700;
exports.LOGIN_WINDOW_HEIGHT = env_1.isEn ? 660 : 450;
// 引导窗口尺寸
exports.ONBOARDING_WINDOW_WIDTH = 1024;
exports.ONBOARDING_WINDOW_HEIGHT = 768;
// 允许 OAuth 相关导航的域名（用于安全模块和窗口处理）
exports.ALLOWED_OAUTH_DOMAINS = [
    // Supabase OAuth
    'supabase.com',
    'supabase.io',
    'auth.supabase.io',
    // Apple Sign In OAuth
    'appleid.apple.com',
    'idmsa.apple.com',
    // 外部 OAuth 提供商
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'login.microsoftonline.com',
];
exports.DEV_SERVER_URL = 'http://localhost:3100';
// 生产环境协议
exports.PROD_PROTOCOL = 'app://./';
exports.DOMAIN_URL = env_1.isEn
    ? env_1.isProd
        ? 'https://agent.minimax.io'
        : env_1.isStaging
            ? 'https://matrix-overseas-pre.xaminim.com'
            : env_1.isDev
                ? 'http://localhost:3000'
                : 'https://matrix-overseas-test.xaminim.com'
    : env_1.isProd
        ? 'https://agent.minimaxi.com'
        : env_1.isStaging
            ? 'https://matrix-pre.xaminim.com'
            : env_1.isDev
                ? 'http://localhost:3000'
                : 'https://matrix-test.xaminim.com';
exports.IPC_CHANNELS = {
    // 系统相关
    SYSTEM_GET_THEME: 'system:get-theme',
    SYSTEM_THEME_CHANGED: 'system:theme-changed',
    SYSTEM_OPEN_DIR: 'system:open-dir',
    SYSTEM_CREATE_DIR: 'system:create-dir',
    SYSTEM_OPEN_FILE_IN_FOLDER: 'system:open-file-in-folder',
    SYSTEM_GET_HOME_PATH: 'system:get-home-path',
    // 窗口控制
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE: 'window:maximize',
    WINDOW_CLOSE: 'window:close',
    WINDOW_IS_MAXIMIZED: 'window:is-maximized',
    WINDOW_MAXIMIZED_CHANGED: 'window:maximized-changed',
    WINDOW_IS_FULL_SCREEN: 'window:is-full-screen',
    WINDOW_FULL_SCREEN_CHANGED: 'window:full-screen-changed',
    // 菜单事件
    MENU_NEW_CHAT: 'menu:new-chat',
    MENU_OPEN_SETTINGS: 'menu:open-settings',
    // 认证
    AUTH_API_KEY_LOGIN: 'auth:api-key-login',
    AUTH_GET_API_KEY_MASKED: 'auth:get-api-key-masked',
    AUTH_SUPABASE_OAUTH: 'auth:supabase-oauth',
    AUTH_MCP_OAUTH: 'auth:mcp-oauth',
    AUTH_CHECK_STATUS: 'auth:check-status',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_NAVIGATE_TO_LOGIN: 'auth:navigate-to-login',
    AUTH_LOGIN_COMPLETE: 'auth:login-complete',
    AUTH_LOGGED_OUT: 'auth:logged-out',
    AUTH_CALLBACK_SUCCESS: 'auth:callback-success',
    AUTH_CALLBACK_ERROR: 'auth:callback-error',
    // 代理请求
    PROXY_FETCH: 'proxy:fetch',
    // 对话框
    DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',
    DIALOG_SELECT_FILE: 'dialog:select-file',
    DIALOG_SAVE_FILE: 'dialog:save-file',
    // 存储
    STORAGE_GET_TOKENS: 'storage:get-tokens',
    STORAGE_SET_TOKENS: 'storage:set-tokens',
    STORAGE_CLEAR_TOKENS: 'storage:clear-tokens',
    STORAGE_GET_USER: 'storage:get-user',
    STORAGE_SET_USER: 'storage:set-user',
    STORAGE_CLEAR_USER: 'storage:clear-user',
    STORAGE_GET_DESKTOP_CONFIG: 'storage:get-desktop-config',
    STORAGE_SET_DESKTOP_CONFIG: 'storage:set-desktop-config',
    STORAGE_CLEAR_ALL: 'storage:clear-all',
    STORAGE_GET_LANGUAGE_SYNC: 'storage:get-language-sync',
    STORAGE_GET_LOCAL_STORAGE_CONFIG: 'storage:get-local-storage-config',
    STORAGE_SET_LOCAL_STORAGE_CONFIG: 'storage:set-local-storage-config',
    STORAGE_CLEAR_LOCAL_STORAGE_CONFIG: 'storage:clear-local-storage-config',
    // 外部链接
    OPEN_EXTERNAL: 'open-external',
    // 系统
    SYSTEM_OPEN_LOG_FILE: 'system:open-log-file',
    SYSTEM_GET_LOG_FILE_PATH: 'system:get-log-file-path',
    SYSTEM_UPLOAD_LOG: 'system:upload-log',
    SYSTEM_RELAUNCH: 'system:relaunch',
    // 桌面设置
    DESKTOP_RELAUNCH: 'desktop:relaunch',
    DESKTOP_SET_TRAY_VISIBLE: 'desktop:set-tray-visible',
    DESKTOP_GET_TRAY_VISIBLE: 'desktop:get-tray-visible',
    DESKTOP_SET_RUN_ON_STARTUP: 'desktop:set-run-on-startup',
    DESKTOP_GET_RUN_ON_STARTUP: 'desktop:get-run-on-startup',
    // 全局快捷键设置
    DESKTOP_SET_GLOBAL_ACCESS_SHORTCUT: 'desktop:set-global-access-shortcut',
    DESKTOP_GET_GLOBAL_ACCESS_SHORTCUT: 'desktop:get-global-access-shortcut',
    DESKTOP_OPEN_NOTIFICATION_SETTINGS: 'desktop:open-notification-settings',
    DESKTOP_SET_LANGUAGE: 'desktop:set-language',
    // 系统通知
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_CLICK: 'notification:click',
    // 浏览器控制
    BROWSER_CREATE: 'browser:create',
    BROWSER_DESTROY: 'browser:destroy',
    BROWSER_GET_STATE: 'browser:get-state',
    BROWSER_SET_BOUNDS: 'browser:set-bounds',
    BROWSER_SET_ZOOM: 'browser:set-zoom',
    BROWSER_NAVIGATE: 'browser:navigate',
    BROWSER_GO_BACK: 'browser:go-back',
    BROWSER_GO_FORWARD: 'browser:go-forward',
    BROWSER_RELOAD: 'browser:reload',
    BROWSER_CLICK: 'browser:click',
    BROWSER_TYPE: 'browser:type',
    BROWSER_PRESS_KEY: 'browser:press-key',
    BROWSER_SCROLL: 'browser:scroll',
    BROWSER_HOVER: 'browser:hover',
    BROWSER_SCREENSHOT: 'browser:screenshot',
    BROWSER_GET_DOM: 'browser:get-dom',
    BROWSER_HTML_TO_MARKDOWN: 'browser:html-to-markdown',
    BROWSER_WAIT_FOR: 'browser:wait-for',
    BROWSER_EVALUATE: 'browser:evaluate',
    BROWSER_OVERLAY_CREATE: 'browser:overlay-create',
    BROWSER_OVERLAY_DESTROY: 'browser:overlay-destroy',
    BROWSER_OVERLAY_SET_BOUNDS: 'browser:overlay-set-bounds',
    BROWSER_OVERLAY_SHOW_FEEDBACK: 'browser:overlay-show-feedback',
    BROWSER_ON_NAVIGATE: 'browser:on-navigate',
    BROWSER_ON_LOAD_START: 'browser:on-load-start',
    BROWSER_ON_LOAD_FINISH: 'browser:on-load-finish',
    BROWSER_ON_ERROR: 'browser:on-error',
    // 更新器
    UPDATER_CHECK: 'updater:check',
    UPDATER_INSTALL: 'updater:install',
    UPDATER_GET_VERSION: 'updater:get-version',
    UPDATER_STATUS: 'updater:status',
    UPDATER_OPEN_MODAL: 'updater:open-modal', // 通知渲染进程打开更新弹窗
    // Deep Link
    DEEPLINK_RECEIVED: 'deeplink:received',
    // Tab 浏览器
    TAB_BROWSER_INIT: 'tab-browser:init',
    TAB_BROWSER_DESTROY: 'tab-browser:destroy',
    TAB_BROWSER_SET_BOUNDS: 'tab-browser:set-bounds',
    TAB_BROWSER_CREATE_TAB: 'tab-browser:create-tab',
    TAB_BROWSER_CLOSE_TAB: 'tab-browser:close-tab',
    TAB_BROWSER_ACTIVATE_TAB: 'tab-browser:activate-tab',
    TAB_BROWSER_STATE_UPDATED: 'tab-browser:state-updated',
    TAB_BROWSER_TAB_ACTIVATED: 'tab-browser:tab-activated',
    TAB_BROWSER_SET_PARENT_CHAT_ID: 'tab-browser:set-parent-chat-id',
    TAB_BROWSER_FIND_TAB_BY_PARENT_CHAT_ID: 'tab-browser:find-tab-by-parent-chat-id',
    TAB_BROWSER_REQUEST_CLOSE_TAB: 'tab-browser:request-close-tab',
    TAB_BROWSER_SET_IS_OPENCLAW_TAB: 'tab-browser:set-is-openclaw-tab',
    TAB_BROWSER_FIND_OPENCLAW_TAB: 'tab-browser:find-openclaw-tab',
    TAB_BROWSER_CONFIRM_CLOSE_TAB: 'tab-browser:confirm-close-tab',
    // bash tools
    BASH_EXECUTE: 'bash:execute',
    BASH_GET_OUTPUT: 'bash:get-output',
    BASH_KILL_SHELL: 'bash:kill-shell',
    BASH_REQUEST_CMD_ALLOW: 'bash:request-cmd-allow',
    // file tools
    FILE_READ: 'file:read',
    FILE_WRITE: 'file:write',
    FILE_EDIT: 'file:edit',
    FILE_MULTI_EDIT: 'file:multi-edit',
    FILE_GLOB: 'file:glob',
    FILE_GREP: 'file:grep',
    FILE_LIST: 'file:list',
    FILE_STAT: 'file:stat',
    FILE_DELETE: 'file:delete',
    FILE_MOVE: 'file:move',
    FILE_COPY: 'file:copy',
    FILE_TRASH: 'file:trash',
    // file upload download
    FILE_DOWNLOAD: 'file:download',
    FILE_UPLOAD: 'file:upload',
    FILE_CHMOD: 'file:chmod',
    // website tools
    WEBSITE_EXTRACT_CONTENT: 'website:extract-content',
    // 日志
    LOGGER_LOG: 'logger:log',
    // 跨 WebContentsView 日志（从 browser/overlay view 转发到 Tab 渲染进程）
    BROWSER_LOG: 'browser:log',
    // Deploy
    DEPLOY_PROJECT: 'deploy:project',
    // OpenClaw WebContentsView
    OPENCLAW_VIEW_CREATE: 'openclaw-view:create',
    OPENCLAW_VIEW_DESTROY: 'openclaw-view:destroy',
    OPENCLAW_VIEW_SET_BOUNDS: 'openclaw-view:set-bounds',
    // OPENCLAW_GATEWAY_START: 'openclaw:gateway-start',
    // OPENCLAW_GATEWAY_STOP: 'openclaw:gateway-stop',
    // OPENCLAW_GATEWAY_RESTART: 'openclaw:gateway-restart',
    // OPENCLAW_UNINSTALL: 'openclaw:uninstall',
    OPENCLAW_GET_STATUS: 'openclaw:get-status',
    OPENCLAW_START_STATUS_POLLING: 'openclaw:start-status-polling',
    OPENCLAW_STOP_STATUS_POLLING: 'openclaw:stop-status-polling',
    OPENCLAW_STATUS_CHANGED: 'openclaw:status-changed',
    OPENCLAW_TAKE_SCREENSHOT: 'openclaw:take-screenshot',
    // Mini Chat Window
    MINI_CHAT_CREATE: 'mini-chat:create',
    MINI_CHAT_CLOSE: 'mini-chat:close',
    MINI_CHAT_SHOW: 'mini-chat:show',
    MINI_CHAT_HIDE: 'mini-chat:hide',
    MINI_CHAT_RESIZE: 'mini-chat:resize',
    MINI_CHAT_MAXIMIZE: 'mini-chat:maximize',
    MINI_CHAT_BLUR: 'mini-chat:blur',
    MINI_CHAT_FOCUS: 'mini-chat:focus',
    // Main Window Actions (从主进程发送到主窗口渲染进程)
    MAIN_WINDOW_SELECT_CHAT: 'main-window:select-chat',
    // Screenshot
    SCREENSHOT_START: 'screenshot:start',
    // Log Viewer (仅测试环境)
    LOG_VIEWER_OPEN: 'log-viewer:open',
    LOG_VIEWER_GET_FILES: 'log-viewer:get-files',
    LOG_VIEWER_GET_CONTENT: 'log-viewer:get-content',
    // 热更新
    HOT_UPDATE_CHECK: 'hot-update:check',
    HOT_UPDATE_CLEAR_CACHE: 'hot-update:clear-cache',
    HOT_UPDATE_RELOAD: 'hot-update:reload',
    HOT_UPDATE_GET_VERSION: 'hot-update:get-version',
    HOT_UPDATE_GET_VERSION_SYNC: 'hot-update:get-version-sync',
    // 应用生命周期
    APP_BEFORE_QUIT: 'app:before-quit',
    APP_CONFIRM_QUIT: 'app:confirm-quit',
    APP_BRING_TO_FRONT: 'app:bring-to-front',
};
/** 全局快捷键键值 */
exports.SHORTCUT_KEYS = {
    MINI_CHAT_CREATE: 'miniChatCreate',
};
/** 全局快捷键默认值 */
exports.DEFAULT_SHORTCUT = {
    MINI_CHAT_CREATE: 'Alt+A',
};
