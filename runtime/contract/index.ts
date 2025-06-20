import { c } from "./init";
import { toolContract } from "./tool";

type toolRouter = typeof toolContract;

export const contract = c.router({
  tool: toolContract as toolRouter,
});
