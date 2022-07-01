/// <reference path="./.vscode/config.d.ts" />

const { spawn } = require("child_process")
const { project, github, join, constants, log } = require("ucpem")

project.isChild()

project.prefix("src").res("adminUIClient",
    project.ref("adminUICommon"),
    github("bt7s7k7/RemoteUI").res("remoteUIBackend")
)

project.prefix("src").res("adminUIBridge")

project.prefix("src").res("adminUICommon",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/VirtualNetwork").res("virtualNetworkModem")
)

project.script("start-shell", async (args) => {
    const shellProc = spawn("node", [join(constants.projectPath, "build/app/app.js"), ...args], {
        stdio: "inherit"
    })

    process.on("SIGINT", () => { })

    await new Promise(resolve => shellProc.on("exit", resolve))

    log("Terminated")
}, { argc: NaN, desc: "Starts an admin ui server and creates a shell with the env" })