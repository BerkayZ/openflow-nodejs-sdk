/*
 * DocumentSplitterNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { DocumentSplitterNode } from "../../types";
import { PdfProcessor } from "../../utils/PdfProcessor";
import * as fs from "fs";
import * as path from "path";

export class DocumentSplitterNodeExecutor extends BaseNode {
  async execute(
    node: DocumentSplitterNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.log(context, "debug", `Executing document splitter node: ${node.id}`);

    // Resolve the document path
    const documentPath = this.resolveValueExpression(
      node.document,
      context.registry,
    );

    this.log(context, "debug", `Document path resolved to: ${documentPath}`);

    // Validate document path
    if (!documentPath || typeof documentPath !== "string") {
      throw new Error("Document path is required and must be a string");
    }

    // Check if it's a file ID or a file path
    let actualPath: string;
    let isFileId = false;

    if (context.registry.getFileManager().hasFile(documentPath)) {
      // It's a file ID
      const fileRef = context.registry.getFileManager().getFile(documentPath);
      if (!fileRef) {
        throw new Error(`File not found: ${documentPath}`);
      }
      actualPath = fileRef.tempPath;
      isFileId = true;
      this.log(
        context,
        "debug",
        `Using file ID: ${documentPath} -> ${actualPath}`,
      );
    } else {
      // It's a file path
      actualPath = documentPath;
      this.log(context, "debug", `Using file path: ${actualPath}`);
    }

    // Validate file exists
    if (!fs.existsSync(actualPath)) {
      throw new Error(`Document file not found: ${actualPath}`);
    }

    // Get file stats
    const stats = fs.statSync(actualPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${actualPath}`);
    }

    // Get file extension to determine type
    const extension = path.extname(actualPath).toLowerCase();
    const filename = path.basename(actualPath);

    this.log(
      context,
      "debug",
      `Processing document: ${filename} (${extension})`,
    );

    // Process different document types
    const result = await this.processDocument(
      actualPath,
      extension,
      node.config,
      context,
    );

    // If input was a file ID, we might want to register the output files
    if (isFileId && result.pages && Array.isArray(result.pages)) {
      const outputFileIds = [];
      for (const page of result.pages) {
        if (page.imagePath) {
          try {
            const fileId = context.registry.registerFile(page.imagePath);
            outputFileIds.push(fileId);
            page.fileId = fileId;
          } catch (error) {
            this.log(
              context,
              "warn",
              `Failed to register output file: ${page.imagePath}`,
              error,
            );
          }
        }
      }
      result.outputFileIds = outputFileIds;
    }

    return result;
  }

  private async processDocument(
    filePath: string,
    extension: string,
    config: any,
    context: NodeExecutionContext,
  ): Promise<any> {
    const { image_quality = "high", dpi = 200, image_format = "png" } = config;

    switch (extension) {
      case ".pdf":
        return this.processPDF(
          filePath,
          { image_quality, dpi, image_format },
          context,
        );

      default:
        throw new Error(`Unsupported document type: ${extension}`);
    }
  }

  private async processPDF(
    filePath: string,
    config: { image_quality: string; dpi: number; image_format: string },
    context: NodeExecutionContext,
  ): Promise<any> {
    this.log(context, "debug", `Processing PDF: ${filePath}`);

    const processor = new PdfProcessor();
    const stats = fs.statSync(filePath);

    try {
      const result = await processor.processPdf(filePath, {
        imageFormat: config.image_format as "png" | "jpg" | "jpeg",
        imageQuality: config.image_quality as "low" | "medium" | "high",
        dpi: config.dpi,
      });

      await processor.registerPdfPages(result);

      return {
        type: "pdf",
        filename: path.basename(filePath),
        size: stats.size,
        pageCount: result.totalPages,
        pages: result.pages.map((page) => ({
          pageNumber: page.pageNumber,
          imagePath: page.imagePath,
          width: page.width,
          height: page.height,
          fileId: page.fileId,
        })),
        metadata: {
          processed: new Date().toISOString(),
          config: config,
        },
      };
    } catch (error) {
      this.log(context, "error", `Failed to process PDF: ${error}`);
      throw error;
    }
  }
}
