<template>
	<img alt="geoicon" src="@/assets/geoicon.png" />
</template>

<style scoped>
img {
	margin-left: 0.3em;
	width: 1.5em;
	animation: spin 10s infinite ease-in-out;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	50% {
		transform: rotate(360deg);
	}
	100% {
		transform: rotate(-360deg);
	}
}
</style>
