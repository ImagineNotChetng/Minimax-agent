"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeLogViewerWindow = exports.getLogViewerWindow = exports.createLogViewerWindow = exports.toggleMiniChatDevTools = exports.closeMiniChatDevTools = exports.openMiniChatDevTools = exports.toggleMiniChatWindow = exports.hideMiniChatWindow = exports.showMiniChatWindow = exports.closeMiniChatWindow = exports.getMiniChatWindow = exports.createMiniChatWindow = exports.windowManager = exports.getMainWindow = void 0;
/**
 * 窗口管理模块入口
 */
var mainWindow_1 = require("./mainWindow");
Object.defineProperty(exports, "getMainWindow", { enumerable: true, get: function () { return mainWindow_1.getMainWindow; } });
var manager_1 = require("./manager");
Object.defineProperty(exports, "windowManager", { enumerable: true, get: function () { return manager_1.windowManager; } });
var miniChatWindow_1 = require("./miniChatWindow");
Object.defineProperty(exports, "createMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.createMiniChatWindow; } });
Object.defineProperty(exports, "getMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.getMiniChatWindow; } });
Object.defineProperty(exports, "closeMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.closeMiniChatWindow; } });
Object.defineProperty(exports, "showMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.showMiniChatWindow; } });
Object.defineProperty(exports, "hideMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.hideMiniChatWindow; } });
Object.defineProperty(exports, "toggleMiniChatWindow", { enumerable: true, get: function () { return miniChatWindow_1.toggleMiniChatWindow; } });
Object.defineProperty(exports, "openMiniChatDevTools", { enumerable: true, get: function () { return miniChatWindow_1.openMiniChatDevTools; } });
Object.defineProperty(exports, "closeMiniChatDevTools", { enumerable: true, get: function () { return miniChatWindow_1.closeMiniChatDevTools; } });
Object.defineProperty(exports, "toggleMiniChatDevTools", { enumerable: true, get: function () { return miniChatWindow_1.toggleMiniChatDevTools; } });
var logViewerWindow_1 = require("./logViewerWindow");
Object.defineProperty(exports, "createLogViewerWindow", { enumerable: true, get: function () { return logViewerWindow_1.createLogViewerWindow; } });
Object.defineProperty(exports, "getLogViewerWindow", { enumerable: true, get: function () { return logViewerWindow_1.getLogViewerWindow; } });
Object.defineProperty(exports, "closeLogViewerWindow", { enumerable: true, get: function () { return logViewerWindow_1.closeLogViewerWindow; } });
