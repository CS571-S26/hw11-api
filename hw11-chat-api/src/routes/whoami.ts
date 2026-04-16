import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import { CS571HW11TokenAgent } from '../services/hw11-token-agent';

export class CS571WhoAmIRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/whoami';

    private readonly connector: CS571HW11DbConnector;
    private readonly tokenAgent: CS571HW11TokenAgent;

    public constructor(connector: CS571HW11DbConnector, tokenAgent: CS571HW11TokenAgent) {
        this.connector = connector;
        this.tokenAgent = tokenAgent;
    }

    public addRoute(app: Express): void {
        app.get(CS571WhoAmIRoute.ROUTE_NAME, async (req, res) => {
            const user = await this.tokenAgent.validateToken(req.cookies['badgerchat_auth']);
            res.status(200).send({
                isLoggedIn: user ? true : false,
                user: user
            })
        })
    }

    public getRouteName(): string {
        return CS571WhoAmIRoute.ROUTE_NAME;
    }
}
