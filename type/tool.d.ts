import { z } from "zod";
export declare const ToolCallbackType: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodObject<{
    error: z.ZodOptional<z.ZodAny>;
    output: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    error?: any;
    output?: any;
}, {
    error?: any;
    output?: any;
}>>>;
export declare const VersionListItemSchema: z.ZodObject<{
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    version?: string;
}, {
    description?: string;
    version?: string;
}>;
export declare const ToolTypeEnum: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
export declare const ToolConfigSchema: z.ZodObject<{
    toolId: z.ZodOptional<z.ZodString>;
    name: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    description: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    type: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
    icon: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    docURL: z.ZodOptional<z.ZodString>;
    versionList: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        version?: string;
    }, {
        description?: string;
        version?: string;
    }>, "many">;
    inputs: z.ZodArray<z.ZodAny, "many">;
    outputs: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
}, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
}>;
export declare const ToolSetConfigSchema: z.ZodObject<Omit<{
    toolId: z.ZodOptional<z.ZodString>;
    name: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    description: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    type: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
    icon: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    docURL: z.ZodOptional<z.ZodString>;
    versionList: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        version?: string;
    }, {
        description?: string;
        version?: string;
    }>, "many">;
    inputs: z.ZodArray<z.ZodAny, "many">;
    outputs: z.ZodArray<z.ZodAny, "many">;
}, "inputs" | "outputs">, "strip", z.ZodTypeAny, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
}, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
}>;
export declare const ToolSchema: z.ZodObject<Omit<{
    toolId: z.ZodOptional<z.ZodString>;
    name: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    description: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    type: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
    icon: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    docURL: z.ZodOptional<z.ZodString>;
    versionList: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        version?: string;
    }, {
        description?: string;
        version?: string;
    }>, "many">;
    inputs: z.ZodArray<z.ZodAny, "many">;
    outputs: z.ZodArray<z.ZodAny, "many">;
}, "toolId"> & {
    toolId: z.ZodString;
    cb: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodObject<{
        error: z.ZodOptional<z.ZodAny>;
        output: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        error?: any;
        output?: any;
    }, {
        error?: any;
        output?: any;
    }>>>;
    isToolSet: z.ZodBoolean;
    parentId: z.ZodOptional<z.ZodString>;
    toolFile: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
    cb?: (args_0: any, ...args: unknown[]) => Promise<{
        error?: any;
        output?: any;
    }>;
    isToolSet?: boolean;
    parentId?: string;
    toolFile?: string;
}, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
    cb?: (args_0: any, ...args: unknown[]) => Promise<{
        error?: any;
        output?: any;
    }>;
    isToolSet?: boolean;
    parentId?: string;
    toolFile?: string;
}>;
export declare const ToolSetSchema: z.ZodObject<Omit<{
    toolId: z.ZodOptional<z.ZodString>;
    name: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    description: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    type: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
    icon: z.ZodString;
    author: z.ZodOptional<z.ZodString>;
    docURL: z.ZodOptional<z.ZodString>;
    versionList: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        version?: string;
    }, {
        description?: string;
        version?: string;
    }>, "many">;
    inputs: z.ZodArray<z.ZodAny, "many">;
    outputs: z.ZodArray<z.ZodAny, "many">;
}, "inputs" | "outputs"> & {
    isToolSet: z.ZodBoolean;
    children: z.ZodArray<z.ZodObject<Omit<{
        toolId: z.ZodOptional<z.ZodString>;
        name: z.ZodObject<{
            en: z.ZodOptional<z.ZodString>;
            "zh-CN": z.ZodString;
            "zh-Hant": z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        }, {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        }>;
        description: z.ZodObject<{
            en: z.ZodOptional<z.ZodString>;
            "zh-CN": z.ZodString;
            "zh-Hant": z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        }, {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        }>;
        type: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
        icon: z.ZodString;
        author: z.ZodOptional<z.ZodString>;
        docURL: z.ZodOptional<z.ZodString>;
        versionList: z.ZodArray<z.ZodObject<{
            version: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description?: string;
            version?: string;
        }, {
            description?: string;
            version?: string;
        }>, "many">;
        inputs: z.ZodArray<z.ZodAny, "many">;
        outputs: z.ZodArray<z.ZodAny, "many">;
    }, "toolId"> & {
        toolId: z.ZodString;
        cb: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodObject<{
            error: z.ZodOptional<z.ZodAny>;
            output: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            error?: any;
            output?: any;
        }, {
            error?: any;
            output?: any;
        }>>>;
        isToolSet: z.ZodBoolean;
        parentId: z.ZodOptional<z.ZodString>;
        toolFile: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        type?: "search" | "other" | "tools" | "multimodal" | "communication";
        description?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        toolId?: string;
        icon?: string;
        author?: string;
        docURL?: string;
        versionList?: {
            description?: string;
            version?: string;
        }[];
        inputs?: any[];
        outputs?: any[];
        cb?: (args_0: any, ...args: unknown[]) => Promise<{
            error?: any;
            output?: any;
        }>;
        isToolSet?: boolean;
        parentId?: string;
        toolFile?: string;
    }, {
        name?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        type?: "search" | "other" | "tools" | "multimodal" | "communication";
        description?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        toolId?: string;
        icon?: string;
        author?: string;
        docURL?: string;
        versionList?: {
            description?: string;
            version?: string;
        }[];
        inputs?: any[];
        outputs?: any[];
        cb?: (args_0: any, ...args: unknown[]) => Promise<{
            error?: any;
            output?: any;
        }>;
        isToolSet?: boolean;
        parentId?: string;
        toolFile?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    children?: {
        name?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        type?: "search" | "other" | "tools" | "multimodal" | "communication";
        description?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        toolId?: string;
        icon?: string;
        author?: string;
        docURL?: string;
        versionList?: {
            description?: string;
            version?: string;
        }[];
        inputs?: any[];
        outputs?: any[];
        cb?: (args_0: any, ...args: unknown[]) => Promise<{
            error?: any;
            output?: any;
        }>;
        isToolSet?: boolean;
        parentId?: string;
        toolFile?: string;
    }[];
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    isToolSet?: boolean;
}, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    type?: "search" | "other" | "tools" | "multimodal" | "communication";
    children?: {
        name?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        type?: "search" | "other" | "tools" | "multimodal" | "communication";
        description?: {
            en?: string;
            "zh-CN"?: string;
            "zh-Hant"?: string;
        };
        toolId?: string;
        icon?: string;
        author?: string;
        docURL?: string;
        versionList?: {
            description?: string;
            version?: string;
        }[];
        inputs?: any[];
        outputs?: any[];
        cb?: (args_0: any, ...args: unknown[]) => Promise<{
            error?: any;
            output?: any;
        }>;
        isToolSet?: boolean;
        parentId?: string;
        toolFile?: string;
    }[];
    description?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    toolId?: string;
    icon?: string;
    author?: string;
    docURL?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    isToolSet?: boolean;
}>;
export declare const ToolListItemSchema: z.ZodObject<{
    id: z.ZodString;
    isFolder: z.ZodBoolean;
    parentId: z.ZodOptional<z.ZodString>;
    docUrl: z.ZodOptional<z.ZodString>;
    name: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    avatar: z.ZodString;
    versionList: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string;
        version?: string;
    }, {
        description?: string;
        version?: string;
    }>, "many">;
    workflow: z.ZodObject<{
        nodes: z.ZodArray<z.ZodAny, "many">;
        edges: z.ZodArray<z.ZodAny, "many">;
    }, "strip", z.ZodTypeAny, {
        nodes?: any[];
        edges?: any[];
    }, {
        nodes?: any[];
        edges?: any[];
    }>;
    intro: z.ZodObject<{
        en: z.ZodOptional<z.ZodString>;
        "zh-CN": z.ZodString;
        "zh-Hant": z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }, {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    }>;
    templateType: z.ZodEnum<["tools", "search", "multimodal", "communication", "other"]>;
    pluginOrder: z.ZodNumber;
    isActive: z.ZodBoolean;
    weight: z.ZodNumber;
    originCost: z.ZodNumber;
    currentCost: z.ZodNumber;
    hasTokenFee: z.ZodBoolean;
    inputs: z.ZodArray<z.ZodAny, "many">;
    outputs: z.ZodArray<z.ZodAny, "many">;
}, "strip", z.ZodTypeAny, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    id?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
    parentId?: string;
    isFolder?: boolean;
    docUrl?: string;
    avatar?: string;
    workflow?: {
        nodes?: any[];
        edges?: any[];
    };
    intro?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    templateType?: "search" | "other" | "tools" | "multimodal" | "communication";
    pluginOrder?: number;
    isActive?: boolean;
    weight?: number;
    originCost?: number;
    currentCost?: number;
    hasTokenFee?: boolean;
}, {
    name?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    id?: string;
    versionList?: {
        description?: string;
        version?: string;
    }[];
    inputs?: any[];
    outputs?: any[];
    parentId?: string;
    isFolder?: boolean;
    docUrl?: string;
    avatar?: string;
    workflow?: {
        nodes?: any[];
        edges?: any[];
    };
    intro?: {
        en?: string;
        "zh-CN"?: string;
        "zh-Hant"?: string;
    };
    templateType?: "search" | "other" | "tools" | "multimodal" | "communication";
    pluginOrder?: number;
    isActive?: boolean;
    weight?: number;
    originCost?: number;
    currentCost?: number;
    hasTokenFee?: boolean;
}>;
type ToolListItemType = z.infer<typeof ToolListItemSchema>;
export declare function formatToolList(list: z.infer<typeof ToolSchema>[]): ToolListItemType[];
export {};
