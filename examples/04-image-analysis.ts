import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";
import { FileManager } from "../core/utils/FileManager";
import * as path from "path";

require("dotenv").config({ path: ".env.test" });

async function runImageAnalysis() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {
      llm: {
        grok: {
          apiKey: process.env.GROK_API_KEY!,
        },
      },
    },
    logLevel: "info",
    tempDir: path.join(process.cwd(), "temp"),
  };

  const executor = new FlowExecutor(config);
  const fileManager = FileManager.getInstance(config.tempDir);

  const imagePath = path.join(__dirname, "samples/sample.jpg");
  const imageFileRef = fileManager.registerFile(imagePath);

  const flow = {
    name: "image-analysis",
    version: "1.0.0",
    description: "Analyze image using vision LLM",
    author: "OpenFlow SDK",
    variables: [{ id: "image_file", type: "file" }, { id: "analysis_result" }],
    input: ["image_file"],
    output: ["analysis_result"],
    nodes: [
      {
        id: "analyze_image",
        type: "LLM",
        name: "Analyze Image",
        config: { provider: "grok", model: "grok-2-vision-latest" },
        messages: [
          {
            type: "image",
            role: "user",
            text: "Analyze this image and describe what you see:",
            image_data: "{{image_file}}",
          },
        ],
        output: {
          description: {
            type: "string",
            description: "Image analysis",
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

  try {
    const result = await executor.executeFlow(flow, {
      image_file: imageFileRef.id,
    });
    console.log("Analysis:", result.outputs.analysis_result);
    fileManager.cleanup();
  } catch (error) {
    console.error("Error:", error);
    fileManager.cleanup();
  }
}

runImageAnalysis().catch(console.error);
