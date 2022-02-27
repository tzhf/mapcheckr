const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
	return new Promise(async (resolve, reject) => {
		let callback = (res, status) => {
			if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "sv not found" });
			if (settings.rejectUnofficial) {
				if (res.location.pano.length != 22) return reject({ ...loc, reason: res.copyright.substring(6) });
				if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription) return reject({ ...loc, reason: "no description" });
			}
			if (Date.parse(res.imageDate) < Date.parse(settings.fromDate) || Date.parse(res.imageDate) > Date.parse(settings.toDate))
				return reject({ ...loc, reason: "out of date" });
			if (settings.adjustHeading && res.links.length > 0 && loc.heading == 0) {
				loc.heading = parseInt(res.links[0].heading) + randomInRange(-settings.headingDeviation, settings.headingDeviation);
			}
			if (settings.adjustPitch && loc.pitch == 0) {
				loc.pitch = settings.pitchDeviation;
			}
			if (settings.fixMisplaced) {
				loc.lat = res.location.latLng.lat();
				loc.lng = res.location.latLng.lng();
			}
			resolve(loc);
		}
		if(!loc.panoId){
			await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, callback).catch((e) => reject({ loc, reason: e.message }));
		}
		else{
			await SV.getPanoramaById(loc.panoId, callback).catch((e) => reject({ loc, reason: e.message }));
		}
	});
}

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
