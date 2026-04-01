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
exports.executeRipgrep = executeRipgrep;
exports.getRipgrepVersion = getRipgrepVersion;
exports.isRipgrepAvailable = isRipgrepAvailable;
/**
 * Ripgrep 模块
 * 提供高性能的文件内容搜索功能，基于 @vscode/ripgrep
 */
const cp = __importStar(require("child_process"));
const rg = __importStar(require("@opensumi/ripgrep"));
const token_1 = require("../../utils/token");
/**
 * 解析 ripgrep JSON 输出
 */
function parseRipgrepOutput(output, outputMode) {
    const lines = output
        .trim()
        .split('\n')
        .filter((line) => line.trim());
    const matches = [];
    const filesSet = new Set();
    const countsMap = new Map();
    // 用于存储上下文行
    const contextMap = new Map();
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const json = JSON.parse(line);
            // 处理匹配行
            if (json.type === 'match' && json.data) {
                const data = json.data;
                const filePath = data.path?.text || '';
                const lineNumber = data.line_number || 0;
                const lineText = data.lines?.text || '';
                const firstSubmatch = data.submatches?.[0];
                if (filePath) {
                    filesSet.add(filePath);
                    // 更新计数
                    countsMap.set(filePath, (countsMap.get(filePath) || 0) + 1);
                    // content 模式：收集详细匹配信息
                    if (outputMode === 'content') {
                        const match = {
                            file: filePath,
                            line: lineNumber,
                            column: firstSubmatch?.start || 0,
                            content: lineText.replace(/\n$/, ''), // 移除末尾换行
                        };
                        // 如果有上下文信息，添加到 match
                        const contextKey = `${filePath}:${lineNumber}`;
                        const context = contextMap.get(contextKey);
                        if (context) {
                            if (context.before.length > 0) {
                                match.context_before = context.before;
                            }
                            if (context.after.length > 0) {
                                match.context_after = context.after;
                            }
                        }
                        matches.push(match);
                    }
                }
            }
            // 处理上下文行（如果启用了 -A/-B/-C）
            if (json.type === 'context' && json.data && outputMode === 'content') {
                const filePath = json.data.path?.text || '';
                const lineNumber = json.data.line_number || 0;
                // 这里需要根据行号判断是 before 还是 after
                // 简化处理：ripgrep 会按顺序输出，可以根据实际需求优化
                const contextKey = `${filePath}:${lineNumber}`;
                if (!contextMap.has(contextKey)) {
                    contextMap.set(contextKey, { before: [], after: [] });
                }
            }
        }
        catch (e) {
            // 忽略无法解析的行（可能是错误信息或其他非 JSON 输出）
            console.warn('[Ripgrep] Failed to parse line:', line, e);
        }
    }
    return {
        matches: outputMode === 'content' ? matches : undefined,
        files: outputMode === 'files_with_matches' ? Array.from(filesSet) : undefined,
        counts: outputMode === 'count'
            ? Array.from(countsMap.entries()).map(([file, count]) => ({ file, count }))
            : undefined,
        total_matches: matches.length || filesSet.size || 0,
    };
}
/**
 * 执行 ripgrep 搜索
 */
async function executeRipgrep(params) {
    const startTime = Date.now();
    try {
        const { pattern, path: searchPath = process.cwd(), output_mode = 'files_with_matches', glob, type, i: ignoreCase, n: showLineNumbers, A: linesAfter, B: linesBefore, C: linesContext, multiline, head_limit, } = params;
        console.log(`[Ripgrep] Searching for pattern: "${pattern}" in: ${searchPath}`);
        // 构建 ripgrep 参数
        const args = [];
        // 使用 JSON 输出便于解析
        args.push('--json');
        // 基本参数：pattern 必须在前面
        args.push(pattern);
        // 输出模式
        if (output_mode === 'files_with_matches') {
            args.push('--files-with-matches');
        }
        else if (output_mode === 'count') {
            args.push('--count');
        }
        // content 模式不需要特殊参数，默认就是输出内容
        // 大小写
        if (ignoreCase) {
            args.push('-i');
        }
        // 行号（在 content 模式下默认会有，-n 主要影响非 JSON 输出）
        if (showLineNumbers && output_mode === 'content') {
            args.push('-n');
        }
        // 上下文行
        if (linesAfter && linesAfter > 0) {
            args.push('-A', String(linesAfter));
        }
        if (linesBefore && linesBefore > 0) {
            args.push('-B', String(linesBefore));
        }
        if (linesContext && linesContext > 0) {
            args.push('-C', String(linesContext));
        }
        // 多行模式
        if (multiline) {
            args.push('-U', '--multiline-dotall');
        }
        // 限制结果数量
        if (head_limit && head_limit > 0) {
            args.push('-m', String(head_limit));
        }
        // Glob 过滤
        if (glob) {
            args.push('--glob', glob);
        }
        // 文件类型过滤
        if (type) {
            args.push('--type', type);
        }
        // 其他有用的默认参数
        args.push('--no-heading'); // 不显示文件名标题
        args.push('--no-messages'); // 不显示错误消息（如权限拒绝）
        // 搜索路径必须在最后添加
        if (searchPath) {
            args.push(searchPath);
        }
        console.log(`[Ripgrep] Command: ${rg.rgPath} ${args.join(' ')}`);
        // 执行 ripgrep
        return new Promise((resolve) => {
            const rgProcess = cp.spawn(rg.rgPath, args, {
                // 不设置 cwd，让 ripgrep 使用绝对路径
                env: { ...process.env },
            });
            let stdout = '';
            let stderr = '';
            rgProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            rgProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            rgProcess.on('close', (code) => {
                const duration = Date.now() - startTime;
                console.log(`[Ripgrep] Process exited with code ${code}, duration: ${duration}ms`);
                // ripgrep 退出码：
                // 0 = 找到匹配
                // 1 = 没找到匹配（这不是错误）
                // 2 = 执行错误
                if (code === 2) {
                    const errorMsg = stderr || 'Ripgrep execution failed';
                    console.error(`[Ripgrep] Error:`, errorMsg);
                    resolve({
                        success: false,
                        error: errorMsg,
                        total_matches: 0,
                        duration,
                    });
                    return;
                }
                // code 为 0 或 1 都是正常情况
                try {
                    const result = parseRipgrepOutput(stdout, output_mode);
                    console.log(`[Ripgrep] Found ${result.total_matches} matches in ${duration}ms`);
                    // 应用 token 限制截断
                    const truncatedResult = (0, token_1.truncateGrepResult)(result, Math.floor(token_1.MAX_TOKENS * 0.7));
                    resolve({
                        success: true,
                        ...truncatedResult,
                        duration,
                    });
                }
                catch (error) {
                    console.error(`[Ripgrep] Parse error:`, error);
                    resolve({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to parse results',
                        total_matches: 0,
                        duration,
                    });
                }
            });
            rgProcess.on('error', (error) => {
                const duration = Date.now() - startTime;
                console.error(`[Ripgrep] Spawn error:`, error);
                resolve({
                    success: false,
                    error: `Failed to spawn ripgrep: ${error.message}`,
                    total_matches: 0,
                    duration,
                });
            });
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Ripgrep] Unexpected error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            total_matches: 0,
            duration,
        };
    }
}
/**
 * 获取 ripgrep 版本信息
 */
async function getRipgrepVersion() {
    return new Promise((resolve, reject) => {
        const rgProcess = cp.spawn(rg.rgPath, ['--version']);
        let stdout = '';
        rgProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        rgProcess.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            }
            else {
                reject(new Error('Failed to get ripgrep version'));
            }
        });
        rgProcess.on('error', (error) => {
            reject(error);
        });
    });
}
/**
 * 检查 ripgrep 是否可用
 */
function isRipgrepAvailable() {
    try {
        return typeof rg.rgPath === 'string' && rg.rgPath.length > 0;
    }
    catch {
        return false;
    }
}
