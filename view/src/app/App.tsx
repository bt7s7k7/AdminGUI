import { defineComponent } from "vue"
import { DynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { AdminUIView } from "./AdminUIView"

export const App = defineComponent({
    name: "App",
    setup(props, ctx) {
        return () => (
            <DynamicsEmitter>
                <AdminUIView />
            </DynamicsEmitter>
        )
    }
})