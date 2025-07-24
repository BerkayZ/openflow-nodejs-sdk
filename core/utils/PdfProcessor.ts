/*
 * PdfProcessor
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import * as fs from "fs";
import * as path from "path";
import { FileManager } from "./FileManager";
import { Logger } from "./Logger";
import sharp from "sharp";
const pdf2image = require("pdf2image");

export interface PdfProcessorOptions {
  imageFormat?: "png" | "jpg" | "jpeg" | "webp";
  imageQuality?: "low" | "medium" | "high";
  dpi?: number;
  outputDir?: string;
  maxImages?: number;
}

export interface PdfPageResult {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
  fileId?: string;
}

export interface PdfProcessorResult {
  totalPages: number;
  pages: PdfPageResult[];
  outputFiles: string[];
}

export class PdfProcessor {
  private logger: Logger;
  private fileManager: FileManager;

  constructor() {
    this.logger = new Logger();
    this.fileManager = FileManager.getInstance();
  }

  async processPdf(
    pdfPath: string,
    options: PdfProcessorOptions = {},
  ): Promise<PdfProcessorResult> {
    this.logger.debug(`Processing PDF: ${pdfPath}`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    const {
      imageFormat = "jpg",
      imageQuality = "high",
      dpi = 300,
      outputDir = this.fileManager.getTempDir(),
      maxImages = 20,
    } = options;

    const numericQuality = this.convertQualityToNumber(imageQuality);

    const outputDirPath = path.join(
      outputDir,
      `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );

    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    try {
      const imagePaths = await this.convertPdfToImages(pdfPath, outputDirPath, {
        imageFormat,
        imageQuality: numericQuality,
        dpi,
        maxImages,
      });

      const pages: PdfPageResult[] = [];
      const outputFiles: string[] = [];

      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        const dimensions = await this.getImageDimensions(imagePath);

        const pageResult: PdfPageResult = {
          pageNumber: i + 1,
          imagePath,
          width: dimensions.width,
          height: dimensions.height,
        };

        pages.push(pageResult);
        outputFiles.push(imagePath);

        this.logger.debug(`Processed page ${i + 1}: ${imagePath}`);
      }

      const processorResult: PdfProcessorResult = {
        totalPages: pages.length,
        pages,
        outputFiles,
      };

      this.logger.debug(
        `PDF processing completed. Total pages: ${processorResult.totalPages}`,
      );

      return processorResult;
    } catch (error) {
      this.logger.error(`Error processing PDF: ${error}`);

      if (fs.existsSync(outputDirPath)) {
        try {
          fs.rmSync(outputDirPath, { recursive: true, force: true });
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to cleanup output directory: ${cleanupError}`,
          );
        }
      }

      throw new Error(`PDF processing failed: ${error}`);
    }
  }

  private convertQualityToNumber(quality: "low" | "medium" | "high"): number {
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

  private async convertPdfToImages(
    pdfPath: string,
    outputDir: string,
    config: {
      imageFormat: string;
      imageQuality: number;
      dpi: number;
      maxImages: number;
    },
  ): Promise<string[]> {
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

    const pdfImages = await pdf2image.convertPDF(pdfPath, options);
    const limitedPdfImages = pdfImages.slice(0, config.maxImages);
    const imagePaths: string[] = [];

    for (let i = 0; i < limitedPdfImages.length; i++) {
      const pageInfo = limitedPdfImages[i];
      const pageNum = pageInfo.page;
      const originalPath = pageInfo.path;

      const finalPath = path.join(
        outputDir,
        `page_${String(pageNum).padStart(3, "0")}.${config.imageFormat}`,
      );

      if (config.imageFormat === "webp") {
        await sharp(originalPath)
          .toFormat("webp", { quality: config.imageQuality })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .toFile(finalPath);
      } else if (
        config.imageFormat === "jpg" ||
        config.imageFormat === "jpeg"
      ) {
        await sharp(originalPath)
          .toFormat("jpeg", { quality: config.imageQuality })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .toFile(finalPath);
      } else {
        await sharp(originalPath)
          .toFormat("png")
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .toFile(finalPath);
      }

      imagePaths.push(finalPath);

      try {
        fs.unlinkSync(originalPath);
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp file: ${error}`);
      }
    }

    return imagePaths;
  }

  private async getImageDimensions(
    imagePath: string,
  ): Promise<{ width: number; height: number }> {
    try {
      const sharp = require("sharp");
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error) {
      this.logger.warn(
        `Could not get image dimensions for ${imagePath}, using defaults`,
      );
      return { width: 595, height: 842 };
    }
  }

  async registerPdfPages(result: PdfProcessorResult): Promise<string[]> {
    const fileIds: string[] = [];

    for (const page of result.pages) {
      try {
        const fileRef = this.fileManager.registerFile(page.imagePath);
        page.fileId = fileRef.id;
        fileIds.push(fileRef.id);

        this.logger.debug(
          `Registered page ${page.pageNumber} as file ID: ${fileRef.id}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to register page ${page.pageNumber}: ${error}`,
        );
      }
    }

    return fileIds;
  }

  async cleanupTempFiles(outputFiles: string[]): Promise<void> {
    for (const file of outputFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp file ${file}: ${error}`);
      }
    }

    const parentDir = path.dirname(outputFiles[0]);
    if (fs.existsSync(parentDir)) {
      try {
        fs.rmSync(parentDir, { recursive: true, force: true });
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup temp directory ${parentDir}: ${error}`,
        );
      }
    }
  }
}
