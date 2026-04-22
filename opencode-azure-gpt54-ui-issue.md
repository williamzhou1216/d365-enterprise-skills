# OpenCode UI + Azure GPT-5.4 Issue Report

## Summary

On this machine, OpenCode `1.4.5` can successfully talk to Azure OpenAI through the built-in `azure` provider, but the desktop UI session path is unstable with `azure/gpt-5.4`.

Observed behavior:

- A one-shot CLI run can succeed:
  - `~/.opencode/bin/opencode run --model azure/gpt-5.4 "你好"`
  - Output: `你好，有什么需要我处理的？`
- The desktop UI can show a contradictory pair of assistant outputs in the same turn:
  - `你好，请说你的目标。`
  - `I'm sorry, but I cannot assist with that request.`
- The session is then recorded as `finish: "content-filter"` even for simple prompts like `你好`.

This points to a client-side compatibility issue in OpenCode UI / streaming handling for Azure GPT-5.4, not a broken Azure deployment.

## Environment

- OpenCode version: `1.4.5`
- Working provider path: built-in `azure`
- Failing provider path: UI session using built-in `azure/gpt-5.4`
- Azure endpoint family: `...openai.azure.com/openai/v1`

## Confirmed Findings

### 1. Broken custom provider path

The custom `azureprovider` path based on `@ai-sdk/openai-compatible` is not reliable here:

- Earlier failures returned `401 invalid subscription key or wrong API endpoint`
- GPT-5.4 also failed with:
  - `Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.`

Because of that, the custom provider should not be used for this setup.

### 2. Built-in Azure provider can authenticate and answer

Direct one-shot OpenCode CLI calls using the built-in Azure provider work:

- `~/.opencode/bin/opencode run --model azure/gpt-5.4 "你好"`
- Successful reply observed in:
  - log: `/Users/zhoujun/.local/share/opencode/log/2026-04-15T062835.log`
  - session: `ses_2702c31a3ffexc2M6iP4667BHc`

### 3. UI session path can mis-handle the same model

For session `ses_2702b6c9cffe73CZh9H0aqWxUK`, the prompt was simply:

- `你好`

Recorded outputs in the same turn:

- `你好，请说你的目标。`
- `I'm sorry, but I cannot assist with that request.`

And the final message record was:

- provider: `azure`
- model: `gpt-5.4`
- finish: `content-filter`

Relevant local evidence:

- message row: `msg_d8fd49388001ujcN5GZhKkNgdy`
- parts:
  - `prt_d8fd4a316001YW4HFSjaRBzyzm`
  - `prt_d8fd4a31f001EFC3OmGy7bxlZK`
  - `prt_d8fd4a529001hdUkRRU0DVEcqN`

### 4. Azure model itself is not rejecting the same prompt

Direct Azure API testing outside OpenCode showed:

- Prompt `你好` returns normal content
- Prompt `你现在是什么模型` does not trigger content filtering either

That means the Azure deployment is basically healthy, and the false refusal is likely introduced by OpenCode UI/session handling rather than Azure policy alone.

## Reproduction

### Repro that succeeds

```bash
~/.opencode/bin/opencode run --model azure/gpt-5.4 "你好"
```

Expected and observed:

```text
你好，有什么需要我处理的？
```

### Repro that can fail in UI

1. Open a new desktop UI session
2. Choose `Build` + `gpt-5.4`
3. Send `你好`

Observed on this machine:

```text
你好，请说你的目标。
I'm sorry, but I cannot assist with that request.
```

## Current Best Workaround

- Keep `~/.config/opencode/opencode.jsonc` minimal so OpenCode uses the built-in `azure` provider
- Do not restore the custom `azureprovider` config
- For stable use, prefer one-shot CLI calls for Azure GPT-5.4
- If the UI session starts returning the refusal string, abandon that thread and start a fresh one

## Suggested Upstream Fix Areas

- Azure GPT-5.4 stream/final-answer handling in OpenCode UI
- Content-filter state handling when Azure emits multiple final text chunks in one turn
- Consistency between CLI one-shot path and desktop UI session path

