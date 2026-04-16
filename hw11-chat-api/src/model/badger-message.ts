
export default class BadgerMessage {
    readonly id: number;
    readonly poster: string;
    readonly title: string;
    readonly content: string;
    readonly chatroom: string;
    readonly created: Date;

    public constructor(
        id: number,
        poster: string,
        title: string,
        content: string,
        chatroom: string,
        created: Date,
    ) {
        this.id = id;
        this.poster = poster;
        this.title = title;
        this.content = content;
        this.chatroom = chatroom;
        this.created = created;
    }
}