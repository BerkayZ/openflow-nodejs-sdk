/**
 * Document Processing Integration Tests
 * Tests PDF processing and image analysis
 */

import { FlowExecutor } from "../../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../../core/types";
import * as fs from "fs";
import * as path from "path";

describe("Document Processing Integration Tests", () => {
  let executor: FlowExecutor;
  let config: FlowExecutorConfig;

  beforeAll(() => {
    if (!process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
      console.warn(
        "Skipping document processing integration tests - no API keys provided",
      );
      return;
    }

    config = {
      concurrency: { global_limit: 2 },
      providers: {
        llm: {
          grok: {
            apiKey: process.env.GROK_API_KEY!,
          },
        },
      },
      logLevel: "warn",
      timeout: 120000,
      tempDir: process.env.TEST_TEMP_DIR || "./of_tmp",
    };
    executor = new FlowExecutor(config);
  });

  beforeEach(() => {
    if (!process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
      pending("No API keys provided for document processing tests");
    }
  });

  describe("PDF Processing", () => {
    test("should process PDF and extract pages as images", async () => {
      const pdfPath = process.env.TEST_PDF_PATH || "./examples/sample.pdf";

      if (!fs.existsSync(pdfPath)) {
        pending(`Test PDF not found at ${pdfPath}`);
        return;
      }

      const flow = {
        name: "pdf-processing-test",
        version: "1.0.0",
        description: "PDF processing test",
        author: "Test Suite",
        variables: [{ id: "pdf_path" }, { id: "extracted_data" }],
        input: ["pdf_path"],
        output: ["extracted_data"],
        nodes: [
          {
            id: "split_pdf",
            type: "DOCUMENT_SPLITTER",
            name: "Split PDF into Images",
            config: {
              image_quality: "high",
              dpi: 200,
              image_format: "png",
            },
            document: "{{pdf_path}}",
          },
          {
            id: "save_extracted_data",
            type: "UPDATE_VARIABLE",
            name: "Save Extracted Data",
            config: { type: "update", variable_id: "extracted_data" },
            value: "{{split_pdf.pages}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        pdf_path: pdfPath,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.extracted_data).toBeDefined();
      expect(Array.isArray(result.outputs.extracted_data)).toBe(true);
      expect(result.outputs.extracted_data.length).toBeGreaterThan(0);

      // Check structure of page objects
      result.outputs.extracted_data.forEach((page: any) => {
        expect(page).toHaveProperty("fileId");
        expect(page).toHaveProperty("height");
        expect(page).toHaveProperty("imagePath");
        expect(page).toHaveProperty("pageNumber");
        expect(page).toHaveProperty("width");
        expect(typeof page.fileId).toBe("string");
        expect(typeof page.height).toBe("number");
        expect(typeof page.imagePath).toBe("string");
        expect(typeof page.pageNumber).toBe("number");
        expect(typeof page.width).toBe("number");

        // Check that image files were created
        expect(fs.existsSync("./" + page.imagePath)).toBe(true);
      });
    }, 60000);

    test("should analyze PDF content with LLM", async () => {
      const pdfPath = process.env.TEST_PDF_PATH || "./examples/sample.pdf";

      if (!fs.existsSync(pdfPath)) {
        pending(`Test PDF not found at ${pdfPath}`);
        return;
      }

      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "pdf-analysis-test",
        version: "1.0.0",
        description: "PDF analysis with LLM test",
        author: "Test Suite",
        variables: [{ id: "pdf_path" }, { id: "analysis_result" }],
        input: ["pdf_path"],
        output: ["analysis_result"],
        nodes: [
          {
            id: "split_pdf",
            type: "DOCUMENT_SPLITTER",
            name: "Split PDF",
            config: {
              image_quality: "high",
              dpi: 150,
              image_format: "png",
            },
            document: "{{pdf_path}}",
          },
          {
            id: "analyze_pages",
            type: "FOR_EACH",
            name: "Analyze Each Page",
            config: {
              delay_between: 1000,
              each_key: "current_image",
            },
            input: {
              items: "{{split_pdf.pages}}",
            },
            each_nodes: [
              {
                id: "analyze_page_content",
                type: "LLM",
                name: "Analyze Page Content",
                config: {
                  provider: "grok",
                  model: "grok-3-latest",
                  max_tokens: 1000,
                  temperature: 0.1,
                },
                messages: [
                  {
                    type: "text",
                    role: "system",
                    text: "You are a document analyzer. Analyze the content of this page image and extract key information.",
                  },
                  {
                    type: "image",
                    role: "user",
                    text: "What is the main content of this page? Provide a brief summary.",
                    image_data: "{{current_image.fileId}}",
                  },
                ],
                output: {
                  summary: {
                    type: "string",
                    description: "Page content summary",
                  },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key points from the page",
                  },
                },
              },
            ],
          },
          {
            id: "combine_analysis",
            type: "UPDATE_VARIABLE",
            name: "Combine Analysis Results",
            config: {
              type: "join",
              variable_id: "analysis_result",
              join_str: "\n---\n",
            },
            value: "{{analyze_pages.analyze_page_content.summary}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        pdf_path: pdfPath,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.analysis_result).toBeDefined();
      expect(typeof result.outputs.analysis_result).toBe("string");
      expect(result.outputs.analysis_result.length).toBeGreaterThan(0);
    }, 120000);
  });

  describe("Image Analysis", () => {
    test("should analyze image content with LLM", async () => {
      const imagePath =
        process.env.TEST_IMAGE_PATH || "./examples/test_image.png";

      if (!fs.existsSync(imagePath)) {
        pending(`Test image not found at ${imagePath}`);
        return;
      }

      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "image-analysis-test",
        version: "1.0.0",
        description: "Image analysis test",
        author: "Test Suite",
        variables: [{ id: "image_path" }, { id: "analysis_result" }],
        input: ["image_path"],
        output: ["analysis_result"],
        nodes: [
          {
            id: "analyze_image",
            type: "LLM",
            name: "Analyze Image",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 1500,
              temperature: 0.2,
            },
            messages: [
              {
                type: "text",
                role: "system",
                text: "You are an expert image analyst. Provide detailed analysis of images including objects, text, composition, and context.",
              },
              {
                type: "image",
                role: "user",
                text: "Analyze this image and describe what you see. Include details about objects, text, people, setting, and any other relevant information.",
                image_path: "{{image_path}}",
                detail: "high",
              },
            ],
            output: {
              description: {
                type: "string",
                description: "Detailed image description",
              },
              objects: {
                type: "array",
                items: { type: "string" },
                description: "Objects detected in the image",
              },
              text_content: {
                type: "string",
                description: "Any text found in the image",
              },
              scene_type: {
                type: "string",
                description: "Type of scene or setting",
              },
              confidence: {
                type: "string",
                description: "Confidence level in the analysis",
              },
            },
          },
          {
            id: "save_analysis",
            type: "UPDATE_VARIABLE",
            name: "Save Analysis",
            config: { type: "update", variable_id: "analysis_result" },
            value: "{{analyze_image.description}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        image_path: imagePath,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.analysis_result).toBeDefined();
      expect(typeof result.outputs.analysis_result).toBe("string");
      expect(result.outputs.analysis_result.length).toBeGreaterThan(0);
    }, 60000);

    test("should handle multiple image formats", async () => {
      const imagePath =
        process.env.TEST_IMAGE_PATH || "./examples/test_image.png";

      if (!fs.existsSync(imagePath)) {
        pending(`Test image not found at ${imagePath}`);
        return;
      }

      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "multi-format-image-test",
        version: "1.0.0",
        description: "Multiple image format test",
        author: "Test Suite",
        variables: [{ id: "image_paths" }, { id: "analysis_results" }],
        input: ["image_paths"],
        output: ["analysis_results"],
        nodes: [
          {
            id: "analyze_images",
            type: "FOR_EACH",
            name: "Analyze Each Image",
            config: {
              delay_between: 2000,
              each_key: "current_image_path",
            },
            input: {
              items: "{{image_paths}}",
            },
            each_nodes: [
              {
                id: "analyze_current_image",
                type: "LLM",
                name: "Analyze Current Image",
                config: {
                  provider: "grok",
                  model: "grok-3-latest",
                  max_tokens: 500,
                  temperature: 0.1,
                },
                messages: [
                  {
                    type: "image",
                    role: "user",
                    image_path: "{{current_image_path}}",
                    detail: "low",
                  },
                  {
                    type: "text",
                    role: "user",
                    text: "Briefly describe what you see in this image.",
                  },
                ],
                output: {
                  description: {
                    type: "string",
                    description: "Brief image description",
                  },
                },
              },
            ],
          },
          {
            id: "collect_results",
            type: "UPDATE_VARIABLE",
            name: "Collect Analysis Results",
            config: {
              type: "join",
              variable_id: "analysis_results",
              join_str: "; ",
            },
            value: "{{analyze_images.analyze_current_image.description}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        image_paths: [imagePath], // Can be extended with more formats
      });

      expect(result.success).toBe(true);
      expect(result.outputs.analysis_results).toBeDefined();
      expect(typeof result.outputs.analysis_results).toBe("string");
    }, 60000);
  });

  describe("Document Processing Error Handling", () => {
    test("should handle non-existent PDF files gracefully", async () => {
      const flow = {
        name: "missing-pdf-test",
        version: "1.0.0",
        description: "Missing PDF test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "split_missing_pdf",
            type: "DOCUMENT_SPLITTER",
            name: "Split Missing PDF",
            config: {
              image_quality: "high",
              dpi: 200,
            },
            document: "./nonexistent.pdf",
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });

    test("should handle invalid image paths in LLM nodes", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "invalid-image-test",
        version: "1.0.0",
        description: "Invalid image test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "analyze_invalid_image",
            type: "LLM",
            name: "Analyze Invalid Image",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 100,
            },
            messages: [
              {
                type: "image",
                role: "user",
                image_path: "./nonexistent_image.jpg",
              },
              {
                type: "text",
                role: "user",
                text: "Describe this image.",
              },
            ],
            output: {
              description: {
                type: "string",
                description: "Image description",
              },
            },
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });

    test("should handle corrupted PDF files", async () => {
      // Create a corrupted PDF file for testing
      const corruptedPdfPath = path.join(
        process.env.TEST_TEMP_DIR || "./test_temp",
        "corrupted.pdf",
      );
      fs.writeFileSync(
        corruptedPdfPath,
        "This is not a valid PDF file content",
      );

      const flow = {
        name: "corrupted-pdf-test",
        version: "1.0.0",
        description: "Corrupted PDF test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "split_corrupted_pdf",
            type: "DOCUMENT_SPLITTER",
            name: "Split Corrupted PDF",
            config: {
              image_quality: "low",
              dpi: 72,
            },
            document: corruptedPdfPath,
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();

      // Clean up
      if (fs.existsSync(corruptedPdfPath)) {
        fs.unlinkSync(corruptedPdfPath);
      }
    });
  });

  describe("Complete Document Processing Workflow", () => {
    test("should execute complete PDF processing and analysis workflow", async () => {
      const pdfPath = process.env.TEST_PDF_PATH || "./examples/sample.pdf";

      if (!fs.existsSync(pdfPath)) {
        pending(`Test PDF not found at ${pdfPath}`);
        return;
      }

      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "complete-pdf-workflow-test",
        version: "1.0.0",
        description: "Complete PDF processing workflow",
        author: "Test Suite",
        variables: [{ id: "pdf_path" }, { id: "processing_summary" }],
        input: ["pdf_path"],
        output: ["processing_summary"],
        nodes: [
          {
            id: "extract_pages",
            type: "DOCUMENT_SPLITTER",
            name: "Extract PDF Pages",
            config: {
              image_quality: "medium",
              dpi: 150,
              image_format: "png",
            },
            document: "{{pdf_path}}",
          },
          {
            id: "summarize_document",
            type: "LLM",
            name: "Summarize Document",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 2000,
              temperature: 0.3,
            },
            messages: [
              {
                type: "text",
                role: "system",
                text: "You are a document summarization expert. Analyze the provided document pages and create a comprehensive summary.",
              },
              {
                type: "text",
                role: "user",
                text: "I have extracted {{extract_pages.pages.length}} pages from a PDF document. Please provide an analysis framework for this document.",
              },
            ],
            output: {
              summary: {
                type: "string",
                description: "Document summary and analysis framework",
              },
              page_count: {
                type: "number",
                description: "Number of pages processed",
              },
              processing_notes: {
                type: "string",
                description: "Notes about the processing",
              },
            },
          },
          {
            id: "save_summary",
            type: "UPDATE_VARIABLE",
            name: "Save Processing Summary",
            config: { type: "update", variable_id: "processing_summary" },
            value:
              "Processed {{summarize_document.page_count}} pages. Summary: {{summarize_document.summary}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        pdf_path: pdfPath,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.processing_summary).toBeDefined();
      expect(typeof result.outputs.processing_summary).toBe("string");
      expect(result.outputs.processing_summary).toContain("Processed");
    }, 120000);
  });
});
