import { s } from "../init";
import { contract } from "../../contract";
import { getTool } from "../../utils/tools";
import { dispatchWithNewWorker } from "../../worker";

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
    const result = await dispatchWithNewWorker({ toolId, input });
    return {
      status: 200,
      body: {
        output: result,
      },
    };
  } catch (error) {
    return {
      status: 400,
      body: { error: `error:  ${error}` },
    };
  }
});
