const { readFileSync, existsSync } = require("node:fs");
const vm = require("node:vm");

const errors = [];

let code = readFileSync("js/data.js", "utf-8");
code = code.replace("const rawData", "var rawData");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const data = sandbox.rawData;
if (!Array.isArray(data)) {
	errors.push("js/data.js: rawData is not an array");
	report();
}

const VALID_SURFACES = ["Turf", "Dirt"];
const VALID_CATEGORIES = ["Sprint", "Mile", "Medium", "Long"];
const VALID_DIRECTIONS = ["Right", "Left", "Stretch"];

const seen = new Set();
for (const [i, entry] of data.entries()) {
	if (!entry.id || typeof entry.id !== "string") {
		errors.push(`Entry ${i}: missing or invalid "id"`);
		continue;
	}
	if (!entry.img || typeof entry.img !== "string") {
		errors.push(`Entry ${i} ("${entry.id}"): missing or invalid "img"`);
	}
	if (!entry.img.startsWith("http")) {
		errors.push(`Entry ${i} ("${entry.id}"): img URL must start with http`);
	}
	if (seen.has(entry.id)) {
		errors.push(`Duplicate id: "${entry.id}"`);
	}
	seen.add(entry.id);

	const line = entry.id;
	const parts = line.split(" ");
	if (parts.length < 4) {
		errors.push(`Entry ${i}: id "${entry.id}" has too few parts`);
		continue;
	}

	if (!VALID_SURFACES.includes(parts[1])) {
		errors.push(`Entry ${i}: unknown surface "${parts[1]}" in "${entry.id}"`);
	}

	const catMatch = line.match(/\((.*?)\)/);
	if (!catMatch) {
		errors.push(`Entry ${i}: missing category (Sprint/Mile/Medium/Long) in "${entry.id}"`);
	} else if (!VALID_CATEGORIES.includes(catMatch[1])) {
		errors.push(`Entry ${i}: unknown category "${catMatch[1]}" in "${entry.id}"`);
	}

	const dirMatch = line.match(/(Right|Left|Stretch)/);
	if (!dirMatch) {
		errors.push(`Entry ${i}: missing direction in "${entry.id}"`);
	}

	const runnerMatch = line.match(/Max Runners:\s*(\d+)/);
	if (!runnerMatch) {
		errors.push(`Entry ${i}: missing "Max Runners" in "${entry.id}"`);
	} else {
		const runners = Number.parseInt(runnerMatch[1]);
		if (runners < 12 || runners > 18) {
			errors.push(`Entry ${i}: unusual max runners ${runners} in "${entry.id}"`);
		}
	}
}

const ASSETS = [
	"icon.png", "social-preview.png", "style.css", "index.html",
	"js/data.js", "js/audio.js", "js/app.js",
];
for (const asset of ASSETS) {
	if (!existsSync(asset)) {
		errors.push(`Missing local asset: ${asset}`);
	}
}

function report() {
	if (errors.length > 0) {
		console.error("Validation errors:");
		for (const e of errors) {
			console.error(`  \u2716 ${e}`);
		}
		process.exit(1);
	}
	console.log(`\u2713 ${data.length} tracks validated, all local assets present`);
}

report();
