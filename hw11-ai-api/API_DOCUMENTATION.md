# CS571 S26 AI API Documentation

Used to generate a response using GPT-4o Mini. **You are responsible for all traffic coming from your `X-CS571-ID`.** Failing to include a valid `X-CS571-ID` will result in a `401`.

## AI Completions

### `/completions` 

#### Request

`POST` `https://cs571api.cs.wisc.edu/rest/s26/hw11/completions`

You must request an AI completion with a JSON object containing `messages` — a list of input items. Each item is one of:
- **Chat message**: an object with a valid `role` ("developer", "assistant", or "user") and corresponding `content`.
- **Function call**: an object with `type: "function_call"`, `call_id`, `name`, and `arguments` (from a previous tool call response).
- **Function call output**: an object with `type: "function_call_output"`, `call_id`, and `output` (the result of executing a tool call).

Optionally, you may include:
- `response_schema` — a JSON schema object to receive a structured JSON response. Follows [JSON Schema](https://json-schema.org/) syntax. You only need to specify `type` and `properties`. Supported types: `string`, `number`, `integer`, `boolean`, `object`, `array`, `enum`, `anyOf`.
- `tools` — an array of tool definitions the model may call. Each tool must have `type` set to `"function"`, a `name`, and optionally a `description` and `parameters` (a JSON Schema object).
- `tool_choice` — controls whether the model calls tools. Can be `"auto"` (default), `"none"`, `"required"`, or a specific tool like `{"type": "function", "name": "my_tool"}`.

##### Request Body (Basic Completion)
```json
{
    "messages": [
        {
            "role": "assistant",
            "content": "Welcome to BadgerChatGPT! Ask me anything."
        },
        {
            "role": "user",
            "content": "hey how are you"
        }
    ]
}
```

##### Request Body (Structured Output)
```json
{
    "messages": [
        {
            "role": "developer",
            "content": "Extract the student's name and major from their message."
        },
        {
            "role": "user",
            "content": "My name is Cole and I study Computer Science."
        }
    ],
    "response_schema": {
        "type": "object",
        "properties": {
            "name": { "type": "string" },
            "major": { "type": "string" }
        }
    }
}
```

##### Request Body (Tool Use)
```json
{
    "messages": [
        {
            "role": "user",
            "content": "What's the weather in Madison?"
        }
    ],
    "tools": [
        {
            "type": "function",
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": { "type": "string" }
                }
            }
        }
    ]
}
```

##### Request Body (Agentic Loop — Feeding Tool Results Back)

After receiving `tool_calls`, you execute the tool and feed the result back by including both the `function_call` and `function_call_output` items in the `messages` array alongside your chat messages.

```json
{
    "messages": [
        {
            "role": "user",
            "content": "What's the weather in Madison?"
        },
        {
            "type": "function_call",
            "call_id": "call_abc123",
            "name": "get_weather",
            "arguments": "{\"location\":\"Madison\"}"
        },
        {
            "type": "function_call_output",
            "call_id": "call_abc123",
            "output": "{\"temperature\": 72, \"condition\": \"sunny\"}"
        }
    ]
}
```

The `call_id` in `function_call_output` must match the `call_id` from the original `tool_calls` response. The `output` must be a string (typically `JSON.stringify` of the API response). When you feed tool results back, the AI will generate a natural language summary, returning a `200` with `{msg: "..."}`.

##### Request Headers
```json
{
    "Content-Type": "application/json",
    "X-CS571-ID": "ENTER_YOUR_BID"
}
```

#### Response

If the request is successful and no `response_schema` or `tools` were provided, a `200` will be sent containing a `msg` with the AI's response...
```json
{
    "msg": "I'm just a program, but I'm here and ready to help! How about you? What's on your mind?"
}
```

If the request is successful and a `response_schema` was provided, a `200` will be sent containing a JSON object matching your schema...
```json
{
    "name": "Cole",
    "major": "Computer Science"
}
```

If the request is successful and the model decided to call a tool, a `200` will be sent containing `tool_calls`...
```json
{
    "tool_calls": [
        {
            "type": "function_call",
            "id": "fc_abc123",
            "call_id": "call_abc123",
            "name": "get_weather",
            "arguments": "{\"location\":\"Madison\"}"
        }
    ]
}
```

If your request body is missing `messages`, the following `400` will be sent...

```json
{
    "msg": "The request body must contain 'messages'."
}
```

If your list of message objects is malformed, the following `400` will be sent...

```json
{
    "msg": "The request body does not contain a valid list of chat objects."
}
```

If your `response_schema` is not a valid object, the following `400` will be sent...

```json
{
    "msg": "The 'response_schema' must be a JSON schema object."
}
```

If your `tools` array is malformed, the following `400` will be sent...

```json
{
    "msg": "The 'tools' must be an array of tool objects, each with type 'function' and a 'name'."
}
```

If your request is too long, the following `413` will be sent...

```json
{
    "msg": "The request body is too long for the given context window."
}
```

If you make too many requests in a short period of time, the following `429` will be sent...

```json
{
    "msg": "Too many requests, please try again later."
}
```
