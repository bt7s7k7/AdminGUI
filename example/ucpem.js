/// <reference path="./.vscode/config.d.ts" />

const { copyFile } = require("fs/promises")
const { project, include, github, copy, join, constants } = require("ucpem")

project.isChild()

include("frontend/ucpem.js")

project.prefix("src").res("example",
    github("bt7s7k7/SimpleServer").res("simpleDB"),
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    project.ref("adminUIClient")
)

project.script("esbuild", async () => {
    const { build } = require("esbuild")

    await build({
        bundle: true,
        format: "cjs",
        entryPoints: ["./src/index.ts"],
        outfile: "dist/index.js",
        sourcemap: "external",
        logLevel: "info",
        platform: "node",
        preserveSymlinks: true
    })

    await copy(join(constants.projectPath, "frontend/dist"), join(constants.projectPath, "dist/frontend/dist"), { quiet: true })
    await copyFile(join(constants.projectPath, ".env"), join(constants.projectPath, "dist/.env"))
})


project.prefix("src").res("exampleCommon")