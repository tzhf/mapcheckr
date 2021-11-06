<template>
	<Button @click="copyToClipboard()" text="Clipboard" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const props = defineProps({
	customMap: Object,
	data: Array,
});

const copyToClipboard = () => {
	navigator.clipboard
		.writeText(
			JSON.stringify({
				name: props.customMap.name,
				description: props.customMap.description,
				customCoordinates: props.data,
			})
		)
		.catch((err) => {
			console.log("Something went wrong", err);
		});
};
</script>
