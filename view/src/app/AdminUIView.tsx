import { mdiAlert, mdiChevronLeft, mdiReload } from "@mdi/js"
import { io } from "socket.io-client"
import { computed, defineComponent, reactive, ref, shallowRef, watch } from "vue"
import { unreachable } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { DISPOSE, isObjectDisposed } from "../eventLib/Disposable"
import { EventListener } from "../eventLib/EventListener"
import { RemoteUIProxy } from "../remoteUIFrontend/RemoteUIProxy"
import { RemoteUIView } from "../remoteUIFrontend/RemoteUIView"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { VirtualPeer } from "../virtualNetwork/VirtualPeer"
import { VirtualModemClient } from "../virtualNetworkModem/VirtualModem"
import { Button } from "../vue3gui/Button"
import { Circle } from "../vue3gui/Circle"
import { Icon } from "../vue3gui/Icon"
import { LoadingIndicator } from "../vue3gui/LoadingIndicator"
import { stringifyError } from "../vue3gui/util"

const peer = shallowRef<VirtualPeer>()
const clients = reactive(new Map<string, ClientInfo>())

{
    const context = new DIContext()
    context.provide(IDProvider, () => new IDProvider.Incremental())

    const socket = io()
    context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
    const modem = context.instantiate(() => new VirtualModemClient())
    VirtualPeer.make(modem.connect()).then(v => peer.value = v)

    function checkPeers() {
        if (!peer.value) {
            setTimeout(checkPeers, 500)
            return
        }

        peer.value.getPeers().then(peers => {
            const now = Date.now()
            clients.clear()
            for (const peer of peers) {
                if (peer.name.startsWith("anon.")) continue
                clients.set(peer.id, {
                    ...peer,
                    lastPing: now
                })
            }

            setTimeout(checkPeers, 500)
        })
    }

    checkPeers()
}

interface ClientInfo {
    id: string
    name: string
    lastPing: number
}

class ClientHandle extends EventListener {
    public connection: VirtualPeer.Connection | null = null
    public state = "Connecting…"
    protected context: DIContext | null = null
    public remoteUI: RemoteUIProxy | null = null
    public error: any = null

    public [DISPOSE]() {
        super[DISPOSE]()
        this.connection?.end()
        this.connection = null
        this.context?.dispose()
        this.context = null
        this.remoteUI = null
    }

    protected async init() {
        if (!peer.value) unreachable()
        const connection = await peer.value.connect(this.id)
        if (isObjectDisposed(this)) {
            connection.end()
            return
        }

        this.connection = connection
        this.state = "Initializing remote UI…"

        this.context = new DIContext()
        this.context.provide(MessageBridge, () => new MessageBridge.Generic(connection))
        this.context.provide(StructSyncClient, "default")

        this.connection.onEnd.add(this, () => {
            this.dispose()
        })

        const remoteUI = await RemoteUIProxy.make(this.context, { track: true })

        this.state = "Ready"
        this.error = null
        this.remoteUI = remoteUI
    }

    constructor(
        public readonly id: string
    ) {
        super()

        const self = reactive(this) as this

        self.init().catch(err => {
            self.state = "Waiting to reconnect…"
            self.error = err
        })

        return self
    }
}

export const AdminUIView = (defineComponent({
    name: "AdminUIView",
    setup(props, ctx) {
        const selected = ref<string | null>()
        const selectedHandle = ref<ClientHandle | null>()

        watch(selected, selected => {
            if (selectedHandle.value) {
                if (selectedHandle.value.id != selected) {
                    selectedHandle.value.dispose()
                    selectedHandle.value = null
                } else {
                    return
                }
            }

            if (selected) selectedHandle.value = new ClientHandle(selected)
        })

        let reloadPending: number | null = null
        //watch(() => selectedHandle.value?.state, (state) => {
        //    if (state == "Waiting to reconnect…" && reloadPending == null) {
        //        reloadPending = setTimeout(reload, 500)
        //    }
        //})

        watch(() => [selectedHandle.value?.remoteUI, selectedHandle.value?.state], ([remoteUI, state]) => {
            if (state == "Ready" && remoteUI == null) location.reload()
        })

        function reload() {
            if (!selectedHandle.value) return
            if (!selected.value) return

            if (reloadPending != null) {
                clearTimeout(reloadPending)
                reloadPending = null
            }

            const error = selectedHandle.value.error
            selectedHandle.value.dispose()
            selectedHandle.value = new ClientHandle(selected.value)
            selectedHandle.value.error = error
        }

        const state = computed(() => (
            peer.value == null ? (
                "Connecting…"
            ) : selectedHandle.value == null ? (
                "Connected"
            ) : (
                "[Client] " + selectedHandle.value.state
            )
        ))

        return () => (
            <div class="flex-fill flex column">
                <div class="border-bottom flex-basis-6 flex row center-cross px-2">
                    {selected.value != null && <>
                        <Button onClick={() => selected.value = null} clear> <Icon icon={mdiChevronLeft} /> </Button>
                        <Button onClick={reload} clear> <Icon icon={mdiReload} /> </Button>
                        <div class="ml-2">{clients.get(selected.value)?.name ?? selected.value}</div>
                    </>}
                    <div class="flex-fill"></div>

                    {state.value.endsWith("…") && <LoadingIndicator class="mr-2" inline />}
                    <div>{state.value}</div>
                </div>
                {selected.value == null ? (
                    <div class="flex-fill">
                        {clients.size > 0 ? (
                            <div class="absolute-fill p-2 scroll">
                                {[...clients.values()].map(client => (
                                    <Button onClick={() => selected.value = client.id} clear class="inline-flex row w-300 h-100 m-2 border rounded p-2 text-left">
                                        <div class="flex-fill">
                                            <div>{client.name}</div>
                                            <div class="muted">{client.id}</div>
                                        </div>
                                        <div class="flex-basis-100 h-fill flex center">
                                            {Date.now() - client.lastPing > 700 && <Circle class="w-50 h-50" indeterminate variant="primary" />}
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <div class="absolute-fill flex center">
                                <div class="muted">No clients detected</div>
                            </div>
                        )}
                    </div>
                ) : selectedHandle.value == null ? (
                    <div class="flex-fill flex center">
                        <LoadingIndicator />
                    </div>
                ) : selectedHandle.value.error != null ? (
                    <div class="flex-fill flex center">
                        <div class="border rounded flex column p-4 gap-2">
                            <h1 class="flex center text-danger pt-0">
                                <Icon icon={mdiAlert} />
                            </h1>
                            <pre class="m-0 text-danger">{stringifyError(selectedHandle.value.error)}</pre>
                            <div class="flex row gap-2 mt-4">
                                <LoadingIndicator inline />
                                {selectedHandle.value.state}
                            </div>
                        </div>
                    </div>
                ) : selectedHandle.value.remoteUI == null ? (
                    <div class="flex-fill flex center column gap-4">
                        <LoadingIndicator />
                        <div>{selectedHandle.value.state}</div>
                    </div>
                ) : (
                    <RemoteUIView route="/" remoteUI={selectedHandle.value.remoteUI} class="flex-fill" />
                )}
            </div>
        )
    }
}))