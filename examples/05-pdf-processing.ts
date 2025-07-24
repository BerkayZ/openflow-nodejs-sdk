import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";
import * as path from "path";

require("dotenv").config({ path: ".env.test" });

async function runPDFProcessing() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
    },
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);
  const pdfPath = path.join(__dirname, "samples/sample.pdf");

  const flow = {
    name: "pdf-processing",
    version: "1.0.0",
    description: "Process PDF pages with vision analysis",
    author: "OpenFlow SDK",
    variables: [
      { id: "pdf_file", type: "file" },
      { id: "final_summary", default: "" },
    ],
    input: ["pdf_file"],
    output: ["final_summary"],
    nodes: [
      {
        id: "pdf_splitter",
        type: "DOCUMENT_SPLITTER",
        name: "Split PDF",
        document: "{{pdf_file}}",
        config: {
          image_quality: "high",
          dpi: 200,
          image_format: "png",
        },
      },
      {
        id: "analyze_pages",
        type: "FOR_EACH",
        name: "Process Each Page",
        config: {
          delay_between: 100,
          each_key: "current",
        },
        input: { items: "{{pdf_splitter.pages}}" },
        each_nodes: [
          {
            id: "analyze_page",
            type: "LLM",
            name: "Analyze Page",
            config: { provider: "openai", model: "gpt-4.1-2025-04-14" },
            messages: [
              {
                type: "image",
                role: "user",
                text: "Analyze this PDF page and describe its content:",
                image_data: "{{current.fileId}}",
              },
            ],
            output: {
              explanation: {
                type: "string",
                description: "Page analysis",
              },
            },
          },
          {
            id: "save_page_analysis",
            type: "UPDATE_VARIABLE",
            name: "Save Page Analysis",
            config: {
              type: "join",
              variable_id: "final_summary",
              join_str: "\n\n---\n\n",
            },
            value: "{{analyze_page.explanation}}",
          },
        ],
      },
    ],
  };

  try {
    const result = await executor.executeFlow(flow, {
      pdf_file: pdfPath,
    });
    console.log("PDF Analysis:\n" + result.outputs.final_summary);
  } catch (error) {
    console.error("Error:", error);
  }
}

runPDFProcessing().catch(console.error);
