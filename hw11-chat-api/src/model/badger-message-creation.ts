
export default class BadgerMessageCreation {
    readonly bid: string;
    readonly poster: string;
    readonly title: string;
    readonly content: string;
    readonly chatroom: string;

    public constructor(
        bid: string,
        poster: string,
        title: string,
        content: string,
        chatroom: string,
    ) {
        this.bid = bid;
        this.poster = poster;
        this.title = title;
        this.content = content;
        this.chatroom = chatroom;
    }
}