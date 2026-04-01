"use strict";
/**
 * Browser Controller 模块
 * 提供嵌入式浏览器控制功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrowserAgentManager = exports.BrowserAgentManager = exports.getOverlayController = exports.OverlayController = exports.getBrowserController = exports.BrowserController = void 0;
var controller_1 = require("./controller");
Object.defineProperty(exports, "BrowserController", { enumerable: true, get: function () { return controller_1.BrowserController; } });
Object.defineProperty(exports, "getBrowserController", { enumerable: true, get: function () { return controller_1.getBrowserController; } });
var overlay_controller_1 = require("./overlay-controller");
Object.defineProperty(exports, "OverlayController", { enumerable: true, get: function () { return overlay_controller_1.OverlayController; } });
Object.defineProperty(exports, "getOverlayController", { enumerable: true, get: function () { return overlay_controller_1.getOverlayController; } });
var browser_agent_manager_1 = require("./browser-agent-manager");
Object.defineProperty(exports, "BrowserAgentManager", { enumerable: true, get: function () { return browser_agent_manager_1.BrowserAgentManager; } });
Object.defineProperty(exports, "getBrowserAgentManager", { enumerable: true, get: function () { return browser_agent_manager_1.getBrowserAgentManager; } });
