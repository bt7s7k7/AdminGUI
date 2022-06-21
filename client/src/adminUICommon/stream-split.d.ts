declare module "stream-split" {
    import { Transform } from "stream"

    const Split: new (separator: Buffer, options?: {
        /**
         * Use efficient buffer copy policy (instead of merging/concat temporary chunk).
         * This value is an indication on what the working page size might be. If needed,
         * this value WILL change according to data.
         */
        bufferSize: number
    }) => Transform
    export = Split
}