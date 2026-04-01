"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContentFromWebsites = extractContentFromWebsites;
/**
 * Website Module
 * 处理网站内容提取相关功能
 */
const turndown_1 = __importDefault(require("turndown"));
// 初始化 Turndown 服务，用于将 HTML 转换为 Markdown
const turndownService = new turndown_1.default({
    headingStyle: 'atx', // 使用 # 风格的标题
    codeBlockStyle: 'fenced', // 使用 ``` 风格的代码块
    bulletListMarker: '-', // 使用 - 作为无序列表标记
    emDelimiter: '_', // 使用 _ 表示斜体
    strongDelimiter: '**', // 使用 ** 表示粗体
    linkStyle: 'inlined', // 使用内联链接风格 [text](url)
    linkReferenceStyle: 'full', // 链接引用风格
});
// 添加自定义规则：移除脚本和样式标签
turndownService.addRule('removeScriptsAndStyles', {
    filter: ['script', 'style', 'noscript'],
    replacement: () => '',
});
// 添加自定义规则：移除注释
turndownService.addRule('removeComments', {
    // @ts-ignore
    filter: (node) => node.nodeType === 8, // Comment node
    replacement: () => '',
});
// 添加自定义规则：保留表格
turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
/**
 * 从多个网站并发提取内容
 * 提取的内容将以 JSON 格式返回
 *
 * 安全检查：
 * - 所有提取的内容都将进行安全合规检查
 * - 如果内容未通过安全检查并返回 "safety_check_failed" 错误，不要重试或使用其他方法
 * - 安全检查失败是最终结果 - 放弃该提取任务并继续处理其他任务
 */
async function extractContentFromWebsites(params) {
    const startTime = Date.now();
    try {
        const { tasks, mode = 'precise' } = params;
        console.log(`[WebsiteModule] Extracting content from ${tasks.length} websites, mode: ${mode}`);
        // 验证任务数量
        if (tasks.length === 0) {
            return {
                success: false,
                error: 'No tasks provided.',
                results: {},
                failed_urls: [],
                duration: Date.now() - startTime,
            };
        }
        if (tasks.length > 10) {
            return {
                success: false,
                error: `Maximum 10 tasks per call. Got ${tasks.length} tasks.`,
                results: {},
                failed_urls: [],
                duration: Date.now() - startTime,
            };
        }
        // 验证所有任务的 URL
        for (const task of tasks) {
            if (!task.url || !task.url.startsWith('https://')) {
                return {
                    success: false,
                    error: `Invalid URL: ${task.url}. URL must start with https://`,
                    results: {},
                    failed_urls: [task.url],
                    duration: Date.now() - startTime,
                };
            }
        }
        // TODO: 实现实际的内容提取逻辑
        // 这里需要集成浏览器自动化工具（如 Puppeteer 或使用现有的 browser controller）
        // 并行处理多个任务，最大并发数可配置
        const displayResults = {};
        const llmModelResults = {};
        const failedUrls = [];
        const successUrls = [];
        let isError = true; // 默认为错误状态，除非至少有一个成功
        // 示例实现：串行处理每个任务
        for (const task of tasks) {
            try {
                console.log(`[WebsiteModule] Extracting: ${task.url}`);
                // TODO: 调用实际的提取逻辑
                // const content = await extractSingleWebsite(task.url, task.prompt, mode);
                const content = await extractSingleWebsite(task.url, task.prompt, mode);
                if (content) {
                    displayResults[task.url] = content;
                    llmModelResults[task.url] = { content };
                    successUrls.push(task.url);
                    isError = false; // 至少有一个成功
                }
                else {
                    displayResults[task.url] = 'Error: Failed to extract content';
                    failedUrls.push(task.url);
                }
            }
            catch (error) {
                console.error(`[WebsiteModule] Error extracting ${task.url}:`, error);
                displayResults[task.url] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
                failedUrls.push(task.url);
            }
        }
        // 构建响应数据
        const responseData = {
            success: !isError,
            results: llmModelResults,
            failed_urls: failedUrls,
            display_data: displayResults,
            duration: Date.now() - startTime,
        };
        // 如果有失败的 URL，添加提示信息
        if (failedUrls.length > 0) {
            responseData.tips =
                'For these URLs where content extraction failed, if the content can be dynamically extracted via a browser, you may try using the tool `interact_with_website` to extract the content.';
        }
        console.log(`[WebsiteModule] Extraction completed: ${successUrls.length} succeeded, ${failedUrls.length} failed, duration: ${responseData.duration}ms`);
        return responseData;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[WebsiteModule] Unexpected error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results: {},
            failed_urls: params.tasks.map((t) => t.url),
            duration,
        };
    }
}
/**
 * 提取单个网站的内容
 * 使用 HTTP GET 获取 HTML，然后转换为 Markdown
 */
async function extractSingleWebsite(url, _prompt, _mode) {
    // 实际实现：
    // 1. 使用 HTTP GET 获取 HTML 内容
    // 2. 将 HTML 转换为 Markdown
    // 3. TODO: 根据 prompt 进一步提取特定内容（可能需要 LLM 辅助）
    // 4. 对于 "fast" 模式，使用简单的 HTTP GET + HTML 解析
    // 5. 对于 "precise" 模式，使用浏览器渲染 + JavaScript 执行（待实现）
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol;
            // 仅允许 http/https
            if (protocol !== 'http:' && protocol !== 'https:') {
                console.warn(`[WebsiteModule] Unsupported protocol: ${protocol}`);
                resolve(null);
                return;
            }
            // 动态选择协议模块
            const httpOrHttps = protocol === 'http:' ? require('http') : require('https');
            console.log(`[WebsiteModule] Fetching HTML from: ${url}`);
            httpOrHttps
                .get(url, (res) => {
                // 检查响应状态码
                if (res.statusCode !== 200) {
                    console.warn(`[WebsiteModule] HTTP error: ${res.statusCode} for ${url}`);
                    resolve(null);
                    return;
                }
                let html = '';
                res.on('data', (chunk) => {
                    html += chunk.toString();
                });
                res.on('end', () => {
                    try {
                        console.log(`[WebsiteModule] Converting HTML to Markdown for: ${url}`);
                        // 将 HTML 转换为 Markdown
                        let markdown = turndownService.turndown(html);
                        // 清理和优化 Markdown
                        markdown = cleanMarkdown(markdown);
                        // TODO: 根据 prompt 进一步提取特定内容
                        // 这里可以使用 LLM 或者正则表达式来提取 prompt 指定的内容
                        console.log(`[WebsiteModule] Successfully converted to Markdown (${markdown.length} chars) for: ${url}`);
                        resolve(markdown);
                    }
                    catch (conversionError) {
                        console.error(`[WebsiteModule] Error converting HTML to Markdown:`, conversionError);
                        resolve(null);
                    }
                });
            })
                .on('error', (error) => {
                console.error(`[WebsiteModule] HTTP request error:`, error);
                resolve(null);
            });
        }
        catch (e) {
            console.error(`[WebsiteModule] URL parsing error:`, e);
            resolve(null);
        }
    });
}
/**
 * 清理和优化 Markdown 内容
 */
function cleanMarkdown(markdown) {
    return (markdown
        // 移除连续的空行（超过2个）
        .replace(/\n{3,}/g, '\n\n')
        // 移除行首尾空格
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        // 移除文档首尾空白
        .trim());
}
