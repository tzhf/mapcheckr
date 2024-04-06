<template>
    <Button @click="exportToCSV()" text="CSV" />
</template>

<script setup>
import Button from "./Elements/Button.vue";

const { data, isRejected } = defineProps({
    data: Array,
    isRejected: Boolean,
});

const exportToCSV = () => {
    let csv = "";
    data.forEach((location) => (csv += location.lat + "," + location.lng + ",\n"));
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const fileName = `${data.length} ${isRejected ? "rejected" : "resolved"} location${data.length > 1 ? "s" : ""}.csv`;
    const linkElement = document.createElement("a");
    linkElement.href = dataUri;
    linkElement.download = fileName;
    linkElement.click();
};
</script>
