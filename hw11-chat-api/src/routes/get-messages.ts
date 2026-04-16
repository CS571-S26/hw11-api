import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';

export class CS571GetMessagesRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/messages';

    private readonly connector: CS571HW11DbConnector;
    private readonly chatrooms: string[];

    public constructor(chatrooms: string[], connector: CS571HW11DbConnector) {
        this.chatrooms = chatrooms;
        this.connector = connector;
    }

    public addRoute(app: Express): void {
        app.get(CS571GetMessagesRoute.ROUTE_NAME, async (req, res) => {
            const chatroom = req.query.chatroom as string;
            const page = parseInt((req.query.page || "1") as string);
            if (!this.chatrooms.includes(chatroom)) {
                res.status(404).send({
                    msg: "The specified chatroom does not exist. Chatroom names are case-sensitive."
                });
                return;
            }

            if (isNaN(page) || page < 1 || page > 4) {
                res.status(400).send({
                    msg: "A page number must be between 1 and 4."
                });
                return;
            }

            const messages = await this.connector.getMessages(chatroom);

            const startIdx = (page - 1) * 25

            res.status(200).send({
                msg: "Successfully got the latest messages!",
                page: page,
                messages: messages.length < startIdx ? [] : messages.slice(startIdx, startIdx + 25)
            });
        })
    }

    public getRouteName(): string {
        return CS571GetMessagesRoute.ROUTE_NAME;
    }
}
