import { convert } from './simple';
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
					const typography_str = typography_match[1];
					const typography_config = {
						DEFAULT: {
							css: {},
						},
					};

					// Extract the DEFAULT.css object
					const default_css_match = typography_str.match(
						/DEFAULT\s*:\s*{\s*css\s*:\s*({[\s\S]*?})\s*}/,
					);
					if (default_css_match) {
						const css_str = default_css_match[1];

						// Parse the CSS object
						const css_config: Record<string, any> = {};

						// Match properties and their values
						const property_regex =
							/(\w+)\s*:\s*(null|['"]([^'"]*)['"]\s*|{[\s\S]*?}(?=\s*[,}])|[^,}]*)/g;
						let match;

						while ((match = property_regex.exec(css_str)) !== null) {
							const [_, key, value_str] = match;

							if (value_str.trim() === 'null') {
								css_config[key] = null;
							} else if (value_str.trim().startsWith('{')) {
								// Handle nested objects (like img)
								const nested_obj: Record<string, any> = {};
								const nested_props = value_str.match(
									/(\w+)\s*:\s*(['"]([^'"]*)['"]\s*|[^,}]*)/g,
								);

								if (nested_props) {
									nested_props.forEach((prop) => {
										const [nested_key, nested_value] = prop
											.split(':')
											.map((s) => s.trim().replace(/['"]/g, ''));
										nested_obj[nested_key] = nested_value;
									});
								}
								css_config[key] = nested_obj;
							} else {
								css_config[key] = value_str
									.trim()
									.replace(/['"]/g, '');
							}
						}

						typography_config.DEFAULT.css = css_config;
					}

					parsed.theme.extend.typography = typography_config;
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
			const daisyui_str = daisyui_match[1];
			const daisyui_config: Record<string, any> = {};

			// Extract darkTheme
			const dark_theme_match = daisyui_str.match(
				/darkTheme\s*:\s*['"]([^'"]+)['"]/,
			);
			if (dark_theme_match) {
				daisyui_config.darkTheme = dark_theme_match[1];
			}

			// Extract themes
			const themes_match = daisyui_str.match(/themes\s*:\s*([^,}]+)/);
			if (themes_match) {
				const themes_value = themes_match[1].trim();
				// Check if it's a function call
				if (themes_value.endsWith('()')) {
					daisyui_config.themes = true; // Default to all themes if it's a function call
				} else if (
					themes_value === 'true' ||
					themes_value === 'false'
				) {
					daisyui_config.themes = themes_value === 'true';
				} else {
					try {
						daisyui_config.themes = JSON.parse(themes_value);
					} catch {
						daisyui_config.themes = true; // Fallback to all themes
					}
				}
			}

			// Extract other boolean flags
			const logs_match = daisyui_str.match(/logs\s*:\s*(true|false)/);
			if (logs_match) {
				daisyui_config.logs = logs_match[1] === 'true';
			}

			parsed.daisyui = daisyui_config;
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

export const merge_and_convert = (
	config: any,
	css: any,
): ConversionResult => {
	// Convert config to string if it's an object
	const config_str =
		typeof config === 'string'
			? config
			: JSON.stringify(config, null, 2);
	const css_str = typeof css === 'string' ? css : '';

	return convert(config_str, css_str);
};

export { convert };
