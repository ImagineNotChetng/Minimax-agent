"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Electron 预加载脚本
 * 通过 contextBridge 安全地暴露 API 到渲染进程
 */
const electron_1 = require("electron");
const IPC_CHANNELS = {
    // 主题
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
    AUTH_GOOGLE_OAUTH: 'auth:google-oauth',
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
    DIALOG_GET_PATH_FOR_FILE: 'dialog:get-path-for-file',
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
    // 全局快捷键
    DESKTOP_SET_GLOBAL_ACCESS_SHORTCUT: 'desktop:set-global-access-shortcut',
    DESKTOP_GET_GLOBAL_ACCESS_SHORTCUT: 'desktop:get-global-access-shortcut',
    DESKTOP_OPEN_NOTIFICATION_SETTINGS: 'desktop:open-notification-settings',
    DESKTOP_SET_LANGUAGE: 'desktop:set-language',
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
    BROWSER_LOG: 'browser:log',
    // 更新器
    UPDATER_CHECK: 'updater:check',
    UPDATER_INSTALL: 'updater:install',
    UPDATER_GET_VERSION: 'updater:get-version',
    UPDATER_STATUS: 'updater:status',
    UPDATER_OPEN_MODAL: 'updater:open-modal',
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
    TAB_BROWSER_CONFIRM_CLOSE_TAB: 'tab-browser:confirm-close-tab',
    TAB_BROWSER_SET_IS_OPENCLAW_TAB: 'tab-browser:set-is-openclaw-tab',
    TAB_BROWSER_FIND_OPENCLAW_TAB: 'tab-browser:find-openclaw-tab',
    // bash tools
    BASH_EXECUTE: 'bash:execute',
    BASH_GET_OUTPUT: 'bash:get-output',
    BASH_KILL_SHELL: 'bash:kill-shell',
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
    FILE_DOWNLOAD: 'file:download',
    FILE_UPLOAD: 'file:upload',
    FILE_CHMOD: 'file:chmod',
    // website tools
    WEBSITE_EXTRACT_CONTENT: 'website:extract-content',
    // 日志
    LOGGER_LOG: 'logger:log',
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
    // 系统通知
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_CLICK: 'notification:click',
    // 热更新
    HOT_UPDATE_CHECK: 'hot-update:check',
    HOT_UPDATE_DOWNLOAD: 'hot-update:download',
    HOT_UPDATE_CLEAR_CACHE: 'hot-update:clear-cache',
    HOT_UPDATE_RELOAD: 'hot-update:reload',
    HOT_UPDATE_GET_VERSION: 'hot-update:get-version',
    HOT_UPDATE_GET_VERSION_SYNC: 'hot-update:get-version-sync',
    // 应用生命周期
    APP_BEFORE_QUIT: 'app:before-quit',
    APP_CONFIRM_QUIT: 'app:confirm-quit',
    APP_BRING_TO_FRONT: 'app:bring-to-front',
};
// 直接从 process.env 读取环境变量
const isDev = process.env.NODE_ENV === 'development';
const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_LOCALE || 'en');
// 同步获取用户设置的语言（从主进程存储中读取）
// 使用 sendSync 确保在 preload 执行时就能获取到语言设置
let userLocale = DEFAULT_LOCALE;
try {
    const storedLanguage = electron_1.ipcRenderer.sendSync(IPC_CHANNELS.STORAGE_GET_LANGUAGE_SYNC);
    if (storedLanguage === 'en' || storedLanguage === 'zh') {
        userLocale = storedLanguage;
    }
}
catch (e) {
    //
}
// ============================================
// 同步获取平台信息（在 preload 执行时立即可用）
// 这些信息在渲染进程启动时就能获取，无需异步等待
// ============================================
// 同步获取热更新版本（用于 platformInfo 初始化）
let hotUpdateVersion = null;
try {
    hotUpdateVersion = electron_1.ipcRenderer.sendSync(IPC_CHANNELS.HOT_UPDATE_GET_VERSION_SYNC);
}
catch {
    // 主进程可能还没准备好，忽略错误
}
const platformInfo = {
    platform: process.platform,
    arch: process.arch,
    isElectron: true,
    buildEnv: process.env.NEXT_PUBLIC_BUILD_ENV,
    isDev: isDev,
    locale: userLocale,
    hotUpdateVersion,
};
// 暴露安全的 API 到渲染进程
const electronAPI = {
    // 系统相关
    getSystemTheme: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_THEME),
    onSystemThemeChanged: (callback) => {
        const handler = (_, theme) => callback(theme);
        electron_1.ipcRenderer.on(IPC_CHANNELS.SYSTEM_THEME_CHANGED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM_THEME_CHANGED, handler);
    },
    openDir: (dirPath) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_DIR, dirPath),
    createDir: (dirPath) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CREATE_DIR, dirPath),
    openFileInFolder: (filePath) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_FILE_IN_FOLDER, filePath),
    getHomePath: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_HOME_PATH),
    // 窗口控制
    windowMinimize: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    windowMaximize: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    windowClose: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    onMaximizedChanged: (callback) => {
        const handler = (_, isMaximized) => callback(isMaximized);
        electron_1.ipcRenderer.on(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_MAXIMIZED_CHANGED, handler);
    },
    isFullScreen: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_FULL_SCREEN),
    onFullScreenChanged: (callback) => {
        const handler = (_, isFullScreen) => callback(isFullScreen);
        electron_1.ipcRenderer.on(IPC_CHANNELS.WINDOW_FULL_SCREEN_CHANGED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_FULL_SCREEN_CHANGED, handler);
    },
    // 菜单事件
    onMenuNewChat: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.MENU_NEW_CHAT, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.MENU_NEW_CHAT, handler);
    },
    onMenuOpenSettings: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.MENU_OPEN_SETTINGS, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.MENU_OPEN_SETTINGS, handler);
    },
    // Google OAuth 登录（内置窗口方式，保留兼容）
    googleOAuth: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_GOOGLE_OAUTH),
    // 监听 OAuth 回调成功事件（通过 deeplink 登录成功后触发）
    onAuthCallbackSuccess: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.AUTH_CALLBACK_SUCCESS, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.AUTH_CALLBACK_SUCCESS, handler);
    },
    // 监听 OAuth 回调错误事件（通过 deeplink 登录失败后触发）
    onAuthCallbackError: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.AUTH_CALLBACK_ERROR, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.AUTH_CALLBACK_ERROR, handler);
    },
    // Supabase OAuth 授权
    supabaseOAuth: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_SUPABASE_OAUTH, params),
    // MCP OAuth 授权（用于第三方 MCP 服务如 Notion、Slack 等）
    mcpOAuth: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_MCP_OAUTH, params),
    // 检查登录状态
    checkAuthStatus: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHECK_STATUS),
    // 代理请求 - 通过主进程发起请求，绕过 CORS
    proxyFetch: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.PROXY_FETCH, options),
    // 对话框
    selectDirectory: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, options),
    selectFile: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FILE, options),
    saveFile: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SAVE_FILE, options),
    // 获取 File 对象的本地路径（用于拖拽上传）
    // 注意：webUtils.getPathForFile 必须在 preload 中调用，不能通过 IPC
    getPathForFile: (file) => {
        try {
            const path = electron_1.webUtils.getPathForFile(file);
            return { success: true, path: path };
        }
        catch (error) {
            console.error('[preload] getPathForFile error:', error);
            return {
                success: false,
                path: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
    // 存储 - Token（加密存储）
    getTokens: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_TOKENS),
    setTokens: (tokens) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SET_TOKENS, tokens),
    clearTokens: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR_TOKENS),
    getLocalStorageConfig: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_LOCAL_STORAGE_CONFIG),
    setLocalStorageConfig: (config) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SET_LOCAL_STORAGE_CONFIG, config),
    clearLocalStorageConfig: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR_LOCAL_STORAGE_CONFIG),
    // 存储 - 用户信息
    getUser: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_USER),
    setUser: (user) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SET_USER, user),
    clearUser: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR_USER),
    // 存储 - 应用配置
    getDesktopConfig: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_DESKTOP_CONFIG),
    setDesktopConfig: (config) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_SET_DESKTOP_CONFIG, config),
    // 存储 - 清除所有数据（登出）
    clearAllStorage: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.STORAGE_CLEAR_ALL),
    // 打开外部链接
    openExternal: (url) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
    // 认证
    apiKeyLogin: (apiKey) => electron_1.ipcRenderer.invoke('auth:api-key-login', apiKey),
    getApiKeyMasked: () => electron_1.ipcRenderer.invoke('auth:get-api-key-masked'),
    logout: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    // 切换到登录窗口（销毁当前窗口，创建登录窗口）
    // source: 触发来源，用于日志追踪异常退出
    navigateToLogin: (source) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_NAVIGATE_TO_LOGIN, source),
    // 登录成功后切换到主窗口（销毁登录窗口，创建主窗口）
    loginComplete: (user) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN_COMPLETE, user),
    // 监听登出事件（主窗口使用，设置窗口触发登出后通知主窗口）
    onLoggedOut: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.AUTH_LOGGED_OUT, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.AUTH_LOGGED_OUT, handler);
    },
    // 日志相关
    openLogFile: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_LOG_FILE),
    getLogFilePath: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_LOG_FILE_PATH),
    uploadLog: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_UPLOAD_LOG),
    // 重启应用（支持指定启动后跳转的页面）
    relaunch: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_RELAUNCH, options),
    // ============================================
    // 桌面设置 API
    // ============================================
    // 托盘设置
    setTrayVisible: (visible) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SET_TRAY_VISIBLE, visible),
    getTrayVisible: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_GET_TRAY_VISIBLE),
    // 开机自启动
    setRunOnStartup: (enabled) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SET_RUN_ON_STARTUP, enabled),
    getRunOnStartup: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_GET_RUN_ON_STARTUP),
    // 快捷键
    setGlobalAccessShortcut: (globalAccessShortcut) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SET_GLOBAL_ACCESS_SHORTCUT, globalAccessShortcut),
    getGlobalAccessShortcut: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_GET_GLOBAL_ACCESS_SHORTCUT),
    // 通知设置
    openNotificationSettings: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_OPEN_NOTIFICATION_SETTINGS),
    // 语言设置（需要重启）
    setLanguage: (language) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DESKTOP_SET_LANGUAGE, language),
    // Mini Chat Window
    miniChatCreate: (chatId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_CREATE, chatId),
    miniChatClose: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_CLOSE),
    miniChatShow: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_SHOW),
    miniChatHide: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_HIDE),
    miniChatResize: (height, resizable) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_RESIZE, height, resizable),
    miniChatMaximize: (chatId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.MINI_CHAT_MAXIMIZE, chatId),
    // Main Window Actions (主窗口监听来自主进程的消息)
    onSelectChat: (callback) => {
        const handler = (_, chatId) => callback(chatId);
        electron_1.ipcRenderer.on(IPC_CHANNELS.MAIN_WINDOW_SELECT_CHAT, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.MAIN_WINDOW_SELECT_CHAT, handler);
    },
    // Mini Chat Window Events
    onMiniChatBlur: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.MINI_CHAT_BLUR, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.MINI_CHAT_BLUR, handler);
    },
    onMiniChatFocus: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.MINI_CHAT_FOCUS, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.MINI_CHAT_FOCUS, handler);
    },
    // Screenshot
    screenshotStart: (workspaceDir) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_START, { workspaceDir }),
    // 系统通知（主进程 Notification API）
    showNotification: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SHOW, options),
    // 监听通知点击事件
    onNotificationClick: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.NOTIFICATION_CLICK, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.NOTIFICATION_CLICK, handler);
    },
    // ============================================
    // 应用生命周期 API
    // ============================================
    /**
     * 监听应用退出前事件
     * 当用户关闭应用时，主进程会先发送此事件，渲染进程可以执行清理操作
     * 渲染进程处理完毕后需要调用 confirmQuit() 确认退出
     */
    onBeforeQuit: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.APP_BEFORE_QUIT, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.APP_BEFORE_QUIT, handler);
    },
    /**
     * 确认退出应用
     * 渲染进程处理完退出前的清理工作后调用此方法确认退出
     */
    confirmQuit: () => electron_1.ipcRenderer.send(IPC_CHANNELS.APP_CONFIRM_QUIT),
    /**
     * 请求恢复窗口到前台
     * 当有正在运行的任务需要显示确认弹窗时调用
     */
    bringToFront: () => electron_1.ipcRenderer.send(IPC_CHANNELS.APP_BRING_TO_FRONT),
};
// 通过 contextBridge 安全地暴露 API
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// ============================================
// 同步暴露平台信息（无需 IPC，立即可用）
// 渲染进程可以通过 window.electronPlatform 同步访问
// ============================================
electron_1.contextBridge.exposeInMainWorld('electronPlatform', platformInfo);
// ============================================
// Browser Controller API
// 用于嵌入式浏览器控制
// ============================================
const browserAPI = {
    // 生命周期
    create: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CREATE, bounds),
    destroy: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_DESTROY),
    getState: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_STATE),
    setBounds: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SET_BOUNDS, bounds),
    setZoom: (factor) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SET_ZOOM, factor),
    // 导航
    navigate: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_NAVIGATE, params),
    goBack: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GO_BACK),
    goForward: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GO_FORWARD),
    reload: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_RELOAD),
    // 交互
    click: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CLICK, params),
    type: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TYPE, params),
    pressKey: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_PRESS_KEY, params),
    scroll: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SCROLL, params),
    hover: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_HOVER, params),
    // 获取信息
    screenshot: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SCREENSHOT, params),
    getDOM: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_DOM, params),
    htmlToMarkdown: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_HTML_TO_MARKDOWN, params),
    // 高级
    waitFor: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_WAIT_FOR, params),
    evaluate: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_EVALUATE, params),
    // 覆盖层
    overlayCreate: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OVERLAY_CREATE, params),
    overlayDestroy: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OVERLAY_DESTROY),
    overlaySetBounds: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OVERLAY_SET_BOUNDS, bounds),
    overlayShowFeedback: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OVERLAY_SHOW_FEEDBACK, params),
    // 事件监听
    onNavigate: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.BROWSER_ON_NAVIGATE, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_ON_NAVIGATE, handler);
    },
    onLoadStart: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.BROWSER_ON_LOAD_START, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_ON_LOAD_START, handler);
    },
    onLoadFinish: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.BROWSER_ON_LOAD_FINISH, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_ON_LOAD_FINISH, handler);
    },
    onError: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.BROWSER_ON_ERROR, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_ON_ERROR, handler);
    },
    /**
     * 监听来自 browser view / overlay view 的日志
     * 日志会被转发到当前 Tab 的渲染进程控制台
     */
    onLog: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.BROWSER_LOG, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.BROWSER_LOG, handler);
    },
};
electron_1.contextBridge.exposeInMainWorld('browserAPI', browserAPI);
// ============================================
// Updater API
// 用于应用自动更新
// ============================================
const updaterAPI = {
    // 检查更新
    checkForUpdates: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK, options),
    // 安装更新并重启
    quitAndInstall: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    // 获取当前版本
    getVersion: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_VERSION),
    // 监听更新状态变化
    onStatusChange: (callback) => {
        const handler = (_, event) => callback(event);
        electron_1.ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS, handler);
    },
    // 监听打开更新弹窗事件（由菜单栏触发）
    onOpenModal: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(IPC_CHANNELS.UPDATER_OPEN_MODAL, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_OPEN_MODAL, handler);
    },
};
electron_1.contextBridge.exposeInMainWorld('updaterAPI', updaterAPI);
// ============================================
// Deep Link API
// 用于接收从网页唤起时传递的参数
// ============================================
const deepLinkAPI = {
    // 监听 deep link 事件
    onDeepLink: (callback) => {
        const handler = (_, action) => callback(action);
        electron_1.ipcRenderer.on(IPC_CHANNELS.DEEPLINK_RECEIVED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.DEEPLINK_RECEIVED, handler);
    },
};
electron_1.contextBridge.exposeInMainWorld('deepLinkAPI', deepLinkAPI);
// ============================================
// Tab Browser API
// 用于多 Tab 浏览器视图控制
// ============================================
const tabAPI = {
    // 生命周期
    init: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_INIT, params),
    destroy: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_DESTROY),
    setBounds: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_SET_BOUNDS, bounds),
    // Tab 管理
    createTab: (url) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_CREATE_TAB, url),
    closeTab: (tabId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_CLOSE_TAB, tabId),
    activateTab: (tabId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_ACTIVATE_TAB, tabId),
    // 事件监听 - 只需要状态更新事件，包含 tabs 列表和每个 tab 的 isLoading 状态
    onStateUpdated: (callback) => {
        const handler = (_, state) => callback(state);
        electron_1.ipcRenderer.on(IPC_CHANNELS.TAB_BROWSER_STATE_UPDATED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.TAB_BROWSER_STATE_UPDATED, handler);
    },
    // 监听 Tab 被激活事件（用于刷新数据，如对话历史）
    onTabActivated: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.TAB_BROWSER_TAB_ACTIVATED, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.TAB_BROWSER_TAB_ACTIVATED, handler);
    },
    // 设置当前 Tab 的 parentChatId
    setParentChatId: (parentChatId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_SET_PARENT_CHAT_ID, parentChatId),
    // 通过 parentChatId 查找已打开该对话的 Tab
    findTabByParentChatId: (parentChatId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_FIND_TAB_BY_PARENT_CHAT_ID, parentChatId),
    // 请求关闭 Tab（带确认流程）
    requestCloseTab: (tabId) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_REQUEST_CLOSE_TAB, tabId),
    // 监听确认关闭 Tab 事件（主进程发送给激活 Tab）
    onConfirmCloseTab: (callback) => {
        const handler = (_, data) => callback(data);
        electron_1.ipcRenderer.on(IPC_CHANNELS.TAB_BROWSER_CONFIRM_CLOSE_TAB, handler);
        return () => electron_1.ipcRenderer.removeListener(IPC_CHANNELS.TAB_BROWSER_CONFIRM_CLOSE_TAB, handler);
    },
    // 设置当前 Tab 是否是 OpenClaw 页面
    setIsOpenClawTab: (isOpenClaw) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_SET_IS_OPENCLAW_TAB, isOpenClaw),
    // 查找已打开 OpenClaw 页面的 Tab
    findOpenClawTab: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.TAB_BROWSER_FIND_OPENCLAW_TAB),
};
electron_1.contextBridge.exposeInMainWorld('tabAPI', tabAPI);
// ============================================
// Bash Tool API
// 用于执行 Bash 工具
// ============================================
const bashToolAPI = {
    execute: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BASH_EXECUTE, params),
    getOutput: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BASH_GET_OUTPUT, params),
    killShell: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.BASH_KILL_SHELL, params),
};
electron_1.contextBridge.exposeInMainWorld('bashToolAPI', bashToolAPI);
// ============================================
// File Tool API
// 用于执行 File 工具
// ============================================
const fileToolAPI = {
    read: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, params),
    write: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, params),
    edit: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_EDIT, params),
    multiEdit: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_MULTI_EDIT, params),
    glob: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_GLOB, params),
    grep: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_GREP, params),
    list: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST, params),
    stat: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_STAT, params),
    delete: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, params),
    move: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_MOVE, params),
    copy: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY, params),
    trash: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_TRASH, params),
    download: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_DOWNLOAD, params),
    upload: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_UPLOAD, params),
    chmod: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.FILE_CHMOD, params),
};
electron_1.contextBridge.exposeInMainWorld('fileToolAPI', fileToolAPI);
const websiteToolAPI = {
    extractContentFromWebsites: (params) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WEBSITE_EXTRACT_CONTENT, params),
};
electron_1.contextBridge.exposeInMainWorld('websiteToolAPI', websiteToolAPI);
// ============================================
// Logger API
// 用于渲染进程上报关键日志到主进程
// ============================================
const loggerAPI = {
    debug: (message, data, options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, {
        level: 'debug',
        message,
        data,
        category: options?.category,
        filenamePrefix: options?.filenamePrefix,
    }),
    info: (message, data, options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, {
        level: 'info',
        message,
        data,
        category: options?.category,
        filenamePrefix: options?.filenamePrefix,
    }),
    warn: (message, data, options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, {
        level: 'warn',
        message,
        data,
        category: options?.category,
        filenamePrefix: options?.filenamePrefix,
    }),
    error: (message, data, options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOGGER_LOG, {
        level: 'error',
        message,
        data,
        category: options?.category,
        filenamePrefix: options?.filenamePrefix,
    }),
};
electron_1.contextBridge.exposeInMainWorld('loggerAPI', loggerAPI);
// ============================================
// Deploy API
// 用于项目部署（主线程负责压缩，渲染线程负责上传）
// ============================================
const deployAPI = {
    deploy: (targetPath, workspaceDir) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.DEPLOY_PROJECT, targetPath, workspaceDir),
};
electron_1.contextBridge.exposeInMainWorld('deployAPI', deployAPI);
// ============================================
// OpenClaw View API
// 用于管理 OpenClaw Gateway WebUI 的 WebContentsView
// ============================================
const openClawViewAPI = {
    create: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_VIEW_CREATE, bounds),
    destroy: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_VIEW_DESTROY),
    setBounds: (bounds) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_VIEW_SET_BOUNDS, bounds),
    // startGateway: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_GATEWAY_START),
    // stopGateway: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_GATEWAY_STOP),
    // restartGateway: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_GATEWAY_RESTART),
    // uninstallOpenclaw: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_UNINSTALL),
    getGatewayStatus: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_GET_STATUS),
    startStatusPolling: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_START_STATUS_POLLING),
    stopStatusPolling: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_STOP_STATUS_POLLING),
    onStatusChanged: (callback) => {
        const handler = (_event, status) => {
            callback(status);
        };
        electron_1.ipcRenderer.on(IPC_CHANNELS.OPENCLAW_STATUS_CHANGED, handler);
        // 返回取消订阅函数
        return () => {
            electron_1.ipcRenderer.removeListener(IPC_CHANNELS.OPENCLAW_STATUS_CHANGED, handler);
        };
    },
    takeScreenshot: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_TAKE_SCREENSHOT),
};
electron_1.contextBridge.exposeInMainWorld('openClawViewAPI', openClawViewAPI);
const logViewerAPI = {
    open: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOG_VIEWER_OPEN),
    getFiles: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOG_VIEWER_GET_FILES),
    getContent: (filePath, maxLines) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.LOG_VIEWER_GET_CONTENT, filePath, maxLines),
};
electron_1.contextBridge.exposeInMainWorld('logViewerAPI', logViewerAPI);
// ============================================
// Hot Update API
// 用于渲染进程热更新
// 类型定义在 @mmx-agent/electron-type/src/electron.ts
// ============================================
const hotUpdateAPI = {
    check: (force) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.HOT_UPDATE_CHECK, force),
    clearCache: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.HOT_UPDATE_CLEAR_CACHE),
    reload: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.HOT_UPDATE_RELOAD),
    getCurrentVersion: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.HOT_UPDATE_GET_VERSION),
};
electron_1.contextBridge.exposeInMainWorld('hotUpdateAPI', hotUpdateAPI);
