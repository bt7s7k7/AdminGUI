import { defineComponent } from "vue"
import { HelloWorld } from "../../view/HelloWorld"

export const Home = defineComponent({
    name: "Home",
    setup(props, ctx) {
        return () => (
            <HelloWorld />
        )
    }
})