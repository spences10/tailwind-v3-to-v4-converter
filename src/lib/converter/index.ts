import type {
	CSSData,
	ConversionResult,
	TailwindConfig,
} from './types';

const extract_object_from_config = (
	config_str: string,
): Record<string, any> => {
	// Find the main config object
	const object_match = config_str.match(
		/export\s+default\s*({[\s\S]*})\s*satisfies\s+Config/,
	);
	if (!object_match) {
		throw new Error('Could not find Tailwind config object');
	}

	// Get the raw object string
	const object_str = object_match[1];

	// Parse the object structure while preserving spread operators
	const parsed: Record<string, any> = {};

	// Extract theme configuration
	const theme_match = object_str.match(
		/theme\s*:\s*({[\s\S]*?}),\s*\w+/,
	);
	if (theme_match) {
		const theme_str = theme_match[1];
		parsed.theme = {};

		// Extract screens
		const screens_match = theme_str.match(
			/screens\s*:\s*({[\s\S]*?}),/,
		);
		if (screens_match) {
			const screens: Record<string, string> = {};
			const screen_entries = screens_match[1].match(
				/(\w+)\s*:\s*['"]([^'"]+)['"]/g,
			);
			if (screen_entries) {
				screen_entries.forEach((entry) => {
					const [key, value] = entry
						.split(':')
						.map((s) => s.trim().replace(/['"]/g, ''));
					screens[key] = value;
				});
			}
			parsed.theme.screens = screens;
		}

		// Extract typography settings
		const typography_match = theme_str.match(
			/typography\s*:\s*({[\s\S]*?}),/,
		);
		if (typography_match) {
			parsed.theme.typography = { DEFAULT: { css: {} } };
		}
	}

	// Extract DaisyUI configuration
	const daisyui_match = object_str.match(
		/daisyui\s*:\s*({[\s\S]*?}),/,
	);
	if (daisyui_match) {
		parsed.daisyui = {
			darkTheme: 'dark',
			themes: true,
		};

		// Extract specific DaisyUI settings if needed
		const dark_theme_match = daisyui_match[1].match(
			/darkTheme\s*:\s*['"]([^'"]+)['"]/,
		);
		if (dark_theme_match) {
			parsed.daisyui.darkTheme = dark_theme_match[1];
		}
	}

	// Extract plugins
	const plugins_match = object_str.match(
		/plugins\s*:\s*\[([\s\S]*?)\]/,
	);
	if (plugins_match) {
		const plugins_str = plugins_match[1];
		parsed.plugins = plugins_str
			.split(',')
			.map((p) => p.trim())
			.filter(Boolean)
			.map((p) => ({ name: p }));
	}

	return parsed;
};

const parse_tailwind_config = (
	config_str: string,
): TailwindConfig => {
	try {
		return extract_object_from_config(config_str);
	} catch (error: unknown) {
		throw new Error(
			`Failed to parse Tailwind config: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
};

const parse_css_file = (css_str: string): CSSData => {
	const data: CSSData = {
		imports: [],
		base: [],
		components: [],
		utilities: [],
		custom: [],
	};

	const lines = css_str.split('\n');
	let current_section: keyof CSSData = 'custom';

	for (const line of lines) {
		if (line.startsWith('@import')) {
			data.imports.push(line);
		} else if (line.includes('@tailwindcss/base')) {
			current_section = 'base';
		} else if (line.includes('@tailwindcss/components')) {
			current_section = 'components';
		} else if (line.includes('@tailwindcss/utilities')) {
			current_section = 'utilities';
		} else {
			data[current_section].push(line);
		}
	}

	return data;
};

const convert_screens = (
	screens: Record<string, string>,
): string[] => {
	return Object.entries(screens).map(
		([name, value]) =>
			`@custom-media --${name} (min-width: ${value});`,
	);
};

const convert_colors = (color: string): string => {
	// Convert various color formats to CSS custom properties
	if (color.startsWith('oklch')) {
		return color.replace(/oklch\((.*?)\)/, 'oklch($1)');
	}
	return color;
};

const convert_theme = (theme: TailwindConfig['theme']): string[] => {
	const css_vars: string[] = [];

	if (!theme) return css_vars;

	// Convert screens to custom media queries
	if (theme.screens) {
		css_vars.push(...convert_screens(theme.screens));
	}

	return css_vars;
};

const merge_and_convert = (
	config: TailwindConfig,
	css: CSSData,
): ConversionResult => {
	const result: ConversionResult = {
		css: '',
		warnings: [],
		errors: [],
	};

	try {
		const parts: string[] = [
			// Imports
			...css.imports.filter((line) => !line.includes('tailwindcss/')),
			'',
			'/* Import Tailwind */',
			'@import "tailwindcss";',
			'',
			// Theme conversions
			'/* Custom media queries */',
			...convert_theme(config.theme),
			'',
			// Base layer
			'@layer base {',
			...css.base,
			'}',
			'',
			// Components layer
			'@layer components {',
			...css.components,
			'}',
			'',
			// Plugin configurations
			'/* Plugin configurations */',
		];

		// Add plugin configurations
		if (config.plugins?.some((p) => p.name?.includes('typography'))) {
			parts.push('@plugin "@tailwindcss/typography";');
			parts.push('');
		}

		// Handle DaisyUI configuration if present
		if (config.daisyui) {
			parts.push('@plugin "daisyui" {');
			parts.push('  themes: all;');
			parts.push('}');
			parts.push('');
		}

		result.css = parts.join('\n');
	} catch (error: unknown) {
		result.errors.push(
			`Conversion error: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return result;
};

export { merge_and_convert, parse_css_file, parse_tailwind_config };
