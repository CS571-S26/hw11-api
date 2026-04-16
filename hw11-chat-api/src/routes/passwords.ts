import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";

export class CS571PasswordsRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/passwords';

    private readonly passwords: string[];

    public constructor(passwords: string[]) {
        this.passwords = passwords;
    }

    public addRoute(app: Express): void {
        app.get(CS571PasswordsRoute.ROUTE_NAME, (req, res) => {
            res.status(this.passwords.length).set('Cache-control', 'public, max-age=60').send({"msg": this.passwords.join("")});
        })
    }

    public getRouteName(): string {
        return CS571PasswordsRoute.ROUTE_NAME;
    }
}
