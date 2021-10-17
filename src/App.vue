<template>
	<div class="wrapper">
		<div class="heading flex wrap space-between">
			<h1>MapCheckr</h1>
			<div v-if="!state.started" class="flex wrap gap">
				<Button @click="loadFromClipboard" text="Load from clipboard" />
				<input @change="loadFromJSON" type="file" id="file" class="input-file" accept="application/json" />
				<label for="file" class="btn">Import JSON</label>
			</div>
			<div v-if="state.finished" class="flex wrap gap">
				<Button @click="resetState" text="Reset" />
			</div>
		</div>

		<div class="wrapper__innner">
			<div v-if="error" class="container center danger">{{ error }}</div>

			<div v-if="state.loaded" class="container center">
				<h2 v-if="customMap.name">{{ customMap.name }}</h2>
				<p v-if="customMap.description" class="small">{{ customMap.description }}</p>
				<h4>{{ customMap.nbLocs }} imported {{ pluralize("location", customMap.nbLocs) }}</h4>
				<Button v-if="!state.started" @click="handleClickStart" class="mt-1" text="Start checking" />
			</div>

			<div v-if="!state.started">
				<div class="settings container">
					<div class="mtb-1">
						<Checkbox
							v-model:checked="settings.adjustHeading"
							label="Adjust heading towards the road"
							optText="only applies to locations pointing north by default"
						/>
						<div v-if="settings.adjustHeading" class="indent">
							<label class="flex wrap">
								Heading deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/-
								{{ settings.headingDeviation }}°)
							</label>
							<small>0° will points directly towards the road. </small>
						</div>
					</div>

					<div class="mtb-1">
						<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" optText="0 by default. -90° for tarmac/+90° for sky" />
						<label v-if="settings.adjustPitch" class="flex wrap indent">
							Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
						</label>
					</div>

					<div class="mtb-1">
						<Checkbox v-model:checked="settings.rejectByYear" label="Reject by year" />
						<div v-if="settings.rejectByYear" class="indent">
							Reject locations older than
							<select v-model.number="settings.minYear">
								<option v-for="n in 14">{{ 2007 + n }}</option>
							</select>
							<br />
							<small>&lt; 2008 is the best compromise to get rid of most of the gen 1 without rejecting early gen 2 (eg. whole Germany coverage)</small>
						</div>
					</div>
				</div>
			</div>

			<div v-if="state.started" class="container center">
				<h2 v-if="!state.finished">Processing<span class="one">.</span><span class="two">.</span><span class="three">.</span></h2>
				<h2 v-else>Results</h2>
				<p><Badge :text="state.step + '/' + customMap.nbLocs" /> {{ pluralize("location", customMap.nbLocs) }}</p>
				<p><Badge :number="state.success" /> success</p>
				<p><Badge changeClass :number="state.notFound" /> streetview not found</p>
				<p><Badge changeClass :number="state.unofficial" /> unofficial</p>
				<p><Badge changeClass :number="state.brokenLinks" /> broken links</p>
				<p><Badge changeClass :number="state.blurry" /> older than {{ settings.minYear }}</p>
			</div>

			<div v-if="state.finished" class="container">
				<h2 class="center">Export</h2>
				<div class="flex wrap space-between">
					<h3 class="success">{{ resolvedLocs.length }} resolved {{ pluralize("location", resolvedLocs.length) }}</h3>
					<div v-if="resolvedLocs.length > 0" class="flex wrap gap">
						<Button @click="copyToClipboard(resolvedLocs)" text="Copy to Clipboard" />
						<Button @click="exportToJsonFile(resolvedLocs)" text="Export as JSON" />
					</div>
				</div>
				<hr />
				<div class="flex wrap space-between">
					<h3 :class="rejectedLocs.length > 0 ? 'danger' : 'success'">{{ rejectedLocs.length }} rejected {{ pluralize("location", rejectedLocs.length) }}</h3>
					<div v-if="rejectedLocs.length > 0" class="flex wrap gap">
						<Button @click="copyToClipboard(rejectedLocs)" text="Copy to Clipboard" />
						<Button @click="exportToJsonFile(rejectedLocs, true)" text="Export as JSON" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { reactive, ref } from "vue";
import Button from "./components/Button.vue";
import Checkbox from "./components/Checkbox.vue";
import Badge from "./components/Badge.vue";

import { SVreq } from "./SVreq";

const settings = reactive({
	adjustHeading: false,
	headingDeviation: 0,
	adjustPitch: false,
	pitchDeviation: 0,
	rejectByYear: false,
	minYear: 2008,
});

const initialState = {
	loaded: false,
	started: false,
	finished: false,
	step: 0,
	success: 0,
	notFound: 0,
	unofficial: 0,
	brokenLinks: 0,
	blurry: 0,
};

const state = reactive({ ...initialState });

const customMap = ref({});

let mapToCheck = [];
const resolvedLocs = [];
const rejectedLocs = [];

const resetState = () => {
	Object.assign(state, initialState);
	customMap.value = {};
	mapToCheck.length = 0;
	resolvedLocs.length = 0;
	rejectedLocs.length = 0;
};

const error = ref("");

// Process
const handleClickStart = () => {
	state.started = true;
	start();
};

const start = () => {
	setTimeout(() => {
		state.step++;
		SVreq(mapToCheck.shift(), settings).then(
			(resolved) => {
				resolvedLocs.push(resolved);
				state.success++;
			},
			(rejected) => {
				rejectedLocs.push(rejected);
				switch (rejected.reason) {
					case "sv not found":
						state.notFound++;
						break;
					case "unofficial coverage":
						state.unofficial++;
						break;
					case "no link found":
						state.brokenLinks++;
						break;
					case "too old":
						state.blurry++;
						break;
				}
			}
		);

		if (mapToCheck.length > 0) {
			start();
		} else {
			state.finished = true;
		}
	}, 10);
};

// Import
const loadFromClipboard = () => {
	navigator.clipboard
		.readText()
		.then((data) => {
			checkJSON(data);
		})
		.catch((err) => {
			error.value = "Something went wrong.";
		});
};

const loadFromJSON = (e) => {
	const files = e.target.files || e.dataTransfer.files;
	if (!files.length) return;
	readFile(files[0]);
};

const readFile = (file) => {
	const reader = new FileReader();
	reader.onload = (e) => {
		checkJSON(e.target.result);
	};
	reader.readAsText(file);
};

const checkJSON = (data) => {
	try {
		const mapData = JSON.parse(data);
		if (!mapData?.customCoordinates?.length) {
			error.value = "Invalid map data";
			state.loaded = false;
			return;
		}
		error.value = "";

		customMap.value = { name: mapData.name, description: mapData.description, nbLocs: mapData.customCoordinates.length };
		mapToCheck = mapData.customCoordinates.map(({ panoId, countryCode, stateCode, ...keepAttrs }) => keepAttrs);
		state.loaded = true;
	} catch (err) {
		state.loaded = false;
		error.value = "Invalid map data";
	}
};

// Export
const copyToClipboard = (data) => {
	navigator.clipboard
		.writeText(
			JSON.stringify({
				name: customMap.value.name,
				description: customMap.value.description,
				customCoordinates: data,
			})
		)
		.then(() => {})
		.catch((err) => {
			console.log("Something went wrong", err);
		});
};

const exportToJsonFile = (data, isRejected = false) => {
	const dataUri =
		"data:application/json;charset=utf-8," +
		encodeURIComponent(
			JSON.stringify({
				name: customMap.value.name,
				description: customMap.value.description,
				customCoordinates: data,
			})
		);
	const fileName = `${customMap.value.name ? customMap.value.name : "Custom Map"} - ${isRejected ? "rejected" : "resolved"} ${data.length} ${pluralize(
		"location",
		data.length
	)}.json`;
	const linkElement = document.createElement("a");
	linkElement.setAttribute("href", dataUri);
	linkElement.setAttribute("download", fileName);
	linkElement.click();
};

const pluralize = (text, count) => (count > 1 ? text + "s" : text);
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Quicksand:400,700");
:root {
	--main: #0ebb93c5;
	--success: #2cecbfc5;
	--danger: #e66a6a;
}
*,
*::before,
*::after {
	box-sizing: border-box;
}
body {
	margin: 0 0.5em;
	background-color: #242424;
	font-family: "Quicksand", serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	font-size: 15px;
	color: #fff;
}
h1 {
	font-size: 2.2rem;
	line-height: 0.5em;
}
h1,
h2 {
	font-weight: 400;
}
h4 {
	margin: 0;
}
h2 {
	margin: 0 0 0.5rem 0;
}
p {
	line-height: 1em;
}
.indent {
	margin: 0.3em 0 0 1.6em;
}
.mtb-1 {
	margin: 1em 0 1em 0;
}
hr {
	height: 1px;
	background-color: var(--main);
	border: none;
}
select {
	outline: 0;
	overflow: hidden;
	background: #292929;
	color: #ffffff;
	border: 1px solid var(--main);
	padding: 5px 5px 5px 10px;
	border-radius: 5px;
	margin: 0 0.3em;
	cursor: pointer;
}
select:hover {
	filter: brightness(120%);
}
.wrapper {
	margin: 0 auto;
	max-width: 700px;
}
.wrapper__innner {
	border-radius: 0.25rem;
	box-shadow: 0 20px 40px -14px #00000066;
	display: flex;
	flex-direction: column;
	padding: 0.5rem 0.5rem 0 0.5rem;
	background-color: #303030;
}
.container {
	background: #3a3a3a;
	padding: 0.5em 1em;
	margin-bottom: 0.5em;
}
.flex {
	display: flex;
	align-items: center;
}
.wrap {
	flex-wrap: wrap;
}
.space-between {
	justify-content: space-between;
}
.gap {
	gap: 0.5rem;
}
.center {
	text-align: center;
}
.small {
	font-size: 0.8rem;
}
.mt-1 {
	margin-top: 0.5rem;
}
.success {
	color: var(--success);
}
.bg-success {
	background: var(--success);
}
.danger {
	color: var(--danger);
}
.bg-danger {
	background: var(--danger);
}
input[type="range"] {
	margin: 0 0.5em;
}
.input-file {
	display: none;
}
.one,
.three,
.two {
	opacity: 0;
	-webkit-animation: dot 1.3s infinite;
	animation: dot 1.3s infinite;
}
.one {
	-webkit-animation-delay: 0s;
	animation-delay: 0s;
}
.two {
	-webkit-animation-delay: 0.2s;
	animation-delay: 0.2s;
}
.three {
	-webkit-animation-delay: 0.3s;
	animation-delay: 0.3s;
}
@-webkit-keyframes dot {
	0% {
		opacity: 0;
	}
	50% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}
@keyframes dot {
	0% {
		opacity: 0;
	}
	50% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}
</style>
