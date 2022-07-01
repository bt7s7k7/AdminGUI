import { defineComponent } from "vue"
import { CardListView } from "../frontend/CardListView"
import { DynamicsEmitter } from "../vue3gui/DynamicsEmitter"

export const App = defineComponent({
    name: "App",
    setup(props, ctx) {
        return () => (
            <DynamicsEmitter>
                <CardListView />
            </DynamicsEmitter>
        )
    }
})