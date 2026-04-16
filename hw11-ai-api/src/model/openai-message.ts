import OpenAIMessageRole from "./openai-message-role";

export default class OpenAIMessage {
    readonly role: OpenAIMessageRole;
    readonly content: string;

    public constructor(
        role: OpenAIMessageRole,
        content: string,
    ) {
        this.role = role;
        this.content = content;
    }
}