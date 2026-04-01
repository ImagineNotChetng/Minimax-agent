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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForServer = exports.bringToFront = exports.cleanupOldLogs = exports.isLogFile = exports.getLogDir = exports.getCategoryLogger = exports.getLogFilePath = exports.logger = void 0;
/**
 * 工具函数模块入口
 */
var logger_1 = require("./logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return __importDefault(logger_1).default; } });
Object.defineProperty(exports, "getLogFilePath", { enumerable: true, get: function () { return logger_1.getLogFilePath; } });
Object.defineProperty(exports, "getCategoryLogger", { enumerable: true, get: function () { return logger_1.getCategoryLogger; } });
Object.defineProperty(exports, "getLogDir", { enumerable: true, get: function () { return logger_1.getLogDir; } });
Object.defineProperty(exports, "isLogFile", { enumerable: true, get: function () { return logger_1.isLogFile; } });
Object.defineProperty(exports, "cleanupOldLogs", { enumerable: true, get: function () { return logger_1.cleanupOldLogs; } });
var window_1 = require("./window");
Object.defineProperty(exports, "bringToFront", { enumerable: true, get: function () { return window_1.bringToFront; } });
Object.defineProperty(exports, "waitForServer", { enumerable: true, get: function () { return window_1.waitForServer; } });
__exportStar(require("./tool"), exports);
__exportStar(require("./screen"), exports);
__exportStar(require("./dialog"), exports);
__exportStar(require("./version"), exports);
