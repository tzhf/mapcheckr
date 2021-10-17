<template>
	<span class="badge" :class="changeClass && number ? 'bg-danger' : 'bg-success'">{{ number }}{{ text }}</span>
</template>

<script setup>
defineProps({
	text: String,
	number: Number,
	changeClass: Boolean,
});
</script>

<style>
.badge {
	color: #000;
	font-weight: 700;
	padding: 0.1rem 0.3rem;
	border-radius: 0.2rem;
}
</style>
