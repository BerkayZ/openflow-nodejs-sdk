/*
 * FileManager
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "./Logger";

export interface FileReference {
  id: string;
  originalPath: string;
  tempPath: string;
  filename: string;
  extension: string;
  size: number;
  mimeType?: string;
  created: Date;
}

export class FileManager {
  private static instance: FileManager;
  private tempDir: string;
  private files: Map<string, FileReference> = new Map();
  private logger: Logger;

  private constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), "of_tmp");
    this.logger = new Logger();
    this.ensureTempDir();
  }

  public static getInstance(tempDir?: string): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager(tempDir);
    }
    return FileManager.instance;
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.debug(`Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Register a file and copy it to temp directory
   */
  public registerFile(filePath: string): FileReference {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    const fileId = uuidv4();
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const tempPath = path.join(this.tempDir, `${fileId}_${filename}`);

    // Copy file to temp directory
    fs.copyFileSync(filePath, tempPath);

    const fileRef: FileReference = {
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
  public getFile(fileId: string): FileReference | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get file content as buffer
   */
  public getFileBuffer(fileId: string): Buffer {
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
  public getFileBase64(fileId: string): string {
    const buffer = this.getFileBuffer(fileId);
    return buffer.toString("base64");
  }

  /**
   * Get file data URL for images
   */
  public getFileDataUrl(fileId: string): string {
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
  public hasFile(fileId: string): boolean {
    return this.files.has(fileId);
  }

  /**
   * Remove file from registry and temp directory
   */
  public removeFile(fileId: string): void {
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
  public cleanup(): void {
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
  public getAllFiles(): FileReference[] {
    return Array.from(this.files.values());
  }

  /**
   * Get temp directory path
   */
  public getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Validate file type for variable
   */
  public validateFileVariable(value: any, variableId: string): void {
    if (typeof value !== "string") {
      throw new Error(
        `Variable '${variableId}' should be a file ID string, but got ${typeof value}`,
      );
    }

    if (!this.hasFile(value)) {
      throw new Error(
        `File ID '${value}' not found in registry for variable '${variableId}'`,
      );
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
  public isImage(fileId: string): boolean {
    const fileRef = this.getFile(fileId);
    if (!fileRef) return false;

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
  public isDocument(fileId: string): boolean {
    const fileRef = this.getFile(fileId);
    if (!fileRef) return false;

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
