const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "sv not found" });
			if (settings.rejectUnofficial) {
				if (!res.copyright.includes(" Google")) return reject({ ...loc, reason: "unofficial coverage" });
				if (res.links.length == 0) return reject({ ...loc, reason: "no link found" });
				if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription) return reject({ ...loc, reason: "no description" });
			}
			if (settings.adjustHeading && res.links.length > 0 && loc.heading == 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (Date.parse(res.imageDate) < Date.parse(settings.fromDate) || Date.parse(res.imageDate) > Date.parse(settings.toDate))
				return reject({ ...loc, reason: "out of date" });
			if (settings.adjustPitch) {
				loc.pitch = settings.pitchDeviation;
			}
			resolve(loc);
		}).catch((e) => reject({ loc, reason: e.message }));
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
