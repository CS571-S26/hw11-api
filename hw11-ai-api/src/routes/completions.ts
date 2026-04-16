import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import HW11SecretConfig from '../model/configs/hw11-secret-config';
import OpenAIMessageLog from '../model/openai-message-log';
import OpenAIMessage from '../model/openai-message';
import OpenAIMessageRole from '../model/openai-message-role';
import HW11PublicConfig from '../model/configs/hw11-public-config';

export class CS571AICompletionsRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/completions';

    private readonly connector: CS571HW11DbConnector;
    private readonly publicConfig: HW11PublicConfig;
    private readonly secretConfig: HW11SecretConfig;

    public constructor(connector: CS571HW11DbConnector, publicConfig: HW11PublicConfig, secretConfig: HW11SecretConfig) {
        this.connector = connector;
        this.publicConfig = publicConfig;
        this.secretConfig = secretConfig;
    }

    public addRoute(app: Express): void {
        app.post(CS571AICompletionsRoute.ROUTE_NAME, async (req, res) => {
            let isShort = req.query?.shortContext ? Boolean(req.query.shortContext) : false;

            const body = req.body;
            if (!body || typeof body !== 'object' || !body.messages) {
                res.status(400).send({
                    msg: "The request body must contain 'messages'."
                });
                return;
            }

            let inputItems: any[];
            try {
                inputItems = CS571AICompletionsRoute.validateInput(body.messages);
            } catch (e) {
                res.status(400).send({
                    msg: "The request body does not contain a valid list of chat objects."
                });
                return;
            }

            const responseSchema = body.response_schema;
            const tools = body.tools;
            const toolChoice = body.tool_choice;

            if (responseSchema !== undefined && typeof responseSchema !== 'object') {
                res.status(400).send({
                    msg: "The 'response_schema' must be a JSON schema object."
                });
                return;
            }

            if (tools !== undefined) {
                if (!Array.isArray(tools) || !tools.every((t: any) =>
                    t.type === 'function' &&
                    typeof t.name === 'string'
                )) {
                    res.status(400).send({
                        msg: "The 'tools' must be an array of tool objects, each with type 'function' and a 'name'."
                    });
                    return;
                }
            }

            const len = inputItems.reduce((acc: number, item: any) => {
                if (item.content) return acc + item.content.length;
                if (item.arguments) return acc + item.arguments.length;
                if (item.output) return acc + item.output.length;
                return acc;
            }, 0);
            if (isShort ? len > (this.publicConfig.MAX_INPUT_LENGTH / 4) : len > this.publicConfig.MAX_INPUT_LENGTH) {
                res.status(413).send({
                    msg: "The request body is too long for the given context window."
                });
                return;
            }

            try {
                const messageItems = inputItems.filter((item: any) => item.role) as OpenAIMessage[];
                const toLog = new OpenAIMessageLog(messageItems, req.header('X-CS571-ID') as string);
                await this.connector.log(toLog);

                const openAIBody: any = {
                    input: inputItems.map((item: any) => {
                        if (item.type === 'function_call') {
                            return { type: item.type, call_id: item.call_id, name: item.name, arguments: item.arguments };
                        } else if (item.type === 'function_call_output') {
                            return { type: item.type, call_id: item.call_id, output: item.output };
                        } else {
                            return { role: item.role, content: item.content };
                        }
                    }),
                    max_output_tokens: this.secretConfig.AI_COMPLETIONS_MAX_RESPONSE
                };

                if (responseSchema) {
                    openAIBody.text = {
                        format: {
                            type: "json_schema",
                            name: "structured_output",
                            strict: true,
                            schema: CS571AICompletionsRoute.prepareSchema(responseSchema)
                        }
                    };
                }

                if (tools) {
                    openAIBody.tools = tools;
                    if (toolChoice) {
                        openAIBody.tool_choice = toolChoice;
                    }
                }

                const resp = await fetch(this.secretConfig.AI_COMPLETIONS_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": this.secretConfig.AI_COMPLETIONS_SECRET
                    },
                    body: JSON.stringify(openAIBody)
                });
                const data = await resp.json();

                const functionCalls = data.output.filter((item: any) => item.type === 'function_call');
                if (functionCalls.length > 0) {
                    res.status(200).send({
                        tool_calls: functionCalls
                    });
                } else {
                    const messageOutput = data.output.find((item: any) => item.type === 'message');
                    const text = messageOutput?.content?.find((c: any) => c.type === 'output_text')?.text ?? "";
                    if (responseSchema) {
                        const content = JSON.parse(text);
                        res.status(200).send(content);
                    } else {
                        res.status(200).send({
                            msg: text
                        });
                    }
                }
            } catch (e) {
                res.status(500).send({
                    msg: "An unknown server error occured during exection. Try again in a few minutes."
                })
            }

        })
    }

    private static validateInput(input: any): any[] {
        if (!Array.isArray(input)) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        const isValidMessage = (item: any) => {
            return item.role && item.content !== undefined &&
                   Object.values(OpenAIMessageRole).includes(item.role);
        };

        const isValidFunctionCall = (item: any) => {
            return item.type === 'function_call' &&
                   typeof item.call_id === 'string' &&
                   typeof item.name === 'string' &&
                   typeof item.arguments === 'string';
        };

        const isValidFunctionCallOutput = (item: any) => {
            return item.type === 'function_call_output' &&
                   typeof item.call_id === 'string' &&
                   typeof item.output === 'string';
        };

        if (!input.every((item: any) =>
            isValidMessage(item) || isValidFunctionCall(item) || isValidFunctionCallOutput(item)
        )) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        return input;
    }

    private static prepareSchema(schema: any): any {
        if (!schema || typeof schema !== 'object') return schema;

        if (Array.isArray(schema)) {
            return schema.map(CS571AICompletionsRoute.prepareSchema);
        }

        const result: any = { ...schema };

        if (result.type === 'object' && result.properties) {
            result.additionalProperties = false;
            result.required = Object.keys(result.properties);
            for (const key of Object.keys(result.properties)) {
                result.properties[key] = CS571AICompletionsRoute.prepareSchema(result.properties[key]);
            }
        }

        if (result.items) {
            result.items = CS571AICompletionsRoute.prepareSchema(result.items);
        }

        if (result.anyOf) {
            result.anyOf = result.anyOf.map(CS571AICompletionsRoute.prepareSchema);
        }

        return result;
    }

    public getRouteName(): string {
        return CS571AICompletionsRoute.ROUTE_NAME;
    }
}
