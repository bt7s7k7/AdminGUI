import { io } from "socket.io-client"
import { reactive } from "vue"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { EventListener } from "../eventLib/EventListener"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { CardListProxy } from "./CardListProxy"

class State extends EventListener {
    public cardsList: CardListProxy = null!

    protected init() {
        const socket = io()

        const context = new DIContext()
        context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        context.provide(StructSyncClient, "default")

        this.cardsList = context.instantiate(() => CardListProxy.default())

        this.cardsList.synchronize()
    }

    constructor() {
        super()
        const self = reactive(this) as State
        self.init()
        return self
    }
}

export const STATE = new State()
// @ts-ignore
window.state = STATE