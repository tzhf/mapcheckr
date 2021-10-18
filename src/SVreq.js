const SV = new google.maps.StreetViewService();

export function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), 50, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) {
				reject({ ...loc, reason: "sv not found" });
				return;
			}
			if (!res.copyright.includes(" Google")) {
				reject({ ...loc, reason: "unofficial coverage" });
				return;
			}
			if (res.links.length == 0) {
				reject({ ...loc, reason: "no link found" });
				return;
			}
			if (settings.rejectByYear && parseInt(res.imageDate.split("-")[0]) < settings.minYear) {
				reject({ ...loc, reason: "too old" });
				return;
			}
			if (settings.adjustHeading && loc.heading == 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (settings.adjustPitch) {
				loc.pitch = settings.pitchDeviation;
			}
			// Optional, what's best ? {ing the fresh new google coords or keeping the old coords ?
			// loc.lat = res.location.latLng.lat();
			// loc.lng = res.location.latLng.lng();
			resolve(loc);
		}).catch((e) => reject({ loc, reason: e.message }));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
