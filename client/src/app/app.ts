/* eslint-disable no-console */
import { spawn } from "child_process"
import { AdminUIBridge } from "../adminUIBridge/AdminUIBridge"
import { AdminUIClient } from "../adminUIClient/AdminUIClient"
import { ADMIN_GUI_SOCKET_VARIABLE } from "../adminUICommon/const"
import { VirtualPeer } from "../virtualNetwork/VirtualPeer"
import { VirtualRouter } from "../virtualNetwork/VirtualRouter"

if (!process.env[ADMIN_GUI_SOCKET_VARIABLE]) {
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
}
