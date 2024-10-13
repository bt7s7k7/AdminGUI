import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class Card extends Struct.define("Card", {
    id: Type.string,
    label: Type.string,
    url: Type.string
}) { }

export class Config extends Struct.define("Config", {
    label: Type.string,
    cards: Card.ref().as(Type.map)
}) { }

Config.baseType.defineMigrations([
    {
        version: 1,
        desc: "Added label",
        migrate(handle, deserializer, overrides) {
            overrides.set("label", "")
        },
    }
])

export const CardsListContract = StructSyncContract.define(class CardsList extends Struct.define("CardsList", {
    config: Config.ref()
}) { }, {})
