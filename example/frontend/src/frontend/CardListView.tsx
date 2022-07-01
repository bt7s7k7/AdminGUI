import { mdiLinkVariant, mdiMonitor } from "@mdi/js"
import { defineComponent } from "vue"
import { Button } from "../vue3gui/Button"
import { Icon } from "../vue3gui/Icon"
import { STATE } from "./STATE"

export const CardListView = (defineComponent({
    name: "CardListView",
    setup(props, ctx) {
        return () => (
            <div class="flex-fill flex center">
                <div class="w-500 flex column border rounded pt-4 px-8 pb-8 gap-4">
                    <h1>
                        <Icon icon={mdiMonitor} class="mr-4" />
                        {STATE.cardsList.config.label}
                    </h1>
                    <div class="flex column gap-2">
                        {[...STATE.cardsList.config.cards.values()].map(card => (
                            <Button clear href={card.url} key={card.id} class="border rounded text-left p-2 flex row gap-2">
                                <div>
                                    <h2 class="m-0">
                                        <Icon icon={mdiLinkVariant} />
                                    </h2>
                                </div>
                                <div>
                                    <h2 class="m-0">{card.label}</h2>
                                    <div class="muted small">{card.url}</div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
}))