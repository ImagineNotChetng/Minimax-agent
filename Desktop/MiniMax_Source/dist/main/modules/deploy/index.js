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
exports.deploy = deploy;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// @ts-ignore
const archiver_1 = __importDefault(require("archiver"));
/**
 * 检查目录是否为需要构建的源码目录
 */
async function checkIfSourceDirectory(dirPath) {
    try {
        const files = await fs.readdir(dirPath);
        // 检查是否有 package.json
        if (files.includes('package.json')) {
            const packageJsonPath = path.join(dirPath, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            // 检查是否有构建脚本
            if (packageJson.scripts?.build) {
                return {
                    isSource: true,
                    reason: 'Contains package.json with build script',
                    buildCommand: 'pnpm build',
                    distDir: 'dist',
                };
            }
            // 有 package.json 但没有 build 脚本
            if (files.includes('node_modules')) {
                return {
                    isSource: true,
                    reason: 'Contains package.json and node_modules',
                    buildCommand: undefined,
                    distDir: undefined,
                };
            }
        }
        // 检查是否有构建产物的特征
        const hasHtml = files.some((file) => file.endsWith('.html'));
        const hasAssets = files.some((file) => ['assets', 'static', 'css', 'js'].includes(file));
        if (hasHtml && hasAssets) {
            return {
                isSource: false,
                reason: 'Contains HTML files and asset directories',
            };
        }
        return {
            isSource: false,
            reason: 'No clear source code indicators found',
        };
    }
    catch (error) {
        console.error('[Deploy] Error checking source directory:', error);
        return {
            isSource: false,
            reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
/**
 * 执行项目构建
 */
async function buildProject(dirPath, buildCommand) {
    return new Promise((resolve) => {
        console.log(`[Deploy] Building project in ${dirPath} with command: ${buildCommand}`);
        const [command, ...args] = buildCommand.split(' ');
        const buildProcess = (0, child_process_1.spawn)(command, args, {
            cwd: dirPath,
            shell: true,
            env: { ...process.env },
        });
        let stdout = '';
        let stderr = '';
        buildProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`[Deploy] Build stdout: ${output}`);
        });
        buildProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.error(`[Deploy] Build stderr: ${output}`);
        });
        buildProcess.on('close', (code) => {
            if (code === 0) {
                console.log('[Deploy] Build completed successfully');
                resolve({ success: true });
            }
            else {
                console.error(`[Deploy] Build failed with code ${code}`);
                resolve({
                    success: false,
                    error: `Build failed with exit code ${code}. ${stderr || stdout}`,
                });
            }
        });
        buildProcess.on('error', (error) => {
            console.error('[Deploy] Build process error:', error);
            resolve({
                success: false,
                error: `Build process error: ${error.message}`,
            });
        });
    });
}
/**
 * 压缩目录为 tar.gz 格式
 * @param dirPath - 要压缩的目录路径
 * @param workspaceDir - 工作目录（压缩文件保存位置，如果未提供则使用系统临时目录）
 */
async function compressDirectory(dirPath, workspaceDir) {
    try {
        // 优先使用 workspaceDir，否则使用系统临时目录
        const outputDir = workspaceDir || os.tmpdir();
        const timestamp = Date.now();
        const outputFileName = `deploy-${timestamp}.tar.gz`;
        const outputPath = path.join(outputDir, outputFileName);
        console.log(`[Deploy] Compressing directory ${dirPath} to ${outputPath}`);
        const output = require('fs').createWriteStream(outputPath);
        const archive = (0, archiver_1.default)('tar', {
            gzip: true,
            gzipOptions: { level: 9 },
        });
        return new Promise((resolve, reject) => {
            output.on('close', () => {
                console.log(`[Deploy] Archive created successfully: ${archive.pointer()} bytes`);
                resolve({ success: true, filePath: outputPath });
            });
            archive.on('error', (err) => {
                console.error('[Deploy] Archive error:', err);
                reject({ success: false, error: err.message });
            });
            archive.pipe(output);
            archive.glob('**/*', {
                cwd: dirPath,
                ignore: [
                    'node_modules/**',
                    '.git/**',
                    '.DS_Store',
                    'Thumbs.db',
                    '*.log',
                    '.env',
                    '.env.local',
                    'coverage/**',
                    '.vscode/**',
                    '.idea/**',
                ],
            }, {});
            archive.finalize();
        });
    }
    catch (error) {
        console.error('[Deploy] Compression error:', error);
        return {
            success: false,
            error: `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
/**
 * 部署项目的主函数
 * 返回压缩后的文件路径，由渲染线程负责上传
 * @param targetPath - 目标路径（可以是绝对路径或相对路径）
 * @param workspaceDir - 用户选择的工作目录（用于解析相对路径）
 */
async function deploy(targetPath, workspaceDir) {
    try {
        console.log(`[Deploy] Starting deployment for path: ${targetPath}`);
        console.log(`[Deploy] Workspace directory: ${workspaceDir}`);
        // 1. 规范化路径处理
        let normalizedPath = targetPath;
        // 如果是相对路径（不以 / 或 ~ 开头，且不是 Windows 绝对路径）
        if (!path.isAbsolute(targetPath) &&
            !targetPath.startsWith('~') &&
            !/^[a-zA-Z]:/.test(targetPath)) {
            // 优先使用用户选择的 workspaceDir，否则使用桌面
            const basePath = workspaceDir || path.join(os.homedir(), 'Desktop');
            normalizedPath = path.join(basePath, targetPath);
            console.log(`[Deploy] Relative path detected, base: ${basePath}, resolved to: ${normalizedPath}`);
        }
        else if (targetPath.startsWith('~')) {
            // 处理 ~ 开头的路径
            normalizedPath = targetPath.replace(/^~/, os.homedir());
            console.log(`[Deploy] Home directory path resolved to: ${normalizedPath}`);
        }
        // 2. 检查路径是否存在
        try {
            const stats = await fs.stat(normalizedPath);
            if (!stats.isDirectory()) {
                return {
                    success: false,
                    message: 'Target path is not a directory',
                    error: 'Path must be a directory',
                };
            }
        }
        catch (error) {
            const errCode = error.code;
            if (errCode === 'ENOENT') {
                return {
                    success: false,
                    message: 'Target path does not exist',
                    error: `Path ${normalizedPath} not found`,
                };
            }
            else if (errCode === 'EACCES' || errCode === 'EPERM') {
                return {
                    success: false,
                    message: 'Permission denied',
                    error: `Cannot access ${normalizedPath}`,
                };
            }
            throw error;
        }
        // 3. 检查是否为源码目录（使用规范化后的路径）
        const sourceCheck = await checkIfSourceDirectory(normalizedPath);
        console.log(`[Deploy] Source check result:`, sourceCheck);
        let deployPath = normalizedPath;
        // 4. 如果是源码项目，需要检查是否能构建
        if (sourceCheck.isSource) {
            // 检查是否有构建脚本
            if (sourceCheck.buildCommand) {
                // 有构建脚本，执行构建
                const buildResult = await buildProject(normalizedPath, sourceCheck.buildCommand);
                if (!buildResult.success) {
                    return {
                        success: false,
                        message: 'Build failed',
                        error: buildResult.error,
                    };
                }
                // 构建成功后，使用构建产物目录
                if (sourceCheck.distDir) {
                    deployPath = path.join(normalizedPath, sourceCheck.distDir);
                    try {
                        const distStats = await fs.stat(deployPath);
                        if (!distStats.isDirectory()) {
                            return {
                                success: false,
                                message: 'Build output directory not found',
                                error: `Expected build output at ${deployPath}`,
                            };
                        }
                    }
                    catch (error) {
                        return {
                            success: false,
                            message: 'Build output directory not found',
                            error: `Build completed but output directory ${deployPath} not found`,
                        };
                    }
                }
            }
            else {
                // 是源码项目但没有构建脚本，无法生成静态文件
                return {
                    success: false,
                    message: 'Cannot deploy backend Node.js project to static CDN',
                    error: 'This appears to be a backend Node.js project without a build script. ' +
                        'It requires a Node.js runtime and cannot be deployed to a static CDN. ' +
                        'Please deploy to a server environment (e.g., AWS EC2, Vercel, Heroku) instead.',
                };
            }
        }
        // 5. 压缩目录（保存到 workspaceDir，如果未提供则使用系统临时目录）
        console.log(`[Deploy] Compressing directory: ${deployPath}`);
        const compressResult = await compressDirectory(deployPath, workspaceDir);
        if (!compressResult.success || !compressResult.filePath) {
            return {
                success: false,
                message: 'Compression failed',
                error: compressResult.error,
            };
        }
        // 6. 返回压缩文件路径（由渲染线程上传）
        return {
            success: true,
            message: 'Project compressed successfully, ready for upload',
            filePath: compressResult.filePath,
        };
    }
    catch (error) {
        console.error('[Deploy] Unexpected error:', error);
        return {
            success: false,
            message: 'Deployment failed with unexpected error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
