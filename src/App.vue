<template>
	<div class="wrapper">
		<div class="heading flex flex-center wrap space-between">
			<h1>MapCheckr</h1>
			<div v-if="!state.started" class="flex flex-center wrap gap">
				<Button @click="loadFromClipboard" text="Load from clipboard" />
				<input @change="loadFromJSON" type="file" id="file" class="input-file" accept="application/json" />
				<label for="file" class="btn">Import JSON</label>
			</div>
			<div v-if="state.finished" class="flex flex-center wrap gap">
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

			<div v-if="!state.started" class="container">
				<div class="mtb-2">
					<Checkbox v-model:checked="settings.rejectUnofficial" label="Reject unofficial" optText="Uncheck for photospheres map" />
				</div>

				<div class="mtb-2">
					<Checkbox
						v-model:checked="settings.adjustHeading"
						label="Adjust heading towards the road"
						optText="only applies to locations pointing north by default"
					/>
					<div v-if="settings.adjustHeading" class="indent">
						<label class="flex flex-center wrap">
							Heading deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/- {{ settings.headingDeviation }}°)
						</label>
						<small>0° will point directly towards the road.</small>
					</div>
				</div>

				<div class="mtb-2">
					<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" optText="0 by default. -90° for tarmac/+90° for sky" />
					<label v-if="settings.adjustPitch" class="flex flex-center wrap indent">
						Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
					</label>
				</div>

				<div class="mtb-2">
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

			<div v-if="state.started" class="container center">
				<h2 v-if="!state.finished" class="flex wrap flex-center justify-center">Processing <Spinner /></h2>
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
				<div class="flex flex-center wrap space-between">
					<h3 class="success">{{ resolvedLocs.length }} resolved {{ pluralize("location", resolvedLocs.length) }}</h3>
					<div v-if="resolvedLocs.length" class="flex flex-center wrap gap">
						<Button @click="copyToClipboard(resolvedLocs)" text="Copy to Clipboard" />
						<Button @click="exportToJsonFile(resolvedLocs)" text="Export as JSON" />
					</div>
				</div>
				<hr />
				<div class="flex flex-center wrap space-between">
					<h3 :class="rejectedLocs.length ? 'danger' : 'success'">{{ rejectedLocs.length }} rejected {{ pluralize("location", rejectedLocs.length) }}</h3>
					<div v-if="rejectedLocs.length" class="flex flex-center wrap gap">
						<Button @click="copyToClipboard(rejectedLocs)" text="Copy to Clipboard" />
						<Button @click="exportToJsonFile(rejectedLocs, true)" text="Export as JSON" />
					</div>
				</div>
			</div>

			<div v-if="state.finished && resolvedLocs.length" class="container">
				<Distribution :locations="resolvedLocs" />
			</div>
		</div>
	</div>
</template>

<script setup>
import { reactive, ref } from "vue";
import Button from "@/components/Elements/Button.vue";
import Checkbox from "@/components/Elements/Checkbox.vue";
import Badge from "@/components/Elements/Badge.vue";
import Spinner from "@/components/Elements/Spinner.vue";

import Distribution from "@/components/CountryDistribution.vue";

import { SVreq } from "@/utils/SVreq";

const settings = reactive({
	rejectUnofficial: true,
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

Array.prototype.chunk = function (n) {
	if (!this.length) {
		return [];
	}
	return [this.slice(0, n)].concat(this.slice(n).chunk(n));
};

const start = async () => {
	const chunkSize = 100;
	for (let locationGroup of mapToCheck.chunk(chunkSize)) {
		const responses = await Promise.allSettled(locationGroup.map((l) => SVreq(l, settings)));
		for (let response of responses) {
			if (response.status === "fulfilled") {
				resolvedLocs.push(response.value);
				state.success++;
			} else {
				rejectedLocs.push(response.reason);
				switch (response.reason.reason) {
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
			state.step++;
		}
	}
	state.finished = true;
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
		mapToCheck = mapData.customCoordinates;
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
@import "@/assets/main.css";
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
</style>
