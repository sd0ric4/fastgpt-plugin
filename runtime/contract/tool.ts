import z from "zod";
import { c } from "./init";
import {
  ToolListItemSchema,
  ToolTypeEnum,
} from "@fastgpt-plugin/tools/type/tool";
import type { InputType } from "../../tools/type";

export const runType = z.object({
  toolId: z.string(),
  input: z.any(),
});

export const toolContract = c.router(
  {
    run: {
      path: "/run",
      method: "POST",
      description: "Run a tool",
      body: runType,
      responses: {
        200: z.object({
          output: z.unknown(),
        }),
      },
    },
    getTool: {
      path: "/get",
      method: "GET",
      description: "Get a tool",
      query: z.object({
        toolId: z.string(),
      }),
      responses: {
        200: ToolListItemSchema,
      },
    },
    list: {
      path: "/list",
      method: "GET",
      description: "Get tools list",
      query: z.object({
        search: z.string().optional(),
        type: ToolTypeEnum.optional(),
        parentId: z.string().optional(),
      }),
      responses: {
        // 200: z.array(ToolListItemSchema),
        200: c.type<
          Array<
            Omit<z.infer<typeof ToolListItemSchema>, "inputs"> & {
              inputs: InputType[];
            }
          >
        >(),
      },
    },
  },
  {
    pathPrefix: "/tool",
    commonResponse: {
      400: z.object({
        error: z.string(),
      }),
      404: z.object({
        error: z.string(),
      }),
    },
  },
);
