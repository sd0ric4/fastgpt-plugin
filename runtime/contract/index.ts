import { c } from "./init";
import { toolContract } from "./tool";

export const contract = c.router({
  tool: toolContract,
});
