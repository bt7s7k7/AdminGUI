import { createConnection, Socket } from "net"
import { pipeline } from "stream"
import { ADMIN_GUI_SOCKET_VARIABLE } from "../adminUICommon/const"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Disposable, DISPOSE } from "../eventLib/Disposable"
import { EventEmitter } from "../eventLib/EventEmitter"
import { RemoteUIController } from "../remoteUIBackend/RemoteUIController"
import { StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import { VirtualPeer } from "../virtualNetwork/VirtualPeer"
import { VirtualModemClient } from "../virtualNetworkModem/VirtualModem"
import Split = require("stream-split")

export class AdminUIClient extends Disposable {
    protected modem: VirtualModemClient
    protected context: DIContext

    public [DISPOSE]() {
        super[DISPOSE]()
        this.context.dispose()
    }

    public connect() {
        return this.modem.connect()
    }

    public async makeRemoteUI(name: string) {
        const innerContext = new DIContext()
        innerContext.provide(IDProvider, () => new IDProvider.Incremental())
        innerContext.provide(StructSyncServer, "default")
        const remoteUI = innerContext.instantiate(() => new RemoteUIController().register())
        const host = await VirtualPeer.make(this.modem.connect(), name)
        innerContext.guard(host)

        host.enableHost()
        host.onConnection.add(innerContext, (conn) => {
            const connContext = new DIContext(innerContext)
            connContext.provide(MessageBridge, () => new MessageBridge.Generic(conn))
            connContext.provide(StructSyncSession, "default")

            conn.onEnd.add(connContext, () => {
                connContext.dispose()
            })
        })

        return { remoteUI, context: innerContext }
    }

    constructor(
        public readonly socket: Socket
    ) {
        super()

        const context = new DIContext()
        this.context = context
        context.provide(IDProvider, () => new IDProvider.Incremental())
        const bus = {
            send(msg: any) {
                socket.write(JSON.stringify(msg))
                socket.write("\n")
            },
            onMessage: new EventEmitter<any>()
        }

        context.provide(MessageBridge, () => new MessageBridge.Generic(bus))

        const errorHandler = (err: any) => {
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
            this.dispose()
        })

        const modem = context.instantiate(() => new VirtualModemClient())
        context.guard(modem)
        this.modem = modem
    }

    public static connect(path = process.env[ADMIN_GUI_SOCKET_VARIABLE]) {
        return new Promise<AdminUIClient | null>((resolve, reject) => {
            if (!path) {
                resolve(null)
                return
            }

            const socket = createConnection(path, () => {
                socket.off("error", reject)
                resolve(new AdminUIClient(socket))
            })

            socket.on("error", reject)
        })
    }
}