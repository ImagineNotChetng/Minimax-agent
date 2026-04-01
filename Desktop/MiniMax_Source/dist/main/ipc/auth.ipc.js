"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthIPC = setupAuthIPC;
/**
 * Authentication IPC Handler
 * Uses MiniMax API Key for authentication instead of Google OAuth
 */
const electron_1 = require("electron");
const storage_ipc_1 = require("./storage.ipc");
const windows_1 = require("../windows");
const tabs_1 = require("../modules/tabs");
const constants_1 = require("../config/constants");
const AUTH_API_KEY_LOGIN_CHANNEL = constants_1.IPC_CHANNELS.AUTH_API_KEY_LOGIN || 'auth:api-key-login';
const AUTH_GET_API_KEY_MASKED_CHANNEL = constants_1.IPC_CHANNELS.AUTH_GET_API_KEY_MASKED || 'auth:get-api-key-masked';

// MiniMax API endpoint for validation
const MINIMAX_API_BASE = "https://api.minimax.chat";

/**
 * Validate MiniMax API Key by making a test request
 */
async function validateApiKey(apiKey) {
    try {
        const response = await fetch(`${MINIMAX_API_BASE}/v1/api_key/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({})
        });
        return response.ok;
    } catch (error) {
        console.error('[Auth] API Key validation error:', error);
        return false;
    }
}

/**
 * Setup authentication IPC handlers
 */
function setupAuthIPC(getMainWindow) {
    // API Key authentication
    electron_1.ipcMain.handle(AUTH_API_KEY_LOGIN_CHANNEL, async (_, apiKey) => {
        try {
            if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
                return { success: false, error: 'API Key is required' };
            }

            apiKey = apiKey.trim();

            // Store the API key
            (0, storage_ipc_1.setApiKey)(apiKey);

            // Store a simple user object indicating logged in state
            (0, storage_ipc_1.setUserInfo)({
                loggedIn: true,
                loginMethod: 'api_key',
                loginTime: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            console.error('[Auth] API Key login error:', error);
            return { success: false, error: String(error) };
        }
    });

    // Logout
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTH_LOGOUT, async () => {
        try {
            // Clear stored data
            (0, storage_ipc_1.clearApiKey)();
            (0, storage_ipc_1.clearUserInfo)();
            (0, storage_ipc_1.clearTokens)();

            // Notify active tab
            const controller = (0, tabs_1.getTabController)();
            const activeWc = controller.getActiveWebContents();
            if (activeWc && !activeWc.isDestroyed()) {
                activeWc.send(constants_1.IPC_CHANNELS.AUTH_LOGGED_OUT);
            }

            // Switch to login window
            await windows_1.windowManager.switchToLoginWindow();
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    });

    // Check login status
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTH_CHECK_STATUS, () => {
        const apiKey = (0, storage_ipc_1.getApiKey)();
        const user = (0, storage_ipc_1.getUserInfo)();
        const hasValidApiKey = !!apiKey;
        return {
            isLoggedIn: hasValidApiKey,
            user: hasValidApiKey ? user : undefined,
        };
    });

    // Navigate to login window
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTH_NAVIGATE_TO_LOGIN, async (_, source) => {
        try {
            console.log(`[Auth] navigateToLogin triggered, source: ${source || 'unknown'}`);
            await windows_1.windowManager.switchToLoginWindow();
            return { success: true };
        } catch (error) {
            console.error(`[Auth] navigateToLogin failed, source: ${source || 'unknown'}`, error);
            return { success: false, error: String(error) };
        }
    });

    // Login complete - switch to main window
    electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTH_LOGIN_COMPLETE, async (_, user) => {
        try {
            // Store user info if provided
            if (user) {
                (0, storage_ipc_1.setUserInfo)(user);
                // Wait for data to be saved
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
            await windows_1.windowManager.switchToMainWindow();
            return { success: true };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    });

    // Get stored API Key (for display purposes - mask most characters)
    electron_1.ipcMain.handle(AUTH_GET_API_KEY_MASKED_CHANNEL, () => {
        const apiKey = (0, storage_ipc_1.getApiKey)();
        if (!apiKey) return null;
        // Return masked version: first 4 and last 4 characters
        if (apiKey.length <= 8) {
            return apiKey.substring(0, 2) + '***' + apiKey.substring(apiKey.length - 2);
        }
        return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
    });
}
