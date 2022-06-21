/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.isChild()

project.prefix("src").res("adminUIClient",
    project.ref("adminUICommon")
)

project.prefix("src").res("adminUIBridge")

project.prefix("src").res("adminUICommon",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/VirtualNetwork").res("virtualNetworkModem")
)