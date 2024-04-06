<template>
    <Button @click="exportToJsonFile()" text="JSON" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const { data, isRejected } = defineProps({
    data: Array,
    isRejected: Boolean,
});

const exportToJsonFile = () => {
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const fileName = `${data.length} ${isRejected ? "rejected" : "resolved"} location${data.length > 1 ? "s" : ""}.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", fileName);
    linkElement.click();
};
</script>
