export type TailwindConfig = {
	theme?: {
		screens?: Record<string, string>;
		extend?: Record<string, any>;
		[key: string]: any;
	};
	plugins?: any[];
	daisyui?: {
		themes?: any[];
		darkTheme?: string;
		[key: string]: any;
	};
	[key: string]: any;
};

export type CSSData = {
	imports: string[];
	base: string[];
	components: string[];
	utilities: string[];
	custom: string[];
};

export type ConversionResult = {
	css: string;
	warnings: string[];
	errors: string[];
};
