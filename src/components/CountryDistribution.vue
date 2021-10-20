<template>
	<h2 v-if="loading" class="flex wrap justify-center">Calculating distribution <Spinner /></h2>
	<h2 v-else class="center">Distribution</h2>
	<div class="flex wrap">
		<div v-for="country in distribution" class="card mb-1">
			<span :class="`flag-icon flag-` + country.code"></span> {{ country.name ? country.name : "Undefined" }} <Badge :number="country.nb" />
		</div>
	</div>
</template>

<script setup>
import { ref, toRefs, onMounted } from "vue";
import Badge from "./Elements/Badge.vue";
import Spinner from "./Elements/Spinner.vue";

import codegrid from "codegrid-js";
const CG = codegrid.CodeGrid("./tiles/");
import { codesNames } from "@/utils/codesNames";

const props = defineProps({
	locations: Array,
});
const { locations } = toRefs(props);

const distribution = ref({});
const loading = ref(true);

onMounted(() => {
	getDistribution(locations.value);
});

const getDistribution = async (locations) => {
	const countryCodesArr = [];
	const promises = [];
	for (let location of locations) {
		promises.push(
			new Promise((resolve) => {
				CG.getCode(location.lat, location.lng, (error, code) => {
					console.log("🚀 ~ CG.getCode ~ code", code);
					countryCodesArr.push(code);
					resolve();
				});
			})
		);
	}

	Promise.allSettled(promises).then(() => {
		const occurrences = Object.entries(
			countryCodesArr.reduce(function(acc, curr) {
				return acc[curr] ? ++acc[curr] : (acc[curr] = 1), acc;
			}, {})
		).map(([key, value]) => ({
			code: key,
			name: codesNames[key],
			nb: value,
		}));
		// console.log(occurrences);

		const filtered = occurrences.sort((a, b) => b.nb - a.nb);
		distribution.value = filtered;
		loading.value = false;
	});
};
</script>
<style>
@import "../assets/flags/flag-icon.min.css";
.card {
	flex-basis: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: hsla(0, 0%, 70.6%, 0.1);
	border-radius: 5px;
	box-shadow: 1px 0 5px rgb(0 0 0 / 15%);
	padding: 0.5rem;
}
</style>
