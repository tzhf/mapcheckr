<template>
	<h2 v-if="loading" class="flex wrap justify-center">Calculating distribution <Spinner /></h2>
	<h2 v-else class="center">Distribution</h2>
	<div class="flex wrap">
		<div v-for="country in distribution" class="card mb-1">
			<span :class="`flag-icon flag-` + country.code?.toLowerCase()"></span>
			<span>
				{{ country.name }}<small v-if="country.country"> ({{ country.country }})</small>
			</span>
			<Badge :number="country.nb" />
		</div>
	</div>
</template>

<script setup>
import { ref, toRefs, onMounted } from "vue";
import Badge from "./Elements/Badge.vue";
import Spinner from "./Elements/Spinner.vue";

import { getCountryCode } from "get-country-code";

const props = defineProps({
	locations: Array,
});
const { locations } = toRefs(props);

const distribution = ref([]);
const loading = ref(true);

onMounted(() => {
	getDistribution(locations.value);
});

const getDistribution = async (locations) => {
	const countryCodes = [];
	for (let location of locations) {
		countryCodes.push(getCountryCode({ lat: location.lat, lng: location.lng }));
	}

	countryCodes.forEach((country) => {
		const found = distribution.value.find((e) => e.name == country.name);
		found ? found.nb++ : distribution.value.push({ ...country, nb: 1 });
	});
	distribution.value.sort((a, b) => b.nb - a.nb);
	loading.value = false;
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
