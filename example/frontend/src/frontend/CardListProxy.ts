import { reactive } from "vue"
import { CardsListContract } from "../exampleCommon/CardsList"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class CardListProxy extends CardsListContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}