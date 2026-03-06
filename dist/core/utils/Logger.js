"use strict";
/*
 * Logger
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(logLevel = "info") {
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        // ANSI color codes
        this.colors = {
            reset: "\x1b[0m",
            bright: "\x1b[1m",
            dim: "\x1b[2m",
            red: "\x1b[31m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
            gray: "\x1b[90m",
        };
        // Level color mappings
        this.levelColors = {
            debug: this.colors.gray,
            info: this.colors.blue,
            warn: this.colors.yellow,
            error: this.colors.red,
        };
        this.logLevel = logLevel;
    }
    shouldLog(level) {
        const currentLevel = this.levels[this.logLevel] || 1;
        const messageLevel = this.levels[level] || 1;
        return messageLevel >= currentLevel;
    }
    colorize(text, color) {
        if (!process.stdout.isTTY) {
            return text;
        }
        return `${color}${text}${this.colors.reset}`;
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const levelColor = this.levelColors[level];
        const coloredLevel = this.colorize(`[${level.toUpperCase()}]`, levelColor);
        const coloredTimestamp = this.colorize(`[${timestamp}]`, this.colors.gray);
        const baseMessage = `${coloredTimestamp} ${coloredLevel} ${message}`;
        if (data) {
            const formattedData = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
            const coloredData = this.colorize(formattedData, this.colors.cyan);
            return `${baseMessage}\n${coloredData}`;
        }
        return baseMessage;
    }
    debug(message, data) {
        if (this.shouldLog("debug")) {
            console.debug(this.formatMessage("debug", message, data));
        }
    }
    info(message, data) {
        if (this.shouldLog("info")) {
            console.info(this.formatMessage("info", message, data));
        }
    }
    warn(message, data) {
        if (this.shouldLog("warn")) {
            console.warn(this.formatMessage("warn", message, data));
        }
    }
    error(message, error) {
        if (this.shouldLog("error")) {
            if (error instanceof Error) {
                console.error(this.formatMessage("error", `${message}: ${error.message}`));
                if (error.stack) {
                    const coloredStack = this.colorize(error.stack, this.colors.red);
                    console.error(coloredStack);
                }
            }
            else {
                console.error(this.formatMessage("error", message, error));
            }
        }
    }
    setLevel(level) {
        this.logLevel = level;
    }
}
exports.Logger = Logger;
