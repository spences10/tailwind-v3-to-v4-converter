import { css_patterns, plugin_patterns } from './reference';
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
		parsed.theme = { extend: {} };

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

		// Extract typography settings from extend
		const extend_match = theme_str.match(
			/extend\s*:\s*({[\s\S]*?}),?\s*(?:}|$)/,
		);
		if (extend_match) {
			const typography_match = extend_match[1].match(
				/typography\s*:\s*({[\s\S]*?}),?\s*(?:}|$)/,
			);
			if (typography_match) {
				try {
					// Extract the typography config manually
					const typography_str = typography_match[1];

					// Create a structured object for typography config
					const typography_config = {
						DEFAULT: {
							css: {},
						},
					};

					// Helper function to parse nested objects
					const parse_nested_object = (
						str: string,
					): Record<string, any> => {
						const result: Record<string, any> = {};

						// Match all property definitions
						const property_regex =
							/(\w+)\s*:\s*(null|['"]([^'"]*)['"]\s*|{[\s\S]*?}(?=\s*,|\s*})|[^,}]*)/g;
						let match;

						while ((match = property_regex.exec(str)) !== null) {
							const [_, key, value_str] = match;

							// Handle different value types
							if (value_str.trim() === 'null') {
								result[key] = null;
							} else if (value_str.trim().startsWith('{')) {
								// Recursively parse nested objects
								result[key] = parse_nested_object(value_str);
							} else {
								// Clean up string values
								result[key] = value_str.trim().replace(/['"]/g, '');
							}
						}

						return result;
					};

					// Parse the entire typography object
					const parsed_typography =
						parse_nested_object(typography_str);
					if (parsed_typography.DEFAULT?.css) {
						(typography_config.DEFAULT.css as any) =
							parsed_typography.DEFAULT.css;
					}

					parsed.theme.extend.typography = typography_config;

					// Log for debugging
					console.log(
						'Parsed typography config:',
						JSON.stringify(typography_config, null, 2),
					);
				} catch (error) {
					console.warn('Failed to parse typography config:', error);
					parsed.theme.extend.typography = { DEFAULT: { css: {} } };
				}
			}
		}
	}

	// Extract DaisyUI configuration
	const daisyui_match = object_str.match(
		/daisyui\s*:\s*({[\s\S]*?}),/,
	);
	if (daisyui_match) {
		try {
			// Clean up the daisyui object string and parse it
			const daisyui_str = daisyui_match[1]
				.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
				.replace(/'/g, '"')
				.replace(/,(\s*[}\]])/g, '$1');
			parsed.daisyui = JSON.parse(daisyui_str);
		} catch (error) {
			console.warn('Failed to parse daisyui config:', error);
			parsed.daisyui = { themes: true };
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
		];

		// Process base layer
		const base_parts = [
			css_patterns.base.html(css.base.join('\n')),
			css_patterns.base.selection(css.base.join('\n')),
			css_patterns.base.scrollbar(css.base.join('\n')),
		].filter(Boolean);

		if (base_parts.length > 0) {
			parts.push('/* Base layer */');
			parts.push(...base_parts);
			parts.push('');
		}

		// Theme conversions
		const theme_parts = convert_theme(config.theme);
		if (theme_parts.length > 0) {
			parts.push('/* Custom media queries */');
			parts.push(...theme_parts);
			parts.push('');
		}

		// Components layer
		const components = css_patterns.components.extract(
			css.components.join('\n'),
		);
		if (Object.keys(components).length > 0) {
			parts.push('/* Components */');
			parts.push('@layer components {');
			Object.entries(components).forEach(([class_name, rules]) => {
				parts.push(`  .${class_name} {`);
				parts.push(`    ${rules}`);
				parts.push('  }');
			});
			parts.push('}');
			parts.push('');
		}

		// Plugin configurations
		parts.push('/* Plugin configurations */');

		// Typography plugin
		if (config.plugins?.some((p) => p.name?.includes('typography'))) {
			parts.push(...plugin_patterns.typography.config_to_css(config));
			parts.push('');
		}

		// DaisyUI plugin
		if (config.daisyui) {
			parts.push(...plugin_patterns.daisyui.config_to_css(config));
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
