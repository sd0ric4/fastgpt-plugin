import { s } from "../init";
import { contract } from "../../contract";
import { getTools } from "../../utils/tools";
import { formatToolList } from "@fastgpt-plugin/tools/type/tool";

export default s.route(contract.tool.list, async (args) => {
  const { search, type, parentId } = args.query;
  const tools = getTools();
  const filteredTools = tools.filter((tool) => {
    if (search) {
      return Object.values(tool.name).includes(search);
    }
    if (type) {
      return tool.type === type;
    }
    if (parentId) {
      return tool.parentId === parentId;
    }
    return true;
  });

  return {
    status: 200,
    body: formatToolList(filteredTools),
  };
});
