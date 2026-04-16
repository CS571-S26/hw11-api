import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import HW11SecretConfig from '../model/configs/hw11-secret-config';
import OpenAIMessageLog from '../model/openai-message-log';
import OpenAIMessage from '../model/openai-message';
import OpenAIMessageRole from '../model/openai-message-role';
import HW11PublicConfig from '../model/configs/hw11-public-config';

export class CS571AIStructuredOutputsRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/structured-outputs';

    private readonly connector: CS571HW11DbConnector;
    private readonly publicConfig: HW11PublicConfig;
    private readonly secretConfig: HW11SecretConfig;

    public constructor(connector: CS571HW11DbConnector, publicConfig: HW11PublicConfig, secretConfig: HW11SecretConfig) {
        this.connector = connector;
        this.publicConfig = publicConfig;
        this.secretConfig = secretConfig;
    }

    public addRoute(app: Express): void {
        app.post(CS571AIStructuredOutputsRoute.ROUTE_NAME, async (req, res) => {
            let isShort = req.query?.shortContext ? Boolean(req.query.shortContext) : false;

            const body = req.body;
            if (!body || typeof body !== 'object' || !body.messages || !body.response_schema) {
                res.status(400).send({
                    msg: "The request body must contain 'messages' and 'response_schema'."
                });
                return;
            }

            let messages;
            try {
                messages = CS571AIStructuredOutputsRoute.validateMessages(body.messages);
            } catch (e) {
                res.status(400).send({
                    msg: "The request body does not contain a valid list of chat objects."
                });
                return;
            }

            if (typeof body.response_schema !== 'object') {
                res.status(400).send({
                    msg: "The 'response_schema' must be a JSON schema object."
                });
                return;
            }

            const responseFormat = {
                type: "json_schema" as const,
                json_schema: {
                    name: "structured_output",
                    strict: true,
                    schema: CS571AIStructuredOutputsRoute.prepareSchema(body.response_schema)
                }
            };

            const len = messages.reduce((acc: number, msg: OpenAIMessage) => acc + msg.content.length, 0);
            if (isShort ? len > (this.publicConfig.MAX_INPUT_LENGTH / 4) : len > this.publicConfig.MAX_INPUT_LENGTH) {
                res.status(413).send({
                    msg: "The request body is too long for the given context window."
                });
                return;
            }

            try {
                const toLog = new OpenAIMessageLog(messages, req.header('X-CS571-ID') as string);
                await this.connector.log(toLog);

                const resp = await fetch(this.secretConfig.AI_COMPLETIONS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.secretConfig.AI_COMPLETIONS_SECRET}`
                    },
                    body: JSON.stringify({
                        messages: messages.reduce((acc: OpenAIMessage[], msg: OpenAIMessage) => [...acc, { role: msg.role, content: msg.content }], []),
                        max_completion_tokens: this.secretConfig.AI_COMPLETIONS_MAX_RESPONSE,
                        response_format: responseFormat
                    })
                })
                const data = await resp.json();
                const content = JSON.parse(data.choices[0].message.content);
                res.status(200).send(content);

            } catch (e) {
                res.status(500).send({
                    msg: "An unknown server error occured during exection. Try again in a few minutes."
                })
            }

        })
    }

    private static validateMessages(messages: any): OpenAIMessage[] {
        if (!Array.isArray(messages)) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        if (!messages.every((msg: any) => Object.keys(msg).includes("role") && Object.keys(msg).includes("content"))) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        if (!messages.every((msg: any) => {
            let keys = Object.keys(msg);
            return keys.includes("role") && keys.includes("content") && Object.values(OpenAIMessageRole).includes(msg.role);
        })) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        return messages as OpenAIMessage[];
    }

    private static prepareSchema(schema: any): any {
        if (!schema || typeof schema !== 'object') return schema;

        if (Array.isArray(schema)) {
            return schema.map(CS571AIStructuredOutputsRoute.prepareSchema);
        }

        const result: any = { ...schema };

        if (result.type === 'object' && result.properties) {
            result.additionalProperties = false;
            result.required = Object.keys(result.properties);
            for (const key of Object.keys(result.properties)) {
                result.properties[key] = CS571AIStructuredOutputsRoute.prepareSchema(result.properties[key]);
            }
        }

        if (result.items) {
            result.items = CS571AIStructuredOutputsRoute.prepareSchema(result.items);
        }

        if (result.anyOf) {
            result.anyOf = result.anyOf.map(CS571AIStructuredOutputsRoute.prepareSchema);
        }

        return result;
    }

    public getRouteName(): string {
        return CS571AIStructuredOutputsRoute.ROUTE_NAME;
    }
}
