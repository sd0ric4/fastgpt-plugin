import { initClient } from "@ts-rest/core";
import { contract } from "./index";

export default function createClient({ baseUrl }: { baseUrl: string }) {
  return initClient(contract, {
    baseUrl,
  });
}
