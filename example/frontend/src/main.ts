import { createApp } from "vue"
import { App } from "./app/App"
import { LIGHT_THEME } from "./vue3gui/themes/light"
import { ThemeSwitch } from "./vue3gui/ThemeSwitch"

new ThemeSwitch().registerTheme(LIGHT_THEME)

const app = createApp(App)

app.mount("#app")

