
export default class BadgerUser {
    readonly id: number;
    readonly username: string;

    public constructor(
        id: number,
        username: string
    ) {
        this.id = id;
        this.username = username;
    }
}