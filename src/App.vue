<template>
	<div class="wrapper">
		<div class="heading flex-center wrap space-between">
			<h1>MapCheckr</h1>
			<div v-if="!state.started" class="flex-center wrap gap">
				<Button @click="loadFromClipboard" text="Load from clipboard" />
				<input @change="loadFromJSON" type="file" id="file" class="input-file" accept="application/json" />
				<label for="file" class="btn">Import JSON</label>
			</div>
			<div v-if="state.finished" class="flex-center wrap gap">
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
				Radius<input type="number" v-model.number="settings.radius" @change="handleRadiusInput" />m<br />
				<small> Radius in which to search for a panorama.<br /> </small>
				<hr />

				<Checkbox v-model:checked="settings.rejectUnofficial" label="Reject unofficial" optText="Uncheck for photospheres map" />
				<hr />

				<div v-if="settings.rejectUnofficial">
					<Checkbox v-model:checked="settings.rejectNoDescription" label="Reject locations without description" />
					<small
						>This might prevent trekkers in most cases, but can reject regular streetview without description (eg. Mongolia/South Korea mostly don't have
						description)</small
					>
					<hr />
				</div>

				<Checkbox v-model:checked="settings.fixMisplaced" label="Fix misplaced locations" optText="Some of your locations might slightly change" />
				<hr />

				<div class="flex-center wrap">
					<Checkbox v-model:checked="settings.removeNearby" label="Reject location if there's already one within a " optText="" />
					<input type="number" v-model.number="settings.nearbyRadius" @change="handleNearbyRadiusInput" />m radius
				</div>
				<hr />

				<Checkbox
					v-model:checked="settings.adjustHeading"
					label="Adjust heading towards the road"
					optText="only applies to locations pointing north by default"
				/>
				<div v-if="settings.adjustHeading" class="indent">
					<label class="flex-center wrap">
						Heading deviation <input type="range" v-model.number="settings.headingDeviation" min="0" max="50" /> (+/- {{ settings.headingDeviation }}°)
					</label>
					<small>0° will point directly towards the road.</small>
				</div>
				<hr />

				<Checkbox v-model:checked="settings.adjustPitch" label="Adjust pitch" optText="0 by default. -90° for tarmac/+90° for sky" />
				<label v-if="settings.adjustPitch" class="flex-center wrap indent">
					Pitch deviation <input type="range" v-model.number="settings.pitchDeviation" min="-90" max="90" /> ({{ settings.pitchDeviation }}°)
				</label>
				<hr />

				<div class="flex space-between">
					<label>From</label>
					<input type="month" v-model="settings.fromDate" min="2007-01" :max="dateToday" />
				</div>
				<div class="flex space-between mtb-1">
					<label>To</label>
					<input type="month" v-model="settings.toDate" :max="dateToday" />
				</div>
			</div>

			<div v-if="state.started" class="container center">
				<h2 v-if="!state.finished" class="flex wrap flex-center justify-center">Processing <Spinner /></h2>
				<h2 v-else>Results</h2>
				<p><Badge :text="state.step + '/' + customMap.nbLocs" /> {{ pluralize("location", customMap.nbLocs) }}</p>
				<p><Badge :number="state.success" /> success</p>
				<p><Badge changeClass :number="state.notFound" /> streetview not found</p>
				<p><Badge changeClass :number="state.unofficial" /> unofficial</p>
				<p><Badge changeClass :number="state.noDescription" /> no description (potential trekker)</p>
				<p><Badge changeClass :number="state.outOfDate" /> doesn't match date criteria</p>
				<p v-if="settings.removeNearby"><Badge changeClass :number="state.tooClose" /> within the same ({{ settings.nearbyRadius }} m) radius</p>
			</div>

			<div v-if="state.finished" class="container">
				<h2 class="center">Export</h2>
				<div class="flex-center wrap space-between">
					<h3 class="success">{{ resolvedLocs.length }} resolved {{ pluralize("location", resolvedLocs.length) }}</h3>
					<div v-if="resolvedLocs.length" class="flex-center wrap gap">
						<CopyToClipboard :customMap="customMap" :data="resolvedLocs" />
						<ExportToJSON :customMap="customMap" :data="resolvedLocs" />
						<ExportToCSV :customMap="customMap" :data="resolvedLocs" />
					</div>
				</div>
				<hr />
				<div class="flex-center wrap space-between">
					<h3 :class="rejectedLocs.length ? 'danger' : 'success'">{{ rejectedLocs.length }} rejected {{ pluralize("location", rejectedLocs.length) }}</h3>
					<div v-if="rejectedLocs.length" class="flex-center wrap gap">
						<CopyToClipboard :customMap="customMap" :data="rejectedLocs" />
						<ExportToJSON :customMap="customMap" :data="rejectedLocs" isRejected />
						<ExportToCSV :customMap="customMap" :data="rejectedLocs" isRejected />
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

import CopyToClipboard from "@/components/CopyToClipboard.vue";
import ExportToJSON from "@/components/ExportToJSON.vue";
import ExportToCSV from "./components/ExportToCSV.vue";
import Distribution from "@/components/CountryDistribution.vue";

import SVreq from "@/utils/SVreq";

const dateToday = new Date().getFullYear() + "-" + ("0" + (new Date().getMonth() + 1)).slice(-2);

const settings = reactive({
	radius: 50,
	rejectUnofficial: true,
	rejectNoDescription: false,
	fixMisplaced: false,
	adjustHeading: true,
	headingDeviation: 0,
	adjustPitch: false,
	pitchDeviation: 0,
	fromDate: "2008-01",
	toDate: dateToday,
	removeNearby: false,
	nearbyRadius: 10,
});

const initialState = {
	loaded: false,
	started: false,
	finished: false,
	step: 0,
	success: 0,
	notFound: 0,
	unofficial: 0,
	noDescription: 0,
	brokenLinks: 0,
	outOfDate: 0,
	tooClose: 0,
};

const state = reactive({ ...initialState });

const customMap = ref({});

let mapToCheck = [];
let resolvedLocs = [];
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

const handleRadiusInput = (e) => {
	const value = parseInt(e.target.value);
	if (!value || value < 10) {
		settings.radius = 10;
	} else if (value > 1000) {
		settings.radius = 1000;
	}
};

const handleNearbyRadiusInput = (e) => {
	const value = parseInt(e.target.value);
	if (!value || value < 1) {
		settings.nearbyRadius = 1;
	} else if (value > 10000000) {
		settings.nearbyRadius = 10000000;
	}
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
					case "no description":
						state.noDescription++;
						break;
					case "no link found":
						state.brokenLinks++;
						break;
					case "out of date":
						state.outOfDate++;
						break;
				}
			}
			state.step++;
		}
	}
	if (settings.removeNearby) {
		const newArr = removeNearby(resolvedLocs, settings.nearbyRadius);
		state.tooClose = resolvedLocs.length - newArr.length;
		resolvedLocs.length = 0;
		resolvedLocs.push(...newArr);
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

const removeNearby = (arr, radius) => {
	const newArr = [];
	arr.forEach((point) => {
		const hasClosePoint = newArr.some((found) => haversineDistance({ lat: point.lat, lng: point.lng }, { lat: found.lat, lng: found.lng }) < radius);
		if (!hasClosePoint) newArr.push(point);
	});
	return newArr;
};

const haversineDistance = (mk1, mk2) => {
	const R = 6371.071;
	const rlat1 = mk1.lat * (Math.PI / 180);
	const rlat2 = mk2.lat * (Math.PI / 180);
	const difflat = rlat2 - rlat1;
	const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
	const km =
		2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
	return km * 1000;
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
