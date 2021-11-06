<template>
	<Button @click="exportToJsonFile()" text="JSON" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	customMap: Object,
	data: Array,
	isRejected: Boolean,
});

const exportToJsonFile = () => {
	const dataUri =
		"data:application/json;charset=utf-8," +
		encodeURIComponent(
			JSON.stringify({
				name: props.customMap.name,
				description: props.customMap.description,
				customCoordinates: props.data,
			})
		);
	const fileName = `${props.customMap.name ? props.customMap.name : "Custom Map"} - ${props.data.length} ${props.isRejected ? "rejected" : "resolved"} location${
		props.data.length > 1 ? "s" : ""
	}.json`;
	const linkElement = document.createElement("a");
	linkElement.setAttribute("href", dataUri);
	linkElement.setAttribute("download", fileName);
	linkElement.click();
};
</script>
