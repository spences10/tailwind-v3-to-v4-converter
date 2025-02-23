export const plugin_patterns = {
	typography: {
		config_to_css: (config: any) => {
			const css_parts = ['@plugin "@tailwindcss/typography" {'];

			// Extract typography config from theme.extend
			const typography_config =
				config?.theme?.extend?.typography?.DEFAULT?.css;

			// Debug log
			console.log(
				'Typography config:',
				JSON.stringify(typography_config, null, 2),
			);

			if (
				typography_config &&
				typeof typography_config === 'object'
			) {
				// Process each property in the typography config
				Object.entries(typography_config).forEach(([key, value]) => {
					if (value === 'null' || value === null) {
						css_parts.push(`  ${key}: initial;`);
					} else if (typeof value === 'object' && value !== null) {
						css_parts.push(`  ${key} {`);
						Object.entries(value as Record<string, unknown>).forEach(
							([subKey, subValue]) => {
								css_parts.push(`    ${subKey}: ${String(subValue)};`);
							},
						);
						css_parts.push(`  }`);
					} else {
						css_parts.push(`  ${key}: ${String(value)};`);
					}
				});
			}

			// Debug log
			console.log('Generated CSS parts:', css_parts);

			css_parts.push('}');
			return css_parts;
		},
	},
	daisyui: {
		config_to_css: (config: any) => {
			const css_parts = [];
			if (config?.daisyui) {
				css_parts.push('@plugin "daisyui" {');

				// Handle themes configuration
				if (Array.isArray(config.daisyui.themes)) {
					// Convert theme array to DaisyUI v5 format
					const theme_str = config.daisyui.themes
						.map((theme: string | Record<string, unknown>) => {
							if (typeof theme === 'string') {
								return theme;
							}
							// Handle custom theme objects
							if (theme && typeof theme === 'object') {
								const theme_name = Object.keys(theme)[0];
								const theme_config = theme[theme_name] as Record<
									string,
									unknown
								>;
								if (theme_config) {
									css_parts.push(`  theme: {`);
									css_parts.push(`    name: "${theme_name}";`);
									Object.entries(theme_config).forEach(
										([key, value]) => {
											if (key !== 'name') {
												css_parts.push(`    ${key}: ${value};`);
											}
										},
									);
									css_parts.push(`  }`);
									return theme_name;
								}
							}
							return '';
						})
						.filter(Boolean);

					// Add theme list with modifiers
					if (theme_str.length > 0) {
						const default_theme = theme_str[0];
						const dark_theme =
							config.daisyui.darkTheme ||
							theme_str.find(
								(t: string) => t === 'dark' || t === 'night',
							);
						css_parts.push(
							`  themes: ${default_theme} --default${dark_theme ? `, ${dark_theme} --prefersdark` : ''}${theme_str.length > 2 ? ', ' + theme_str.slice(2).join(', ') : ''};`,
						);
					}
				} else if (config.daisyui.themes === true) {
					css_parts.push(
						'  themes: light --default, dark --prefersdark;',
					);
				}

				css_parts.push('}');

				// Add theme CSS variables if custom themes are defined
				if (Array.isArray(config.daisyui.themes)) {
					config.daisyui.themes.forEach(
						(theme: Record<string, unknown>) => {
							if (
								theme &&
								typeof theme === 'object' &&
								!Array.isArray(theme)
							) {
								Object.entries(theme).forEach(
									([theme_name, theme_config]) => {
										if (
											theme_config &&
											typeof theme_config === 'object'
										) {
											css_parts.push('');
											css_parts.push(`@theme {`);
											Object.entries(
												theme_config as Record<string, unknown>,
											).forEach(([key, value]) => {
												if (
													key.startsWith('--') ||
													key === 'font-family'
												) {
													css_parts.push(`  ${key}: ${value};`);
												} else if (
													!['name', 'parent'].includes(key)
												) {
													css_parts.push(
														`  --color-${key}: ${value};`,
													);
												}
											});
											css_parts.push(`}`);
										}
									},
								);
							}
						},
					);
				}
			}
			return css_parts;
		},
	},
};

export const css_patterns = {
	base: {
		html: (css: string) => {
			const html_match = css.match(/html\s*{([^}]*)}/);
			if (html_match) {
				return `@layer base {\n  html {\n    ${html_match[1].trim()}\n  }\n}`;
			}
			return '';
		},
		selection: (css: string) => {
			const selection_match = css.match(/::selection\s*{([^}]*)}/);
			if (selection_match) {
				return selection_match[1].replace(
					/oklch\(var\(--(\w+)\)\)/g,
					'var(--color-$1)',
				);
			}
			return '';
		},
		scrollbar: (css: string) => {
			const parts = [];
			const scrollbar_matches = {
				base: css.match(/\*\s*{\s*scrollbar[^}]*}/),
				track: css.match(/::-webkit-scrollbar-track\s*{([^}]*)}/),
				thumb: css.match(/::-webkit-scrollbar-thumb\s*{([^}]*)}/),
			};

			if (Object.values(scrollbar_matches).some((m) => m)) {
				parts.push('@layer base {');
				if (scrollbar_matches.base) {
					parts.push('  * {');
					parts.push(
						...(
							scrollbar_matches.base[0]?.match(/scrollbar[^;]+;/g) ||
							[]
						).map(
							(line) =>
								'    ' +
								line.replace(
									/oklch\(var\(--(\w+)\)\)/g,
									'var(--color-$1)',
								),
						),
					);
					parts.push('  }');
				}
				if (scrollbar_matches.track) {
					parts.push('  ::-webkit-scrollbar-track {');
					parts.push(
						'    ' +
							scrollbar_matches.track[1]
								.trim()
								.replace(
									/oklch\(var\(--(\w+)\)\)/g,
									'var(--color-$1)',
								),
					);
					parts.push('  }');
				}
				if (scrollbar_matches.thumb) {
					parts.push('  ::-webkit-scrollbar-thumb {');
					parts.push(
						'    ' +
							scrollbar_matches.thumb[1]
								.trim()
								.replace(
									/oklch\(var\(--(\w+)\)\)/g,
									'var(--color-$1)',
								),
					);
					parts.push('  }');
				}
				parts.push('}');
			}
			return parts.join('\n');
		},
	},
	components: {
		extract: (css: string) => {
			const components: Record<string, string> = {};
			const component_regex = /\.([a-zA-Z0-9_-]+)\s*{([^}]*)}/g;
			let match;

			while ((match = component_regex.exec(css)) !== null) {
				const [_, class_name, rules] = match;
				components[class_name] = rules.trim();
			}

			return components;
		},
	},
	theme: {
		colors: (colors: Record<string, string>) => {
			return Object.entries(colors).map(([name, value]) => {
				if (value.startsWith('#')) {
					return `  --color-${name}: ${value};`;
				} else if (value.startsWith('oklch')) {
					return `  --color-${name}: ${value};`;
				}
				return `  --color-${name}: ${value};`;
			});
		},
	},
};
