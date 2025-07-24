/*
 * Logger
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

export class Logger {
  private logLevel: string;
  private levels = { debug: 0, info: 1, warn: 2, error: 3 };

  // ANSI color codes
  private readonly colors = {
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
  private readonly levelColors = {
    debug: this.colors.gray,
    info: this.colors.blue,
    warn: this.colors.yellow,
    error: this.colors.red,
  };

  constructor(logLevel: string = "info") {
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const currentLevel =
      this.levels[this.logLevel as keyof typeof this.levels] || 1;
    const messageLevel = this.levels[level as keyof typeof this.levels] || 1;
    return messageLevel >= currentLevel;
  }

  private colorize(text: string, color: string): string {
    if (!process.stdout.isTTY) {
      return text;
    }
    return `${color}${text}${this.colors.reset}`;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelColor = this.levelColors[level as keyof typeof this.levelColors];

    const coloredLevel = this.colorize(`[${level.toUpperCase()}]`, levelColor);
    const coloredTimestamp = this.colorize(`[${timestamp}]`, this.colors.gray);

    const baseMessage = `${coloredTimestamp} ${coloredLevel} ${message}`;

    if (data) {
      const formattedData =
        typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
      const coloredData = this.colorize(formattedData, this.colors.cyan);
      return `${baseMessage}\n${coloredData}`;
    }

    return baseMessage;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog("error")) {
      if (error instanceof Error) {
        console.error(
          this.formatMessage("error", `${message}: ${error.message}`),
        );
        if (error.stack) {
          const coloredStack = this.colorize(error.stack, this.colors.red);
          console.error(coloredStack);
        }
      } else {
        console.error(this.formatMessage("error", message, error));
      }
    }
  }

  setLevel(level: string): void {
    this.logLevel = level;
  }
}
