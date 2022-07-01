/* eslint-disable no-console */
import { ChildProcess, spawn } from "child_process"
import { createServer } from "http"
import { join } from "path"
import { Server } from "socket.io"
import { AdminUIBridge } from "../adminUIBridge/AdminUIBridge"
import { ADMIN_GUI_SOCKET_VARIABLE } from "../adminUICommon/const"
import { stringifyAddress } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { VirtualRouter } from "../virtualNetwork/VirtualRouter"
import { VirtualModemServer } from "../virtualNetworkModem/VirtualModem"
import express = require("express")
import open = require("open")

/* if (!process.env[ADMIN_GUI_SOCKET_VARIABLE]) {
    const root = new VirtualRouter()
    const bridge = new AdminUIBridge({ parent: root.connect() })

    VirtualPeer.make(root.connect(), "thing").then(peer => {
        console.log("init")
        peer.enableHost()
        peer.onConnection.add(null, conn => {
            conn.onMessage.add(null, msg => {
                console.log("<0>", msg)
                conn.send("bye world")
            })
        })

        console.log("peer done")
        return bridge.listening
    }).then(path => {
        console.log("listening")
        const child = spawn(process.argv[0], [...process.execArgv, "--inspect=127.0.0.1:9230", process.argv[1]], {
            env: {
                ...process.env,
                [ADMIN_GUI_SOCKET_VARIABLE]: path
            },
            stdio: "inherit"
        })

        child.on("exit", () => {
            bridge.dispose()
            process.exit(0)
        })
        console.log("child done?")
    })
} else {
    console.log("child done")
    AdminUIClient.connect().then(client => {
        console.log("connected")
        VirtualPeer.make(client.connect()).then(peer => {
            console.log("peer registered")
            peer.findPeersByName("thing").then(([serverID]) => {
                peer.connect(serverID).then(conn => {
                    conn.onMessage.add(null, msg => {
                        console.log("<1>", msg)
                        client.dispose()
                        process.exit(0)
                    })
                    conn.send("hello world")
                })
            })
        })
    })

    process.on("uncaughtException", err => {
        console.log("e child")
        console.error(err)
        process.exit(1)
    })
} */

const app = express()
const server = createServer(app)
const io = new Server(server)

const root = new VirtualRouter()
const bridge = new AdminUIBridge({ parent: root.connect() })

io.on("connect", socket => {
    const context = new DIContext()
    context.provide(IDProvider, () => new IDProvider.Incremental())
    context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
    const modem = context.instantiate(() => new VirtualModemServer(root.connect()))
    context.guard(modem)

    socket.on("disconnect", () => {
        context.dispose()
    })
})

app.use(express.static(join(__dirname, "../../../view/dist"), {
    fallthrough: true
}), (req, res) => res.sendFile(join(__dirname, "../../../view/dist/index.html")))

let bind: any = undefined

for (const arg of process.argv) {
    const portArgument = arg.match(/^--port=(.*)$/)
    if (portArgument) {
        bind = portArgument[1]
        break
    }
}

server.listen(bind, () => {
    const address = "http://" + stringifyAddress(server.address())
    if (!process.argv.includes("--no-browser")) open(address)
    else console.log("Listening at " + address)
})

const shell = process.env.SHELL ?? process.env.COMSPEC
let shellProc: ChildProcess | null = null
if (!shell) console.error("Cannot find shell to start")
else {
    shellProc = spawn(shell, {
        env: {
            ...process.env,
            [ADMIN_GUI_SOCKET_VARIABLE]: bridge.path
        },
        stdio: "inherit",
        shell: false
    })

    shellProc.on("exit", () => {
        bridge.dispose()
        process.exit(0)
    })
}

process.on("uncaughtException", (err) => {
    if (shellProc) {
        console.log("Killing shell because of uncaught error", shellProc.pid)
        shellProc.kill()
    }
    console.error(err)
    process.exit(1)
})