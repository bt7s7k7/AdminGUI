import { createServer } from "net"
import { tmpdir } from "os"
import { join } from "path"
import { pipeline } from "stream"
import { Task } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Disposable, DISPOSE } from "../eventLib/Disposable"
import { EventEmitter } from "../eventLib/EventEmitter"
import { VirtualNetworkInternals } from "../virtualNetwork/types"
import { VirtualRouter } from "../virtualNetwork/VirtualRouter"
import { VirtualModemServer } from "../virtualNetworkModem/VirtualModem"
import Split = require("stream-split")

const TEMP_DIR = tmpdir()
const DEFAULT_SOCKET_NAME = "admin_gui_ipc_" + process.pid

export class AdminUIBridge extends Disposable {
    public readonly server
    public path
    protected readonly router
    public readonly listening

    public [DISPOSE]() {
        super[DISPOSE]()
        this.server.close()
        this.router?.dispose()
    }

    constructor(
        {
            socketPath: path = process.platform == "win32" ? join("\\\\?\\pipe", DEFAULT_SOCKET_NAME) : join(TEMP_DIR, DEFAULT_SOCKET_NAME + ".sock"),
            parent = null as VirtualNetworkInternals.NetworkParentFacade | null
        } = {}
    ) {
        super()

        this.path = path
        const listening = new Task<string>()
        this.listening = listening.asPromise()

        if (!parent) {
            this.router = new VirtualRouter()
            parent = this.router.connect()
        } else {
            this.router = null
        }

        this.server = createServer((socket) => {
            const context = new DIContext()
            context.provide(IDProvider, () => new IDProvider.Incremental())
            const bus = {
                send(msg: any) {
                    socket.write(JSON.stringify(msg))
                    socket.write("\n")
                },
                onMessage: new EventEmitter<any>()
            }

            context.provide(MessageBridge, () => new MessageBridge.Generic(bus))
            const modem = context.instantiate(() => new VirtualModemServer(parent!))
            context.guard(modem)

            const errorHandler = (err: any) => {
                if (!err) return

                if (err.code == "ECONNRESET") {
                    return
                }

                throw err
            }

            const jsonStream = pipeline(
                socket,
                new Split(Buffer.from("\n")),
                errorHandler
            )

            jsonStream.on("data", (data) => {
                let object
                try {
                    object = JSON.parse(data.toString())
                } catch {
                    return
                }

                bus.onMessage.emit(object)
            })

            socket.on("close", () => {
                context.dispose()
            })
        })

        this.server.listen(path, () => {
            listening.resolve(path)
        })
    }
}