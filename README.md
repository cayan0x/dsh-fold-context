# dsh-fold-context

Auto-fold context/system messages in DSH conversation — collapse think blocks, tool calls, and tool results into grouped expandable bars.

## Features

- **Auto-detect & fold**: Think blocks, tool calls, tool results, and context injection messages are automatically collapsed
- **Multi-level grouping**: Adjacent foldable blocks (think + tool-call + tool-result) merge into a single group bar with sub-bars
- **Streaming-safe**: Debounced DOM scanning catches elements as they arrive during streaming
- **Transparent styling**: Minimal, neutral UI that blends with the conversation
- **Click to expand**: Each fold bar is clickable to reveal the hidden content

## Install

```bash
dsh plugin add https://github.com/panheng97/dsh-fold-context
```

Or manually: copy the plugin into your DSH profile's `packages/` directory.

## License

MIT