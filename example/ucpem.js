/// <reference path="./.vscode/config.d.ts" />

const { project, include, github } = require("ucpem")

project.isChild()

include("frontend/ucpem.js")

project.prefix("src").res("example",
    github("bt7s7k7/SimpleServer").res("simpleDB"),
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    project.ref("adminUIClient")
)

project.prefix("src").res("exampleCommon")