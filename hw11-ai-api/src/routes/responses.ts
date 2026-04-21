import { Express } from 'express';

import { CS571Route } from "@cs571/api-framework/src/interfaces/route";
import { CS571HW11DbConnector } from '../services/hw11-db-connector';
import HW11SecretConfig from '../model/configs/hw11-secret-config';
import OpenAIMessageLog from '../model/openai-message-log';
import OpenAIMessage from '../model/openai-message';
import OpenAIMessageRole from '../model/openai-message-role';
import HW11PublicConfig from '../model/configs/hw11-public-config';

export class CS571AIResponsesRoute implements CS571Route {

    public static readonly ROUTE_NAME: string = (process.env['CS571_BASE_PATH'] ?? "") + '/responses';

    private readonly connector: CS571HW11DbConnector;
    private readonly publicConfig: HW11PublicConfig;
    private readonly secretConfig: HW11SecretConfig;

    public constructor(connector: CS571HW11DbConnector, publicConfig: HW11PublicConfig, secretConfig: HW11SecretConfig) {
        this.connector = connector;
        this.publicConfig = publicConfig;
        this.secretConfig = secretConfig;
    }

    public addRoute(app: Express): void {
        app.post(CS571AIResponsesRoute.ROUTE_NAME, async (req, res) => {
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
                inputItems = CS571AIResponsesRoute.validateInput(body.messages);
            } catch (e) {
                res.status(400).send({
                    msg: "The request body does not contain a valid list of chat objects."
                });
                return;
            }

            const tools = body.tools;
            const toolChoice = body.tool_choice;

            if (tools !== undefined) {
                if (!Array.isArray(tools) || !tools.every((t: any) =>
                    t && typeof t === 'object' &&
                    t.type === 'function' &&
                    typeof t.name === 'string'
                )) {
                    res.status(400).send({
                        msg: "The 'tools' must be an array of tool objects, each with type 'function' and a 'name'."
                    });
                    return;
                }
                for (const t of tools) {
                    if (t.description !== undefined && typeof t.description !== 'string') {
                        res.status(400).send({
                            msg: `The tool '${t.name}' has an invalid 'description'; it must be a string.`
                        });
                        return;
                    }
                    if (t.parameters !== undefined) {
                        if (typeof t.parameters !== 'object' || t.parameters === null || Array.isArray(t.parameters)) {
                            res.status(400).send({
                                msg: `The tool '${t.name}' has invalid 'parameters'; it must be a JSON Schema object.`
                            });
                            return;
                        }
                        if (t.parameters.type !== 'object') {
                            res.status(400).send({
                                msg: `The tool '${t.name}' must have 'parameters' with type 'object' at the root level.`
                            });
                            return;
                        }
                        const schemaError = CS571AIResponsesRoute.validateSchema(t.parameters);
                        if (schemaError) {
                            res.status(400).send({
                                msg: `The tool '${t.name}' has invalid 'parameters': ${schemaError}`
                            });
                            return;
                        }
                    }
                }
            }

            if (toolChoice !== undefined) {
                const isValidString = typeof toolChoice === 'string' && ['none', 'auto', 'required'].includes(toolChoice);
                const isValidObject = typeof toolChoice === 'object' && toolChoice !== null && !Array.isArray(toolChoice) &&
                    toolChoice.type === 'function' && typeof toolChoice.name === 'string';
                if (!isValidString && !isValidObject) {
                    res.status(400).send({
                        msg: "The 'tool_choice' must be 'none', 'auto', 'required', or an object like { type: 'function', name: 'tool_name' }."
                    });
                    return;
                }
            }

            const responseSchema = body.response_schema;
            if (responseSchema !== undefined) {
                if (typeof responseSchema !== 'object' || responseSchema === null || Array.isArray(responseSchema)) {
                    res.status(400).send({
                        msg: "The 'response_schema' must be a JSON Schema object."
                    });
                    return;
                }
                if (responseSchema.type !== 'object') {
                    res.status(400).send({
                        msg: "The 'response_schema' must have type 'object' at the root level."
                    });
                    return;
                }
                const schemaError = CS571AIResponsesRoute.validateSchema(responseSchema);
                if (schemaError) {
                    res.status(400).send({
                        msg: schemaError
                    });
                    return;
                }
            }

            const len = inputItems.reduce((acc: number, item: any) => {
                if (item.content) return acc + item.content.length;
                if (item.arguments) return acc + JSON.stringify(item.arguments).length;
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
                            return { type: item.type, call_id: item.call_id, name: item.name, arguments: JSON.stringify(item.arguments) };
                        } else if (item.type === 'function_call_output') {
                            return { type: item.type, call_id: item.call_id, output: item.output };
                        } else {
                            return { role: item.role, content: item.content };
                        }
                    }),
                    max_output_tokens: this.secretConfig.AI_RESPONSES_MAX_RESPONSE
                };

                if (tools) {
                    openAIBody.tools = tools;
                    if (toolChoice) {
                        openAIBody.tool_choice = toolChoice;
                    }
                }

                if (responseSchema) {
                    openAIBody.text = {
                        format: {
                            type: "json_schema",
                            name: "structured_output",
                            strict: true,
                            schema: CS571AIResponsesRoute.prepareSchema(responseSchema)
                        }
                    };
                }

                const resp = await fetch(this.secretConfig.AI_RESPONSES_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": this.secretConfig.AI_RESPONSES_SECRET
                    },
                    body: JSON.stringify({...openAIBody, model: 'gpt-5.4-nano'})
                });
                const data = await resp.json();

                const functionCalls = data.output.filter((item: any) => item.type === 'function_call');
                if (functionCalls.length > 0) {
                    res.status(200).send({
                        tool_calls: functionCalls.map((fc: any) => {
                            let parsedArgs: any = {};
                            try {
                                parsedArgs = fc.arguments ? JSON.parse(fc.arguments) : {};
                            } catch {
                                parsedArgs = fc.arguments;
                            }
                            return {
                                call_id: fc.call_id,
                                name: fc.name,
                                arguments: parsedArgs
                            };
                        })
                    });
                } else {
                    const messageOutput = data.output.find((item: any) => item.type === 'message');
                    const text = messageOutput?.content?.find((c: any) => c.type === 'output_text')?.text ?? "";
                    if (responseSchema) {
                        let parsed: any;
                        try {
                            parsed = JSON.parse(text);
                        } catch {
                            parsed = text;
                        }
                        res.status(200).send({
                            output: parsed
                        });
                    } else {
                        res.status(200).send({
                            msg: text
                        });
                    }
                }
            } catch (e) {
                res.status(500).send({
                    msg: "An unknown server error occured during exection. Please double-check your request body for validity, then try again in a few minutes."
                })
            }

        })
    }

    private static validateInput(input: any): any[] {
        if (!Array.isArray(input)) {
            throw new Error("The request body does not contain a valid list of chat objects.");
        }

        const isValidMessage = (item: any) => {
            return typeof item.content === 'string' &&
                   Object.values(OpenAIMessageRole).includes(item.role);
        };

        const isValidFunctionCall = (item: any) => {
            return item.type === 'function_call' &&
                   typeof item.call_id === 'string' &&
                   typeof item.name === 'string' &&
                   typeof item.arguments === 'object' &&
                   item.arguments !== null &&
                   !Array.isArray(item.arguments);
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

    private static validateSchema(schema: any): string | null {
        const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];

        const validate = (s: any, path: string = ''): string | null => {
            const loc = path || 'root';
            if (s === null || typeof s !== 'object' || Array.isArray(s)) {
                return `Schema at ${loc} must be an object.`;
            }

            if (s.type && !validTypes.includes(s.type)) {
                return `Invalid type '${s.type}' at ${path || 'root'}. Must be one of: ${validTypes.join(', ')}.`;
            }

            if (s.type === 'object') {
                if (!s.properties || typeof s.properties !== 'object' || Array.isArray(s.properties)) {
                    return `Object schema at ${path || 'root'} must have a 'properties' object.`;
                }
                for (const key of Object.keys(s.properties)) {
                    const err = validate(s.properties[key], `${path}.properties.${key}`);
                    if (err) return err;
                }
            }

            if (s.type === 'array') {
                if (!s.items) {
                    return `Array schema at ${path || 'root'} must have an 'items' field.`;
                }
                const err = validate(s.items, `${path}.items`);
                if (err) return err;
            }

            if (s.anyOf) {
                if (!Array.isArray(s.anyOf)) {
                    return `'anyOf' at ${path || 'root'} must be an array.`;
                }
                for (let i = 0; i < s.anyOf.length; i++) {
                    const err = validate(s.anyOf[i], `${path}.anyOf[${i}]`);
                    if (err) return err;
                }
            }

            return null;
        };

        return validate(schema);
    }

    private static prepareSchema(schema: any): any {
        if (!schema || typeof schema !== 'object') return schema;

        if (Array.isArray(schema)) {
            return schema.map(CS571AIResponsesRoute.prepareSchema);
        }

        const result: any = { ...schema };

        if (result.type === 'object' && result.properties) {
            result.additionalProperties = false;
            result.required = Object.keys(result.properties);
            for (const key of Object.keys(result.properties)) {
                result.properties[key] = CS571AIResponsesRoute.prepareSchema(result.properties[key]);
            }
        }

        if (result.items) {
            result.items = CS571AIResponsesRoute.prepareSchema(result.items);
        }

        if (result.anyOf) {
            result.anyOf = result.anyOf.map(CS571AIResponsesRoute.prepareSchema);
        }

        return result;
    }

    public getRouteName(): string {
        return CS571AIResponsesRoute.ROUTE_NAME;
    }
}
