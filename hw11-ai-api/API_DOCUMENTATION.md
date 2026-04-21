# CS571 S26 AI API Documentation

Used to generate a response using GPT-5 Nano. **You are responsible for all traffic coming from your `X-CS571-ID`.** Failing to include a valid `X-CS571-ID` will result in a `401`.

## AI Responses

### `/responses` 

#### Request

`POST` `https://cs571api.cs.wisc.edu/rest/s26/hw11/ai/responses`

You must request an AI response with a JSON object containing `messages` — a list of input items. Each item is one of:
- **Chat message**: an object with a valid `role` ("developer", "assistant", or "user") and corresponding `content`.
- **Function call**: an object with `type: "function_call"`, `call_id`, `name`, and `arguments` (a JSON object, from a previous tool call response).
- **Function call output**: an object with `type: "function_call_output"`, `call_id`, and `output` (the result of executing a tool call).

Optionally, you may include:
- `tools` — an array of tool definitions the model may call. Each tool must have `type` set to `"function"`, a `name`, and optionally a `description` and `parameters` (a JSON Schema object).
- `tool_choice` — controls whether the model calls tools. Can be `"auto"` (default), `"none"`, `"required"`, or a specific tool like `{"type": "function", "name": "my_tool"}`.
- `response_schema` — a (simplified) JSON Schema object describing the shape of the response you want. The root must have `type: "object"`, objects must include a `properties` field, and arrays must include an `items` field. When provided, the model is constrained to produce JSON matching the schema, and the response `output` field will be the parsed object (instead of a `msg` string). You do not need to specify `additionalProperties` or `required` — those are added automatically for every object in your schema.

If both `tools` and `response_schema` are provided, the model decides which to use. If it calls a tool, you will receive a `tool_calls` response (the schema is ignored for that turn). If it answers directly, the reply conforms to `response_schema` and is returned as a parsed object in `output`. This is useful for agentic loops that should end with a structured final answer.

##### Request Body (Basic Response)
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

A `200` will be sent with `msg` set to the AI's response...
```json
{
    "msg": "I'm just a program, but I'm here and ready to help! How about you? What's on your mind?"
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

If the model decides to call a tool, a `200` will be sent with `tool_calls`. Each call has a `call_id`, `name`, and `arguments` (a JSON object)...
```json
{
    "tool_calls": [
        {
            "call_id": "call_abc123",
            "name": "get_weather",
            "arguments": { "location": "Madison" }
        }
    ]
}
```

##### Request Body (Structured Output)
```json
{
    "messages": [
        {
            "role": "user",
            "content": "Give me the weather in Madison."
        }
    ],
    "response_schema": {
        "type": "object",
        "properties": {
            "temperature": { "type": "number" },
            "condition": { "type": "string" }
        }
    }
}
```

When `response_schema` is provided, a `200` will be sent with `output` set to the parsed object matching your schema...
```json
{
    "output": {
        "temperature": 72,
        "condition": "sunny"
    }
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
            "arguments": { "location": "Madison" }
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

If the request is successful and the model did not call a tool, a `200` will be sent containing a `msg` with the AI's response...
```json
{
    "msg": "I'm just a program, but I'm here and ready to help! How about you? What's on your mind?"
}
```

If the request is successful and the model decided to call a tool, a `200` will be sent containing `tool_calls`. Each call has a `call_id`, `name`, and `arguments` (a JSON object of the tool's arguments)...
```json
{
    "tool_calls": [
        {
            "call_id": "call_abc123",
            "name": "get_weather",
            "arguments": { "location": "Madison" }
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

If your `tools` array is malformed, one of the following `400`s will be sent...

```json
{
    "msg": "The 'tools' must be an array of tool objects, each with type 'function' and a 'name'."
}
```

```json
{
    "msg": "The tool 'my_tool' has an invalid 'description'; it must be a string."
}
```

```json
{
    "msg": "The tool 'my_tool' has invalid 'parameters'; it must be a JSON Schema object."
}
```

```json
{
    "msg": "The tool 'my_tool' must have 'parameters' with type 'object' at the root level."
}
```

```json
{
    "msg": "The tool 'my_tool' has invalid 'parameters': Schema at .properties.foo must be an object."
}
```

If your `tool_choice` is malformed, the following `400` will be sent...

```json
{
    "msg": "The 'tool_choice' must be 'none', 'auto', 'required', or an object like { type: 'function', name: 'tool_name' }."
}
```

If your `response_schema` is malformed or invalid, one of the following `400`s will be sent...

```json
{
    "msg": "The 'response_schema' must be a JSON Schema object."
}
```

```json
{
    "msg": "The 'response_schema' must have type 'object' at the root level."
}
```

```json
{
    "msg": "Invalid type 'string' at root. Must be one of: string, number, integer, boolean, object, array, null."
}
```

```json
{
    "msg": "Object schema at root must have a 'properties' object."
}
```

```json
{
    "msg": "Array schema at root.items must have an 'items' field."
}
```

```json
{
    "msg": "Schema at .properties.foo must be an object."
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
