<template>
	<a class="btn">
		{{ text }}
		<div v-if="optText">
			<small>{{ optText }}</small>
		</div>
	</a>
</template>

<script setup>
defineProps({
	text: String,
	optText: String,
});
</script>

<style>
.btn {
	display: block;
	flex-grow: 1;
	padding: 0.8rem;
	color: #ffffff;
	text-align: center;
	border: 1px solid var(--success);
	border-radius: 4px;
	cursor: pointer;
	user-select: none;
}
.btn:hover {
	filter: brightness(120%);
}
.btn:active {
	filter: brightness(140%);
}
</style>
