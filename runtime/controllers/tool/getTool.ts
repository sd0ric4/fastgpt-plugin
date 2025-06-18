import { s } from "../init";
import { contract } from "../../contract";
import { getTool } from "../../utils/tools";
import { formatToolList } from "@fastgpt-plugin/tools/type/tool";

export default s.route(contract.tool.getTool, async (args) => {
  const { toolId } = args.query;
  const tool = getTool(toolId);
  if (!tool) {
    return {
      status: 404,
      body: { error: "tool not found" },
    };
  }

  return {
    status: 200,
    body: formatToolList([tool])[0],
  };
});
