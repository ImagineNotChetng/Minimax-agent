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
exports.resetShellInfoCache = resetShellInfoCache;
exports.getCurrentShellInfo = getCurrentShellInfo;
exports.executeBashCommand = executeBashCommand;
exports.getBashOutput = getBashOutput;
exports.killBashShell = killBashShell;
/**
 * Bash 工具执行器
 * 核心执行逻辑
 *
 * ## 安全架构说明
 * 命令注入防护和安全验证由 Agent 服务端（大模型）负责，
 * 客户端不进行命令内容的安全检查。这种架构设计的原因：
 * 1. 服务端大模型具备更强的语义理解能力，可以更准确地判断命令意图
 * 2. 避免客户端正则匹配导致的误报，影响正常功能
 * 3. 安全策略集中管理，便于更新和维护
 *
 * @see .matrix_memory/architecture/security.md
 */
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const token_1 = require("../../utils/token");
const utils_1 = require("../../utils");
// 存储所有后台进程
const backgroundProcesses = new Map();
// Shell 信息缓存（只检测一次）
let cachedShellInfo = null;
// 后台进程输出缓冲区最大行数（避免内存无限增长）
const MAX_BACKGROUND_OUTPUT_LINES = 5000;
// 最大保留的已完成进程数量
const MAX_COMPLETED_PROCESSES = 30;
/**
 * 清理已完成的进程
 * - 保留最近 MAX_COMPLETED_PROCESSES 个已完成的进程
 * - 清理超过 1 小时的已完成进程的输出缓冲区
 */
function cleanupOldProcesses() {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const completed = Array.from(backgroundProcesses.values())
        .filter((p) => p.status !== 'running')
        .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0));
    // 清理超过限制数量的进程
    if (completed.length > MAX_COMPLETED_PROCESSES) {
        for (let i = MAX_COMPLETED_PROCESSES; i < completed.length; i++) {
            backgroundProcesses.delete(completed[i].id);
        }
    }
    // 清理超过 1 小时的进程的输出缓冲区（保留进程记录但释放内存）
    for (const process of completed.slice(0, MAX_COMPLETED_PROCESSES)) {
        if (process.endTime && now - process.endTime.getTime() > ONE_HOUR) {
            process.stdout = [];
            process.stderr = [];
        }
    }
}
/**
 * 检测并缓存用户的默认 shell 信息
 *
 * 平台检测：
 * - Windows: 优先 PowerShell，fallback 到 cmd.exe
 * - Unix: 使用 $SHELL 环境变量，fallback 到 /bin/bash
 *
 * 结果会被缓存，后续调用直接返回缓存值
 */
function getShellInfo() {
    // 如果已缓存，直接返回
    if (cachedShellInfo) {
        return cachedShellInfo;
    }
    // Windows 平台检测
    // 注意：process.platform 在 Windows 上始终返回 'win32'，无论是 32 位还是 64 位
    if (process.platform === 'win32') {
        // Windows 常见 PowerShell 路径
        const powershellPaths = [
            // PowerShell Core (跨平台版本，优先)
            'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
            'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
            // Windows PowerShell (系统自带)
            'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
            'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe',
        ];
        // 尝试查找 PowerShell
        for (const psPath of powershellPaths) {
            if (fs.existsSync(psPath)) {
                cachedShellInfo = { path: psPath, type: 'powershell', isWindows: true };
                // eslint-disable-next-line no-console
                console.log(`[BashExecutor] Detected Windows PowerShell: ${psPath}`);
                return cachedShellInfo;
            }
        }
        // Fallback 到 cmd.exe
        const cmdPath = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
        cachedShellInfo = { path: cmdPath, type: 'cmd', isWindows: true };
        // eslint-disable-next-line no-console
        console.log(`[BashExecutor] Detected Windows cmd: ${cmdPath}`);
        return cachedShellInfo;
    }
    // Unix 平台检测 (macOS, Linux)
    const envShell = process.env.SHELL || '';
    let shellPath = '';
    let shellType = 'bash';
    // 检测 shell 类型
    if (envShell.includes('zsh')) {
        shellType = 'zsh';
    }
    // 验证 SHELL 环境变量指向的路径是否可用
    if (envShell && fs.existsSync(envShell)) {
        shellPath = envShell;
    }
    else {
        // Fallback: 按优先级查找可用的 shell
        const fallbacks = shellType === 'zsh'
            ? ['/bin/zsh', '/usr/bin/zsh', '/bin/bash', '/usr/bin/bash', '/bin/sh']
            : ['/bin/bash', '/usr/bin/bash', '/bin/sh'];
        for (const fb of fallbacks) {
            if (fs.existsSync(fb)) {
                shellPath = fb;
                // 更新 shellType 以匹配实际使用的 shell
                if (fb.includes('zsh')) {
                    shellType = 'zsh';
                }
                else {
                    shellType = 'bash';
                }
                break;
            }
        }
        // 最终 fallback
        if (!shellPath) {
            shellPath = '/bin/sh';
            shellType = 'bash';
        }
    }
    // 缓存结果
    cachedShellInfo = { path: shellPath, type: shellType, isWindows: false };
    // eslint-disable-next-line no-console
    console.log(`[BashExecutor] Detected Unix shell: ${shellPath} (${shellType})`);
    return cachedShellInfo;
}
/**
 * 重置 shell 信息缓存（主要用于测试）
 */
function resetShellInfoCache() {
    cachedShellInfo = null;
}
/**
 * 获取当前检测到的 shell 信息（主要用于测试和调试）
 */
function getCurrentShellInfo() {
    return getShellInfo();
}
/**
 * 获取用于执行命令的 shell 路径和参数
 *
 * 不同平台使用不同的参数：
 * - Unix (bash/zsh): -l -i -c command (login + interactive)
 * - Windows cmd: chcp 65001 + /c command (设置 UTF-8 编码)
 * - Windows PowerShell: [Console]::OutputEncoding = UTF-8 + -Command command
 *
 * @param command 要执行的命令
 * @param options.forceDetachedService 是否强制以独立服务方式启动（用于 openclaw gateway 等）
 */
function getShellAndArgs(command, options) {
    const shellInfo = getShellInfo();
    const forceDetachedService = options?.forceDetachedService ?? false;
    if (shellInfo.isWindows) {
        if (shellInfo.type === 'powershell') {
            // PowerShell:
            // -NoProfile: 不加载 PowerShell profile（加快启动速度）
            // -NonInteractive: 非交互模式
            // -WindowStyle Hidden: 隐藏 PowerShell 窗口
            // -Command: 执行命令
            // 在命令前设置输出编码为 UTF-8，避免中文乱码
            let utf8Command = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
            // 对于需要启动独立服务的命令（如 openclaw gateway restart），
            // 使用 Start-Process 通过 powershell 执行命令，启动独立进程
            // 这样即使父 PowerShell 退出，服务进程也能继续运行
            if (forceDetachedService) {
                // 使用 powershell.exe 来执行命令，确保命令在正确的环境中运行
                // -WindowStyle Hidden: 隐藏 powershell 窗口
                // -Command: 执行的命令
                // 转义命令中的单引号
                const escapedCommand = command.replace(/'/g, "''");
                utf8Command = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile', '-WindowStyle', 'Hidden', '-Command', '${escapedCommand}' -WindowStyle Hidden; Write-Output 'OpenClaw gateway service command dispatched successfully'`;
                utils_1.logger.info(`[BashExecutor] Windows gateway service command detected, using Start-Process powershell for: ${command}`);
                // 仅对 openclaw gateway 命令使用 -WindowStyle Hidden
                return {
                    shell: shellInfo.path,
                    args: [
                        '-NoProfile',
                        '-NonInteractive',
                        '-WindowStyle',
                        'Hidden',
                        '-Command',
                        utf8Command,
                    ],
                };
            }
            // 普通命令：不使用 -WindowStyle Hidden，保持原有行为
            return {
                shell: shellInfo.path,
                args: ['-NoProfile', '-NonInteractive', '-Command', utf8Command],
            };
        }
        else {
            // cmd.exe:
            // chcp 65001: 设置控制台代码页为 UTF-8
            // /c: 执行命令后退出
            const utf8Command = `chcp 65001 >nul && ${command}`;
            return {
                shell: shellInfo.path,
                args: ['/c', utf8Command],
            };
        }
    }
    // Unix: 使用 login + interactive 确保加载用户配置文件
    return {
        shell: shellInfo.path,
        args: ['-l', '-i', '-c', command],
    };
}
/**
 * 终止进程（跨平台）
 *
 * Windows 和 Unix 的进程终止机制不同：
 * - Unix: 先发送 SIGTERM，超时后发送 SIGKILL
 * - Windows: 直接调用 kill()，Node.js 内部会使用 TerminateProcess
 */
function killProcessGracefully(childProcess, forceKillDelay = 5000) {
    if (process.platform === 'win32') {
        // Windows: 直接 kill，Node.js 会调用 TerminateProcess
        childProcess.kill();
    }
    else {
        // Unix: 先 SIGTERM，后 SIGKILL
        childProcess.kill('SIGTERM');
        setTimeout(() => {
            if (!childProcess.killed) {
                // eslint-disable-next-line no-console
                console.warn(`[BashExecutor] Forcing SIGKILL after SIGTERM timeout`);
                childProcess.kill('SIGKILL');
            }
        }, forceKillDelay);
    }
}
/**
 * 执行 Bash 命令
 */
/**
 * 检测命令是否包含 openclaw dashboard
 * 用于拦截并在 Electron 内部打开，而不是系统浏览器
 */
function containsOpenClawDashboard(command) {
    // 匹配 openclaw dashboard 命令（可能在管道或 && 链中）
    return /\bopenclaw\s+dashboard\b/.test(command);
}
/**
 * 检测命令是否是 openclaw gateway 启动/重启命令
 * 这类命令会启动后台服务，在 Windows 上需要特殊处理
 *
 * 匹配的命令：
 * - openclaw gateway start
 * - openclaw gateway restart
 * - openclaw gateway install (也会启动服务)
 */
function isOpenClawGatewayServiceCommand(command) {
    return /\bopenclaw\s+gateway\s+(start|restart|install)\b/.test(command);
}
/**
 * 从命令中移除 openclaw dashboard 部分
 * 保留其他命令（如 openclaw gateway restart）
 *
 * 只处理两种安全的情况：
 * 1. 命令末尾的 "连接符 openclaw dashboard"
 * 2. 单独的 "openclaw dashboard"
 *
 * 这样不会影响命令链的执行逻辑
 */
function removeOpenClawDashboard(command) {
    // 移除命令末尾的 "连接符 openclaw dashboard"
    // 支持 &&、||、; 三种连接符
    // 例如: "cmd && openclaw dashboard" → "cmd"
    // 例如: "cmd; openclaw dashboard" → "cmd"
    let result = command.replace(/\s*(?:&&|\|\||;)\s*openclaw\s+dashboard\s*$/, '');
    // 移除单独的 "openclaw dashboard"（整个命令就是它）
    result = result.replace(/^\s*openclaw\s+dashboard\s*$/, '');
    return result.trim();
}
async function executeBashCommand(params) {
    const startTime = Date.now();
    try {
        const { description, run_in_background: runInBackground = false, timeout = 120000, cwd, env = {}, } = params;
        let { command } = params;
        // cwd 是必需参数，不提供时返回错误
        if (!cwd) {
            return {
                success: false,
                error: 'cwd parameter is required. Please specify the working directory.',
                stdout: '',
                stderr: '',
                current_directory: '',
                duration: Date.now() - startTime,
            };
        }
        // 检测并拦截 openclaw dashboard 命令
        // 在 Electron 中，我们希望在内置的 WebContentsView 中打开，而不是系统浏览器
        let shouldReloadOpenClawView = false;
        if (containsOpenClawDashboard(command)) {
            shouldReloadOpenClawView = true;
            const originalCommand = command;
            command = removeOpenClawDashboard(command);
            utils_1.logger.info(`[BashExecutor] Intercepted openclaw dashboard, will reload WebContentsView. Original: "${originalCommand}", Modified: "${command}"`);
            // 如果移除后命令为空，直接返回成功并触发刷新
            if (!command) {
                // 动态导入避免循环依赖
                const { getOpenClawViewController } = await Promise.resolve().then(() => __importStar(require('../openclaw')));
                const controller = getOpenClawViewController();
                controller.reloadView();
                return {
                    success: true,
                    stdout: 'OpenClaw dashboard opened in Electron app.',
                    stderr: '',
                    current_directory: cwd,
                    duration: Date.now() - startTime,
                };
            }
        }
        const cmdPreview = command.substring(0, 100);
        const suffix = command.length > 100 ? '...' : '';
        // eslint-disable-next-line no-console
        utils_1.logger.info(`[BashExecutor] Running: ${cmdPreview}${suffix}, background: ${runInBackground}`);
        // 验证超时时间（最大 30 分钟）
        const actualTimeout = Math.min(timeout, 1800000);
        // 生成唯一 ID
        const bashId = `bash_${(0, uuid_1.v4)()}`;
        // 准备环境变量
        // Windows 下设置 UTF-8 编码环境变量，避免乱码
        const encodingEnv = process.platform === 'win32'
            ? {
                PYTHONIOENCODING: 'utf-8',
                PYTHONUTF8: '1',
                LANG: 'en_US.UTF-8',
                LC_ALL: 'en_US.UTF-8',
            }
            : {};
        const processEnv = { ...process.env, ...encodingEnv, ...env };
        // 检测是否是 openclaw gateway 服务命令（Windows 上需要特殊处理）
        const isGatewayServiceCmd = process.platform === 'win32' && isOpenClawGatewayServiceCommand(command);
        if (isGatewayServiceCmd) {
            utils_1.logger.info(`[BashExecutor] Detected openclaw gateway service command on Windows, using detached service mode`);
        }
        // 获取 shell 和参数
        // 注：工作目录通过 spawn 的 cwd 选项设置，这是安全的方式（避免命令注入）
        const { shell, args } = getShellAndArgs(command, {
            forceDetachedService: isGatewayServiceCmd,
        });
        // eslint-disable-next-line no-console
        utils_1.logger.info(`[BashExecutor] Using shell: ${shell} with args: ${args.slice(0, -1).join(' ')}`);
        // 根据运行模式配置 spawn 选项
        let spawnOptions;
        if (runInBackground) {
            // 后台模式：detached + stdin ignore
            spawnOptions = {
                cwd,
                env: processEnv,
                detached: true, // 创建独立进程组
                stdio: ['ignore', 'pipe', 'pipe'], // stdin忽略，stdout/stderr使用pipe
                // Windows 特定：使用 shell 选项可能导致问题，我们直接 spawn shell
                windowsHide: true, // Windows: 隐藏控制台窗口
            };
        }
        else {
            // 前台模式：正常 pipe
            spawnOptions = {
                cwd,
                env: processEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true,
            };
        }
        // 创建子进程
        const childProcess = (0, child_process_1.spawn)(shell, args, spawnOptions);
        // 存储输出
        const stdoutLines = [];
        const stderrLines = [];
        childProcess.stdout?.on('data', (data) => {
            const lines = data
                .toString('utf8')
                .split('\n')
                .filter((line) => line.length > 0);
            stdoutLines.push(...lines);
            // 后台模式：限制输出缓冲区大小，防止内存无限增长
            if (runInBackground && stdoutLines.length > MAX_BACKGROUND_OUTPUT_LINES) {
                const removeCount = stdoutLines.length - MAX_BACKGROUND_OUTPUT_LINES;
                stdoutLines.splice(0, removeCount);
                utils_1.logger.info(`[BashExecutor] Background process stdout buffer trimmed, removed ${removeCount} lines`);
            }
        });
        childProcess.stderr?.on('data', (data) => {
            const lines = data
                .toString('utf8')
                .split('\n')
                .filter((line) => line.length > 0);
            stderrLines.push(...lines);
            // 后台模式：限制输出缓冲区大小，防止内存无限增长
            if (runInBackground && stderrLines.length > MAX_BACKGROUND_OUTPUT_LINES) {
                const removeCount = stderrLines.length - MAX_BACKGROUND_OUTPUT_LINES;
                stderrLines.splice(0, removeCount);
                utils_1.logger.info(`[BashExecutor] Background process stderr buffer trimmed, removed ${removeCount} lines`);
            }
        });
        // 后台运行
        if (runInBackground) {
            const managedProcess = {
                id: bashId,
                command,
                description,
                process: childProcess,
                status: 'running',
                startTime: new Date(),
                cwd,
                stdout: stdoutLines,
                stderr: stderrLines,
                lastReadStdoutIndex: 0,
                lastReadStderrIndex: 0,
            };
            backgroundProcesses.set(bashId, managedProcess);
            // ✅ unref: 告诉 Node.js 不要等待这个后台进程
            childProcess.unref();
            childProcess.on('exit', (code) => {
                managedProcess.status = code === 0 ? 'completed' : 'failed';
                managedProcess.endTime = new Date();
                managedProcess.exitCode = code || undefined;
                utils_1.logger.info(`[BashExecutor] Background process ${bashId} exited with code ${code} after ${Date.now() - managedProcess.startTime.getTime()}ms`);
                cleanupOldProcesses();
            });
            return {
                success: true,
                stdout: '',
                stderr: '',
                current_directory: cwd,
                bash_id: bashId,
                duration: Date.now() - startTime,
                message: `Command started in background. Use bash_output(bash_id='${bashId}') to check output.`,
            };
        }
        // 前台运行：等待完成
        return new Promise((resolve) => {
            let timeoutHandle = null;
            let isResolved = false;
            // 统一的结果处理函数
            const finishWithResult = async (result) => {
                if (isResolved)
                    return;
                isResolved = true;
                // 清理所有定时器
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                // 如果需要刷新 OpenClaw View（命令中包含 openclaw dashboard）
                if (shouldReloadOpenClawView && result.success) {
                    try {
                        const { getOpenClawViewController } = await Promise.resolve().then(() => __importStar(require('../openclaw')));
                        const controller = getOpenClawViewController();
                        controller.reloadView();
                        // 在输出中添加提示
                        result.stdout = result.stdout
                            ? `${result.stdout}\nOpenClaw dashboard opened in Electron app.`
                            : 'OpenClaw dashboard opened in Electron app.';
                    }
                    catch (e) {
                        utils_1.logger.error(`[BashExecutor] Failed to reload OpenClaw view:,  ${String(e)}`);
                    }
                }
                resolve(result);
            };
            // 超时处理
            const handleTimeout = () => {
                utils_1.logger.info(`[BashExecutor] Command timeout, killing process...`);
                // 跨平台终止进程
                killProcessGracefully(childProcess);
                // 返回超时错误
                finishWithResult({
                    success: false,
                    error: `Command timed out after ${actualTimeout}ms`,
                    stdout: (0, token_1.truncateTextByTokens)(stdoutLines.join('\n'), token_1.MAX_TOKENS),
                    stderr: (0, token_1.truncateTextByTokens)(stderrLines.join('\n'), token_1.MAX_TOKENS),
                    current_directory: cwd,
                    duration: Date.now() - startTime,
                });
            };
            // 设置超时定时器
            if (actualTimeout > 0) {
                timeoutHandle = setTimeout(handleTimeout, actualTimeout);
            }
            // 进程正常退出
            childProcess.on('exit', (code) => {
                finishWithResult({
                    success: code === 0,
                    stdout: (0, token_1.truncateTextByTokens)(stdoutLines.join('\n'), token_1.MAX_TOKENS),
                    stderr: (0, token_1.truncateTextByTokens)(stderrLines.join('\n'), token_1.MAX_TOKENS),
                    exit_code: code || undefined,
                    current_directory: cwd,
                    duration: Date.now() - startTime,
                });
            });
            // 进程错误
            childProcess.on('error', (error) => {
                // 确保进程被杀死
                if (!childProcess.killed) {
                    killProcessGracefully(childProcess, 0);
                }
                finishWithResult({
                    success: false,
                    error: error.message,
                    stdout: (0, token_1.truncateTextByTokens)(stdoutLines.join('\n'), token_1.MAX_TOKENS),
                    stderr: (0, token_1.truncateTextByTokens)(stderrLines.join('\n'), token_1.MAX_TOKENS),
                    current_directory: cwd,
                    duration: Date.now() - startTime,
                });
            });
        });
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stdout: '',
            stderr: '',
            current_directory: params.cwd || '',
            duration: Date.now() - startTime,
        };
    }
}
/**
 * 获取后台命令输出
 */
async function getBashOutput(params) {
    const startTime = Date.now();
    try {
        const { bash_id: bashId, filter_str: filterStr } = params;
        // eslint-disable-next-line no-console
        console.log(`[BashExecutor] Getting output for: ${bashId}`);
        const managedProcess = backgroundProcesses.get(bashId);
        if (!managedProcess) {
            return {
                success: false,
                error: `Process with ID ${bashId} not found`,
                stdout: '',
                stderr: '',
                status: 'failed',
                duration: Date.now() - startTime,
            };
        }
        // 获取新输出（自上次读取以来）
        const newStdout = managedProcess.stdout.slice(managedProcess.lastReadStdoutIndex);
        const newStderr = managedProcess.stderr.slice(managedProcess.lastReadStderrIndex);
        // 应用过滤器（如果有）
        // 注意：过滤器只用于返回结果的筛选，不影响原始数据
        let filteredStdout = newStdout;
        let filteredStderr = newStderr;
        let filterApplied = false;
        if (filterStr) {
            try {
                const regex = new RegExp(filterStr);
                filteredStdout = newStdout.filter((line) => regex.test(line));
                filteredStderr = newStderr.filter((line) => regex.test(line));
                filterApplied = true;
            }
            catch {
                // 正则表达式无效，忽略过滤
            }
        }
        // 更新读取索引
        // 重要：只有在没有应用过滤器时才更新索引，
        // 如果应用了过滤器，被过滤的数据应该保留，以便后续无过滤请求可以读取
        if (!filterApplied) {
            managedProcess.lastReadStdoutIndex = managedProcess.stdout.length;
            managedProcess.lastReadStderrIndex = managedProcess.stderr.length;
        }
        utils_1.logger.info(`[BashExecutor] Get output: Filtered stdout: ${filteredStdout.length} lines, filtered stderr: ${filteredStderr.length} lines`);
        return {
            success: true,
            stdout: (0, token_1.truncateTextByTokens)(filteredStdout.join('\n'), token_1.MAX_TOKENS),
            stderr: (0, token_1.truncateTextByTokens)(filteredStderr.join('\n'), token_1.MAX_TOKENS),
            status: managedProcess.status,
            exit_code: managedProcess.exitCode,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        utils_1.logger.info(`[BashExecutor] Get output: error: ${error}`);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stdout: '',
            stderr: '',
            status: 'failed',
            duration: Date.now() - startTime,
        };
    }
}
/**
 * 终止后台 Shell
 */
async function killBashShell(params) {
    const startTime = Date.now();
    try {
        const { shell_id: shellId } = params;
        // eslint-disable-next-line no-console
        console.log(`[BashExecutor] Killing shell: ${shellId}`);
        const managedProcess = backgroundProcesses.get(shellId);
        if (!managedProcess) {
            // 幂等：如果进程不存在，仍返回成功
            return {
                success: true,
                message: `Process ${shellId} not found or already terminated`,
                duration: Date.now() - startTime,
            };
        }
        if (managedProcess.status === 'running') {
            // 跨平台终止进程
            killProcessGracefully(managedProcess.process);
            managedProcess.status = 'killed';
            managedProcess.endTime = new Date();
            return {
                success: true,
                message: `Process ${shellId} terminated`,
                duration: Date.now() - startTime,
            };
        }
        return {
            success: true,
            message: `Process ${shellId} already ${managedProcess.status}`,
            duration: Date.now() - startTime,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to kill process',
            duration: Date.now() - startTime,
        };
    }
}
