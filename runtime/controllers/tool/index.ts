import { contract } from "../../contract";
import { s } from "../init";
import getTool from "./getTool";
import list from "./list";
import run from "./run";

export default s.router(contract.tool, {
  getTool,
  list,
  run,
});
