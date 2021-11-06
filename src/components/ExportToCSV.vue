<template>
	<Button @click="exportToCSV()" text="CSV" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	customMap: Object,
	data: Array,
	isRejected: Boolean,
});

const exportToCSV = () => {
	let csv = "";
	props.data.forEach((location) => (csv += location.lat + "," + location.lng + ",\n"));
	const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
	const fileName = `${props.customMap.name ? props.customMap.name : "Custom Map"} - ${props.data.length} ${props.isRejected ? "rejected" : "resolved"} location${
		props.data.length ? "s" : ""
	}.csv`;
	const linkElement = document.createElement("a");
	linkElement.href = dataUri;
	linkElement.download = fileName;
	linkElement.click();
};
</script>
