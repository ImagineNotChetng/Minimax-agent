"use strict";
/**
 * Browser Stealth Module
 * 反爬虫/反检测模块
 *
 * 参考 puppeteer-extra-plugin-stealth 的实现
 * 用于绕过 Cloudflare、Akamai 等常见的反爬虫检测
 *
 * @see https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStealthScript = getStealthScript;
exports.getChromeUserAgent = getChromeUserAgent;
exports.applyStealthToWebContents = applyStealthToWebContents;
/**
 * 获取反检测注入脚本
 * 基于 puppeteer-extra-plugin-stealth 的核心 evasions
 */
function getStealthScript() {
    return `
(function() {
  'use strict';

  // ===== 1. chrome.app =====
  if (!window.chrome) {
    window.chrome = {};
  }
  if (!window.chrome.app) {
    window.chrome.app = {
      InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
      RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
      installState: function(cb) { if (cb) cb('not_installed'); },
      isInstalled: false,
      runningState: function() { return 'cannot_run'; }
    };
  }

  // ===== 2. chrome.csi =====
  if (!window.chrome.csi) {
    window.chrome.csi = function() {
      return {
        startE: Date.now(),
        onloadT: Date.now(),
        pageT: Math.random() * 1000,
        tran: 15
      };
    };
  }

  // ===== 3. chrome.loadTimes =====
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = function() {
      return {
        commitLoadTime: Date.now() / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: Date.now() / 1000,
        finishLoadTime: Date.now() / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: Date.now() / 1000,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: Date.now() / 1000 - 0.1,
        startLoadTime: Date.now() / 1000,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true
      };
    };
  }

  // ===== 4. chrome.runtime =====
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      OnInstalledReason: {
        CHROME_UPDATE: 'chrome_update',
        INSTALL: 'install',
        SHARED_MODULE_UPDATE: 'shared_module_update',
        UPDATE: 'update'
      },
      OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      PlatformArch: {
        ARM: 'arm',
        ARM64: 'arm64',
        MIPS: 'mips',
        MIPS64: 'mips64',
        X86_32: 'x86-32',
        X86_64: 'x86-64'
      },
      PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformOs: {
        ANDROID: 'android',
        CROS: 'cros',
        LINUX: 'linux',
        MAC: 'mac',
        OPENBSD: 'openbsd',
        WIN: 'win'
      },
      RequestUpdateCheckStatus: {
        NO_UPDATE: 'no_update',
        THROTTLED: 'throttled',
        UPDATE_AVAILABLE: 'update_available'
      },
      connect: function() { return { onDisconnect: { addListener: function() {} } }; },
      id: undefined,
      sendMessage: function() {}
    };
  }

  // ===== 5. 隐藏 navigator.webdriver =====
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });

  // ===== 6. 修复 navigator.plugins =====
  const makePluginArray = () => {
    const arr = [];
    const plugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
    ];
    plugins.forEach((p, i) => {
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name: { value: p.name, enumerable: true },
        filename: { value: p.filename, enumerable: true },
        description: { value: p.description, enumerable: true },
        length: { value: 0, enumerable: true }
      });
      arr.push(plugin);
    });
    arr.item = (index) => arr[index] || null;
    arr.namedItem = (name) => arr.find(p => p.name === name) || null;
    arr.refresh = () => {};
    Object.setPrototypeOf(arr, PluginArray.prototype);
    return arr;
  };

  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => makePluginArray(),
      configurable: true
    });
  } catch (e) {}

  // ===== 7. 修复 navigator.mimeTypes =====
  try {
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const arr = [];
        arr.item = (index) => arr[index] || null;
        arr.namedItem = (name) => arr.find(m => m.type === name) || null;
        Object.setPrototypeOf(arr, MimeTypeArray.prototype);
        return arr;
      },
      configurable: true
    });
  } catch (e) {}

  // ===== 8. 修复 navigator.languages =====
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    configurable: true
  });

  // ===== 9. 修复 navigator.platform =====
  // 保持与 User-Agent 一致
  Object.defineProperty(navigator, 'platform', {
    get: () => 'MacIntel',
    configurable: true
  });

  // ===== 10. 修复 navigator.hardwareConcurrency =====
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8,
    configurable: true
  });

  // ===== 11. 修复 navigator.deviceMemory =====
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8,
    configurable: true
  });

  // ===== 12. 修复 navigator.connection =====
  if (!navigator.connection) {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
        onchange: null
      }),
      configurable: true
    });
  }

  // ===== 13. 隐藏 iframe contentWindow =====
  try {
    const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: function() {
        const iframe = originalContentWindow.get.call(this);
        if (!iframe) return iframe;
        
        try {
          // 如果可以访问，也隐藏 iframe 中的 webdriver
          if (iframe.navigator) {
            Object.defineProperty(iframe.navigator, 'webdriver', {
              get: () => undefined,
              configurable: true
            });
          }
        } catch (e) {}
        
        return iframe;
      }
    });
  } catch (e) {}

  // ===== 14. 修复 permissions API =====
  if (navigator.permissions) {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, onchange: null });
      }
      return originalQuery.call(navigator.permissions, parameters);
    };
  }

  // ===== 15. 修复 window dimensions =====
  if (window.outerWidth === 0) {
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth + 16 });
  }
  if (window.outerHeight === 0) {
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 88 });
  }

  // ===== 16. 删除 Electron 特有属性 =====
  delete window.process;
  delete window.require;
  delete window.module;
  delete window.exports;
  delete window.__dirname;
  delete window.__filename;

  // ===== 17. 隐藏 Automation 标志 =====
  // 某些检测会查找 window.cdc_adoQpoasnfa76pfcZLmcfl_* 等属性
  const cdcProps = Object.keys(window).filter(k => k.match(/^cdc_|^__webdriver/));
  cdcProps.forEach(prop => {
    try { delete window[prop]; } catch (e) {}
  });

  // ===== 18. 修复 Function.prototype.toString =====
  // 防止检测我们覆写的函数
  const nativeToStringFunctionString = Error.toString().replace(/Error/g, 'toString');
  const nativeCodeString = 'function toString() { [native code] }';
  
  const originalToString = Function.prototype.toString;
  const customToString = function() {
    if (this === customToString) {
      return nativeCodeString;
    }
    // 检查是否是我们覆写的函数
    if (typeof this === 'function') {
      const fnStr = originalToString.call(this);
      if (fnStr.includes('[native code]')) {
        return fnStr;
      }
    }
    return originalToString.call(this);
  };
  
  Object.defineProperty(Function.prototype, 'toString', {
    value: customToString,
    writable: true,
    configurable: true
  });

})();
`;
}
/**
 * 获取正常的 Chrome User-Agent
 * @param chromeVersion Chrome 版本号
 */
function getChromeUserAgent(chromeVersion) {
    // 根据平台返回对应的 User-Agent
    const platform = process.platform;
    if (platform === 'darwin') {
        return (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ` +
            `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);
    }
    else if (platform === 'win32') {
        return (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) ` +
            `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);
    }
    else {
        return (`Mozilla/5.0 (X11; Linux x86_64) ` +
            `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);
    }
}
/**
 * 应用 Stealth 配置到 WebContents
 * @param webContents Electron WebContents 实例
 */
function applyStealthToWebContents(webContents) {
    // 1. 设置 User-Agent
    const chromeVersion = process.versions.chrome;
    const userAgent = getChromeUserAgent(chromeVersion);
    webContents.setUserAgent(userAgent);
    // 2. 在每个页面加载时注入反检测脚本
    webContents.on('dom-ready', () => {
        const script = getStealthScript();
        webContents.executeJavaScript(script).catch(() => {
            // 忽略注入失败
        });
    });
    // 3. 处理子 frame
    webContents.on('did-frame-finish-load', (event, isMainFrame) => {
        if (!isMainFrame) {
            const script = getStealthScript();
            webContents.executeJavaScript(script).catch(() => {
                // 忽略注入失败
            });
        }
    });
}
