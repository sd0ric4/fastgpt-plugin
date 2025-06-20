import { s } from "../init";
import { contract } from "../../contract";
import { getTool } from "../../utils/tools";
import { dispatchWithNewWorker } from "../../worker";
import { prod } from "@/runtime";

export default s.route(contract.tool.run, async (args) => {
  const { toolId, input } = args.body;
  const tool = getTool(toolId);
  if (!tool) {
    return {
      status: 404,
      body: { error: "tool not found" },
    };
  }
  try {
    const result = prod
      ? await dispatchWithNewWorker({ toolId, input })
      : await tool.cb(input);
    return {
      status: 200,
      body: contract.tool.run.responses[200].parse(result),
    };
  } catch (error) {
    return {
      status: 400,
      body: { error: `error:  ${error}` },
    };
  }
});
