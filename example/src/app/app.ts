import { createServer } from "http"
import { join } from "path"
import { Server } from "socket.io"
import { AdminUIClient } from "../adminUIClient/AdminUIClient"
import { stringifyAddress } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { CardsListController } from "../example/CardsListController"
import { DATABASE } from "../example/DATABASE"
import { ENV } from "../example/ENV"
import { Config } from "../exampleCommon/CardsList"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import { RouteResolver } from "../remoteUIBackend/RemoteUIController"
import { StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import express = require("express")

const context = new DIContext()
context.provide(IDProvider, () => new IDProvider.Incremental())
const logger = context.provide(Logger, () => new NodeLogger())
context.provide(StructSyncServer, "default")

logger.info`Config: ${ENV}`

async function initAdminUI() {
    const client = await AdminUIClient.connect()
    if (client == null) {
        logger.warn`Cannot connect to AdminUI`
        return
    }

    logger.info`Connected to AdminUI`
    const { remoteUI } = await client.makeRemoteUI(ENV.ADMIN_UI_NAME)
    remoteUI.routes = new RouteResolver.Static({
        routes: {
            index: cardsList.ui
        }
    })
}

if (!DATABASE.tryGet("config")) {
    logger.warn`Creating default config`
    DATABASE.put("config", Config.default())
}

const cardsList = context.instantiate(() => new CardsListController({ config: DATABASE.get("config") }).register())

initAdminUI()

const app = express()
const server = createServer(app)
const io = new Server(server)

io.on("connect", socket => {
    const sessionContext = new DIContext(context)
    sessionContext.provide(IDProvider, () => new IDProvider.Incremental())
    sessionContext.provide(MessageBridge, () => new MessageBridge.Generic(socket))
    sessionContext.provide(StructSyncSession, "default")

    socket.on("disconnect", () => {
        sessionContext.dispose()
    })
})

app.use(express.static(join(ENV.BASE_DIR, "./frontend/dist"), {
    fallthrough: true
}), (req, res) => res.sendFile(join(ENV.BASE_DIR, "./frontend/dist/index.html")))

server.listen(ENV.PORT, () => {
    logger.info`Listening at ${"http://" + stringifyAddress(server.address())}`
})