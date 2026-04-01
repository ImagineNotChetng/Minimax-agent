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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isZh = exports.isEn = exports.LOCALE = exports.isDev = exports.isTest = exports.isStaging = exports.isProd = exports.buildEnv = exports.isMobile = exports.isNative = exports.isH5 = exports.isWeb = exports.isElectron = void 0;
exports.loadEnv = loadEnv;
/**
 * 加载环境变量
 * 必须在所有其他模块之前导入
 */
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_1 = require("electron");
// 判断是否为开发环境（Node.js 层面）
const isNodeDevMode = process.env.NODE_ENV === 'development';
/**
 * 获取 .env 文件路径
 * 开发环境：从项目根目录读取
 * 生产环境：从打包后的 app 目录读取 .env.local（构建时复制过来的）
 */
function getEnvFilePath() {
    const baseDir = isNodeDevMode ? path.join(__dirname, '..', '..', '..') : electron_1.app.getAppPath();
    if (isNodeDevMode) {
        // 开发环境：根据环境变量选择对应的 .env 文件
        const locale = process.env.NEXT_PUBLIC_LOCALE || 'en';
        const buildEnv = process.env.NEXT_PUBLIC_BUILD_ENV || 'dev';
        const envTypeMap = {
            dev: 'development',
            development: 'development',
            test: 'test',
            staging: 'staging',
            prod: 'production',
            production: 'production',
        };
        const envType = envTypeMap[buildEnv] || 'development';
        const envFileName = `.env.${locale}.${envType}`;
        return path.join(baseDir, envFileName);
    }
    else {
        // 生产环境：使用构建时复制的 .env.local 文件
        // 构建脚本会将对应环境的 .env 文件复制为 .env.local
        return path.join(baseDir, '.env.local');
    }
}
/**
 * 解析 .env 文件内容
 */
function parseEnvFile(content) {
    const result = {};
    content.split('\n').forEach((line) => {
        // 跳过空行和注释
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            return;
        }
        // 解析 KEY=VALUE 或 KEY="VALUE"
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // 移除引号
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
    });
    return result;
}
/**
 * 设置默认的国内线上环境变量
 * 当生产环境没有读取到 env 文件时使用
 */
function setDefaultZhProdEnv() {
    const defaultEnvVars = {
        NEXT_PUBLIC_BUILD_ENV: 'prod',
        NEXT_PUBLIC_LOCALE: 'zh',
    };
    Object.entries(defaultEnvVars).forEach(([key, value]) => {
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
    // eslint-disable-next-line no-console
    console.log('[Electron] Using default zh production environment');
}
/**
 * 加载环境变量
 */
function loadEnv() {
    const envFilePath = getEnvFilePath();
    if (!envFilePath) {
        console.warn('[Electron] No env file path determined');
        // 非开发环境下，使用默认的国内线上环境
        if (!isNodeDevMode) {
            setDefaultZhProdEnv();
        }
        return;
    }
    if (!fs.existsSync(envFilePath)) {
        console.warn(`[Electron] Env file not found: ${envFilePath}`);
        // 非开发环境下，使用默认的国内线上环境
        if (!isNodeDevMode) {
            setDefaultZhProdEnv();
        }
        return;
    }
    try {
        const content = fs.readFileSync(envFilePath, 'utf-8');
        const envVars = parseEnvFile(content);
        // 将环境变量注入到 process.env
        Object.entries(envVars).forEach(([key, value]) => {
            // 不覆盖已存在的环境变量
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        });
        // eslint-disable-next-line no-console
        console.log(`[Electron] Loaded env: ${envFilePath}`);
        // eslint-disable-next-line no-console
        console.log(`[Electron] BUILD_ENV=${process.env.NEXT_PUBLIC_BUILD_ENV}, LOCALE=${process.env.NEXT_PUBLIC_LOCALE}`);
    }
    catch (error) {
        console.error(`[Electron] Failed to load env file: ${envFilePath}`, error);
        // 非开发环境下，加载失败时使用默认的国内线上环境
        if (!isNodeDevMode) {
            setDefaultZhProdEnv();
        }
    }
}
// 立即执行加载
loadEnv();
// ============================================
// 导出环境变量（替代 @mmx-agent/const/src/env）
// 在 Electron 主进程中使用这些导出，而不是从 packages 导入
// ============================================
// 设备类型
exports.isElectron = true;
exports.isWeb = false;
exports.isH5 = false;
exports.isNative = false;
exports.isMobile = false;
// 构建环境
exports.buildEnv = process.env.NEXT_PUBLIC_BUILD_ENV;
exports.isProd = exports.buildEnv === 'prod';
exports.isStaging = exports.buildEnv === 'staging';
exports.isTest = exports.buildEnv === 'test';
exports.isDev = exports.buildEnv === 'dev' || exports.buildEnv === 'development';
// 语言环境
exports.LOCALE = (process.env.NEXT_PUBLIC_LOCALE || 'en');
exports.isEn = exports.LOCALE === 'en';
exports.isZh = exports.LOCALE === 'zh';
