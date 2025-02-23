# Tailwind v3 to v4 Converter

A web-based tool to help you convert your Tailwind CSS v3
configuration and stylesheets to the new v4 syntax. This tool handles
the conversion of your `tailwind.config.ts/js` and `app.css` files to
match Tailwind CSS v4's new features and syntax changes.

## Features

- 🔄 Converts Tailwind v3 config to v4 CSS syntax
- 🎨 Handles DaisyUI theme configurations
- 📝 Processes typography plugin settings
- 🖥️ Converts screen breakpoints to `@custom-media`
- 🎯 Merges app.css with converted config into a single file
- ⚠️ Provides warnings and errors for potential issues

## Key Conversions

- Theme colors → CSS custom properties
- Screen breakpoints → `@custom-media`
- Typography settings → `@plugin` configurations
- DaisyUI themes → `@plugin "daisyui/theme"`
- CSS Structure:
  - Replace `@tailwindcss` imports with single `@import`
  - Convert `@apply` directives to new syntax
  - Update color syntax (especially for opacity)
  - Handle plugin configurations

## Usage

1. Visit the web interface
2. Paste your Tailwind v3 configuration in the first text area
3. Paste your app.css content in the second text area
4. Click "Convert to Tailwind v4"
5. Review the converted output and any warnings/errors
6. Copy the result to your clipboard

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Requirements

- Node.js 18+
- pnpm
- Tailwind CSS v4.0.0+
- SvelteKit v2.0.0+

## Testing

The project includes both unit and end-to-end tests:

```bash
# Run unit tests
pnpm test:unit

# Run e2e tests
pnpm test:e2e

# Run all tests
pnpm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
