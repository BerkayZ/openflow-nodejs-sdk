"use strict";
/*
 * FileManager
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
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
exports.FileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const Logger_1 = require("./Logger");
class FileManager {
    constructor(tempDir) {
        this.files = new Map();
        this.tempDir = tempDir || path.join(process.cwd(), "of_tmp");
        this.logger = new Logger_1.Logger();
        this.ensureTempDir();
    }
    static getInstance(tempDir) {
        if (!FileManager.instance) {
            FileManager.instance = new FileManager(tempDir);
        }
        return FileManager.instance;
    }
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
            this.logger.debug(`Created temp directory: ${this.tempDir}`);
        }
    }
    /**
     * Register a file and copy it to temp directory
     */
    registerFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        const fileId = (0, uuid_1.v4)();
        const filename = path.basename(filePath);
        const extension = path.extname(filePath).toLowerCase();
        const tempPath = path.join(this.tempDir, `${fileId}_${filename}`);
        // Copy file to temp directory
        fs.copyFileSync(filePath, tempPath);
        const fileRef = {
            id: fileId,
            originalPath: filePath,
            tempPath,
            filename,
            extension,
            size: stats.size,
            mimeType: this.getMimeType(extension),
            created: new Date(),
        };
        this.files.set(fileId, fileRef);
        this.logger.debug(`Registered file: ${fileId} -> ${tempPath}`);
        return fileRef;
    }
    /**
     * Get file reference by ID
     */
    getFile(fileId) {
        return this.files.get(fileId);
    }
    /**
     * Get file content as buffer
     */
    getFileBuffer(fileId) {
        const fileRef = this.getFile(fileId);
        if (!fileRef) {
            throw new Error(`File not found: ${fileId}`);
        }
        if (!fs.existsSync(fileRef.tempPath)) {
            throw new Error(`Temp file not found: ${fileRef.tempPath}`);
        }
        return fs.readFileSync(fileRef.tempPath);
    }
    /**
     * Get file content as base64
     */
    getFileBase64(fileId) {
        const buffer = this.getFileBuffer(fileId);
        return buffer.toString("base64");
    }
    /**
     * Get file data URL for images
     */
    getFileDataUrl(fileId) {
        const fileRef = this.getFile(fileId);
        if (!fileRef) {
            throw new Error(`File not found: ${fileId}`);
        }
        const base64 = this.getFileBase64(fileId);
        const mimeType = fileRef.mimeType || "application/octet-stream";
        return `data:${mimeType};base64,${base64}`;
    }
    /**
     * Check if file ID exists
     */
    hasFile(fileId) {
        return this.files.has(fileId);
    }
    /**
     * Remove file from registry and temp directory
     */
    removeFile(fileId) {
        const fileRef = this.getFile(fileId);
        if (fileRef) {
            if (fs.existsSync(fileRef.tempPath)) {
                fs.unlinkSync(fileRef.tempPath);
            }
            this.files.delete(fileId);
            this.logger.debug(`Removed file: ${fileId}`);
        }
    }
    /**
     * Clean up all files
     */
    cleanup() {
        for (const [fileId, fileRef] of this.files) {
            if (fs.existsSync(fileRef.tempPath)) {
                fs.unlinkSync(fileRef.tempPath);
            }
        }
        this.files.clear();
        this.logger.debug("Cleaned up all files");
    }
    /**
     * Get all file references
     */
    getAllFiles() {
        return Array.from(this.files.values());
    }
    /**
     * Get temp directory path
     */
    getTempDir() {
        return this.tempDir;
    }
    /**
     * Validate file type for variable
     */
    validateFileVariable(value, variableId) {
        if (typeof value !== "string") {
            throw new Error(`Variable '${variableId}' should be a file ID string, but got ${typeof value}`);
        }
        if (!this.hasFile(value)) {
            throw new Error(`File ID '${value}' not found in registry for variable '${variableId}'`);
        }
    }
    getMimeType(extension) {
        const mimeTypes = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".html": "text/html",
            ".csv": "text/csv",
            ".json": "application/json",
            ".xml": "application/xml",
        };
        return mimeTypes[extension] || "application/octet-stream";
    }
    /**
     * Check if file is an image
     */
    isImage(fileId) {
        const fileRef = this.getFile(fileId);
        if (!fileRef)
            return false;
        const imageMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
        ];
        return imageMimeTypes.includes(fileRef.mimeType || "");
    }
    /**
     * Check if file is a document
     */
    isDocument(fileId) {
        const fileRef = this.getFile(fileId);
        if (!fileRef)
            return false;
        const documentMimeTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
            "text/html",
        ];
        return documentMimeTypes.includes(fileRef.mimeType || "");
    }
}
exports.FileManager = FileManager;
