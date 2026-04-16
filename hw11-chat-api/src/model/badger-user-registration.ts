export class BadgerUserRegistration {
    readonly username: string;
    readonly pin: string;
    readonly bid: string;

    public constructor(username: string, pin: string, bid: string) {
        this.username = username;
        this.pin = pin;
        this.bid = bid;
    }
}