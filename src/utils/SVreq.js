const SV = new google.maps.StreetViewService();

export function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), 50, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "sv not found" });
			if (settings.rejectUnofficial && !res.copyright.includes(" Google")) return reject({ ...loc, reason: "unofficial coverage" });
			if (settings.rejectUnofficial && res.links.length == 0) return reject({ ...loc, reason: "no link found" });
			if (settings.rejectByYear && parseInt(res.imageDate.split("-")[0]) < settings.minYear) return reject({ ...loc, reason: "too old" });
			if (settings.adjustHeading && res.links.length && loc.heading == 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (settings.adjustPitch) {
				loc.pitch = settings.pitchDeviation;
			}
			resolve(loc);
		}).catch((e) => reject({ loc, reason: e.message }));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
