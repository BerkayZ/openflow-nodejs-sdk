"use strict";
/*
 * PdfProcessor
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfProcessor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileManager_1 = require("./FileManager");
const Logger_1 = require("./Logger");
const sharp_1 = __importDefault(require("sharp"));
const pdf2image = require("pdf2image");
class PdfProcessor {
    constructor() {
        this.logger = new Logger_1.Logger();
        this.fileManager = FileManager_1.FileManager.getInstance();
    }
    processPdf(pdfPath_1) {
        return __awaiter(this, arguments, void 0, function* (pdfPath, options = {}) {
            this.logger.debug(`Processing PDF: ${pdfPath}`);
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`PDF file not found: ${pdfPath}`);
            }
            const { imageFormat = "jpg", imageQuality = "high", dpi = 300, outputDir = this.fileManager.getTempDir(), maxImages = 20, } = options;
            const numericQuality = this.convertQualityToNumber(imageQuality);
            const outputDirPath = path.join(outputDir, `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            if (!fs.existsSync(outputDirPath)) {
                fs.mkdirSync(outputDirPath, { recursive: true });
            }
            try {
                const imagePaths = yield this.convertPdfToImages(pdfPath, outputDirPath, {
                    imageFormat,
                    imageQuality: numericQuality,
                    dpi,
                    maxImages,
                });
                const pages = [];
                const outputFiles = [];
                for (let i = 0; i < imagePaths.length; i++) {
                    const imagePath = imagePaths[i];
                    const dimensions = yield this.getImageDimensions(imagePath);
                    const pageResult = {
                        pageNumber: i + 1,
                        imagePath,
                        width: dimensions.width,
                        height: dimensions.height,
                    };
                    pages.push(pageResult);
                    outputFiles.push(imagePath);
                    this.logger.debug(`Processed page ${i + 1}: ${imagePath}`);
                }
                const processorResult = {
                    totalPages: pages.length,
                    pages,
                    outputFiles,
                };
                this.logger.debug(`PDF processing completed. Total pages: ${processorResult.totalPages}`);
                return processorResult;
            }
            catch (error) {
                this.logger.error(`Error processing PDF: ${error}`);
                if (fs.existsSync(outputDirPath)) {
                    try {
                        fs.rmSync(outputDirPath, { recursive: true, force: true });
                    }
                    catch (cleanupError) {
                        this.logger.warn(`Failed to cleanup output directory: ${cleanupError}`);
                    }
                }
                throw new Error(`PDF processing failed: ${error}`);
            }
        });
    }
    convertQualityToNumber(quality) {
        switch (quality) {
            case "low":
                return 50;
            case "medium":
                return 75;
            case "high":
                return 85;
            default:
                return 85;
        }
    }
    convertPdfToImages(pdfPath, outputDir, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                density: config.dpi,
                outputType: config.imageFormat === "jpg" ? "jpg" : config.imageFormat,
                quality: config.imageQuality,
                outputFormat: path.join(outputDir, "page_%d"),
                pages: config.maxImages < Infinity ? `1-${config.maxImages}` : "*",
            };
            if (config.imageFormat === "webp") {
                options.outputType = "png";
            }
            const pdfImages = yield pdf2image.convertPDF(pdfPath, options);
            const limitedPdfImages = pdfImages.slice(0, config.maxImages);
            const imagePaths = [];
            for (let i = 0; i < limitedPdfImages.length; i++) {
                const pageInfo = limitedPdfImages[i];
                const pageNum = pageInfo.page;
                const originalPath = pageInfo.path;
                const finalPath = path.join(outputDir, `page_${String(pageNum).padStart(3, "0")}.${config.imageFormat}`);
                if (config.imageFormat === "webp") {
                    yield (0, sharp_1.default)(originalPath)
                        .toFormat("webp", { quality: config.imageQuality })
                        .flatten({ background: { r: 255, g: 255, b: 255 } })
                        .toFile(finalPath);
                }
                else if (config.imageFormat === "jpg" ||
                    config.imageFormat === "jpeg") {
                    yield (0, sharp_1.default)(originalPath)
                        .toFormat("jpeg", { quality: config.imageQuality })
                        .flatten({ background: { r: 255, g: 255, b: 255 } })
                        .toFile(finalPath);
                }
                else {
                    yield (0, sharp_1.default)(originalPath)
                        .toFormat("png")
                        .flatten({ background: { r: 255, g: 255, b: 255 } })
                        .toFile(finalPath);
                }
                imagePaths.push(finalPath);
                try {
                    fs.unlinkSync(originalPath);
                }
                catch (error) {
                    this.logger.warn(`Failed to cleanup temp file: ${error}`);
                }
            }
            return imagePaths;
        });
    }
    getImageDimensions(imagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sharp = require("sharp");
                const metadata = yield sharp(imagePath).metadata();
                return {
                    width: metadata.width || 0,
                    height: metadata.height || 0,
                };
            }
            catch (error) {
                this.logger.warn(`Could not get image dimensions for ${imagePath}, using defaults`);
                return { width: 595, height: 842 };
            }
        });
    }
    registerPdfPages(result) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileIds = [];
            for (const page of result.pages) {
                try {
                    const fileRef = this.fileManager.registerFile(page.imagePath);
                    page.fileId = fileRef.id;
                    fileIds.push(fileRef.id);
                    this.logger.debug(`Registered page ${page.pageNumber} as file ID: ${fileRef.id}`);
                }
                catch (error) {
                    this.logger.warn(`Failed to register page ${page.pageNumber}: ${error}`);
                }
            }
            return fileIds;
        });
    }
    cleanupTempFiles(outputFiles) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const file of outputFiles) {
                try {
                    if (fs.existsSync(file)) {
                        fs.unlinkSync(file);
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to cleanup temp file ${file}: ${error}`);
                }
            }
            const parentDir = path.dirname(outputFiles[0]);
            if (fs.existsSync(parentDir)) {
                try {
                    fs.rmSync(parentDir, { recursive: true, force: true });
                }
                catch (error) {
                    this.logger.warn(`Failed to cleanup temp directory ${parentDir}: ${error}`);
                }
            }
        });
    }
}
exports.PdfProcessor = PdfProcessor;
