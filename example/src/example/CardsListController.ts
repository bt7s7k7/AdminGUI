import { cloneArray, makeRandomID, shallowClone } from "../comTypes/util"
import { Card, CardsListContract, Config } from "../exampleCommon/CardsList"
import { FormRenderer, TableRenderer, formEventToMutation } from "../remoteUIBackend/FormRenderer"
import { defineRouteController } from "../remoteUIBackend/RouteController"
import { UI } from "../remoteUICommon/UIElement"
import { DATABASE } from "./DATABASE"

export class CardsListController extends CardsListContract.defineController() {
    public ui = defineRouteController(ctx => {
        const form = ctx.form("form", Config.ref(), () => this.config.serialize())

        this.onMutate.add(this, mutation => {
            mutation = shallowClone(mutation)
            mutation.path = cloneArray(mutation.path)
            mutation.path.shift()

            form.update("all", mutation)
        })

        const submit = form.action("submit", event => {
            const mutation = formEventToMutation(event)
            mutation.path.unshift("config")
            this.mutate(mutation)
            DATABASE.setDirty()
        })

        const deleteCard = ctx.action("deleteCard", event => {
            const id = event.sender!.split(".")[1]
            this.mutate(v => v.config.cards.delete(id))
            DATABASE.setDirty()
        })

        const addCard = ctx.action("addCard", event => {
            const id = makeRandomID()
            this.mutate(v => v.config.cards.set(id, new Card({ id, label: "New Card", url: "http://example.com" })))
            DATABASE.setDirty()
        })

        const table = new TableRenderer({ type: Card.ref(), model: form.model.cards, onChange: submit, blacklist: ["id"] })
        const tableElement = table.render()
        tableElement.columns.push({
            key: "_delete",
            label: "",
            element: UI.frame({
                axis: "row",
                children: [
                    UI.button({
                        text: "Delete",
                        variant: "danger",
                        name: `${table.variable}_delete`,
                        onClick: deleteCard
                    })
                ]
            })
        })

        const formRenderer = new FormRenderer({ type: Config.ref(), model: form.id, onChange: submit })

        return () => (
            UI.frame({
                axis: "column",
                padding: "a2",
                gap: 2,
                children: [
                    formRenderer.renderFrame(),
                    tableElement,
                    UI.frame({
                        axis: "row",
                        gap: 2,
                        children: [
                            UI.button({
                                text: "Add Card",
                                onClick: addCard
                            })
                        ]
                    })
                ]
            })
        )
    })

}
