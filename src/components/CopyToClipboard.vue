<template>
	<Button @click="copyToClipboard()" :text="text" />
</template>

<script setup>
import { ref } from "vue";
import Button from "./Elements/Button.vue";

const props = defineProps({
	customMap: Object,
	data: Array,
});

const text = ref("Clipboard");

const copyToClipboard = () => {
	navigator.clipboard
		.writeText(
			JSON.stringify({
				name: props.customMap.name,
				description: props.customMap.description,
				customCoordinates: props.data,
			})
		)
		.then(() => {
			text.value = "Copied";
			setTimeout(() => {
				text.value = "Clipboard";
			}, 1000);
		})
		.catch((err) => {
			console.log("Something went wrong", err);
		});
};
</script>
