<template>
    <div v-if="isSupported">
        <Button @click="copy(JSON.stringify(data))" :text="!copied ? 'Clipboard' : 'Copied'" />
    </div>
</template>

<script setup>
import { useClipboard } from "@vueuse/core";
const { copy, copied, isSupported } = useClipboard();
import Button from "./Elements/Button.vue";

const { data } = defineProps({
    data: Array,
});
</script>
