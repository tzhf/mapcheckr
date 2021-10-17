<template>
	<a class="btn">{{ text }}</a>
</template>

<script setup>
defineProps({
	text: String,
});
</script>

<style>
.btn {
	display: block;
	flex-grow: 1;
	color: #ffffff;
	padding: 0.8rem;
	font-size: 14px;
	text-transform: uppercase;
	border-radius: 4px;
	cursor: pointer;
	border: 1px solid var(--main);
	background-color: transparent;
	user-select: none;
}
.btn:hover {
	background-color: #ffffff0d;
	filter: brightness(125%);
}
.btn:active {
	filter: brightness(150%);
}
</style>
