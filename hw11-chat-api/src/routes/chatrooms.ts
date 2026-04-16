import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';

export class CS571AllChatroomsRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/chatrooms';

    private readonly connector: CS571HW11DbConnector;
    private readonly chatrooms: string[];

    public constructor(chatrooms: string[], connector: CS571HW11DbConnector) {
        this.chatrooms = chatrooms;
        this.connector = connector;
    }

    public addRoute(app: Express): void {
        app.get(CS571AllChatroomsRoute.ROUTE_NAME, (req, res) => {
            res.status(200).set('Cache-control', 'public, max-age=60').send(this.chatrooms);
        })
    }

    public getRouteName(): string {
        return CS571AllChatroomsRoute.ROUTE_NAME;
    }
}
