import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import { CS571HW11TokenAgent } from '../services/hw11-token-agent';
import BadgerMessageCreation from '../model/badger-message-creation';

export class CS571CreateMessageRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/messages';

    private readonly connector: CS571HW11DbConnector;
    private readonly tokenAgent: CS571HW11TokenAgent;

    private readonly chatrooms: string[];

    public constructor(chatrooms: string[], connector: CS571HW11DbConnector, tokenAgent: CS571HW11TokenAgent) {
        this.chatrooms = chatrooms;
        this.connector = connector;
        this.tokenAgent = tokenAgent;
    }

    public addRoute(app: Express): void {
        app.post(CS571CreateMessageRoute.ROUTE_NAME, this.tokenAgent.authenticateToken, async (req, res) => {
            const chatroom = req.query.chatroom as string;
            const title = req.body.title?.trim();
            const content = req.body.content?.trim();

            if (!this.chatrooms.includes(chatroom)) {
                res.status(404).send({
                    msg: "The specified chatroom does not exist. Chatroom names are case-sensitive."
                });
                return;
            }

            if (!title || !content) {
                res.status(400).send({
                    msg: "A request must contain a 'title' and 'content'"
                });
                return;
            }

            if (title.length > 128 || content.length > 1024) {
                res.status(413).send({
                    msg: "'title' must be 128 characters or fewer and 'content' must be 1024 characters or fewer"
                })
                return;
            }

            const newMessage = await this.connector.createMessage(
                new BadgerMessageCreation(
                    req.header('X-CS571-ID') as string,
                    (req as any).user.username,
                    title,
                    content,
                    chatroom
                )
            );

            res.status(200).send({
                msg: "Successfully posted message!",
                id: newMessage.id
            })

        })
    }

    public getRouteName(): string {
        return CS571CreateMessageRoute.ROUTE_NAME;
    }
}
