import OpenAIMessage from "./openai-message";

export default class OpenAIMessageLog {
    readonly msgs: OpenAIMessage[];
    readonly bid: string;

    public constructor(
        msgs: OpenAIMessage[],
        bid: string
    ) {
        this.msgs = msgs;
        this.bid = bid;
    }
}