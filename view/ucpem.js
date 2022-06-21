/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.isChild()

project.prefix("src").res("view",
    github("bt7s7k7/Vue3GUI").res("vue3gui"),
    project.ref("adminUICommon"),
    github("bt7s7k7/RemoteUI").res("remoteUIFrontend"),
    github("bt7s7k7/VirtualNetwork").res("virtualNetworkModem"),
)