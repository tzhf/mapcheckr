const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
    return new Promise(async (resolve, reject) => {
        let callback = (res, status) => {
            if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "sv not found" });

            if (settings.rejectUnofficial) {
                if (res.location.pano.length != 22) return reject({ ...loc, reason: "unofficial coverage" });
                if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription)
                    return reject({ ...loc, reason: "no description" });
            }

            if (settings.rejectGen1 && res.tiles.worldSize.height === 1664) {
                return reject({ ...loc, reason: "gen 1" });
            }

            if (
                Date.parse(res.imageDate) < Date.parse(settings.fromDate) ||
                Date.parse(res.imageDate) > Date.parse(settings.toDate)
            ) {
                return reject({ ...loc, reason: "out of date" });
            }

            if (settings.rejectNoLinks && res.links.length === 0) {
                return reject({ ...loc, reason: "no link found" });
            }

            if (settings.setHeading && loc.heading === 0) {
                if (res.links.length === 0) {
                    loc.heading = parseInt(res.links[0].heading);
                    if (settings.randomHeadingDeviation) {
                        loc.heading += randomInRange(-settings.headingDeviation, settings.headingDeviation);
                    } else {
                        loc.heading += randomSign() * settings.headingDeviation;
                    }
                } else if (settings.rejectNoLinksIfNoHeading) {
                    return reject({ ...loc, reason: "no link found" });
                }
            }

            if (settings.updateHeading && res.links.length !== 0) {
                if (settings.randomHeadingDeviation) {
                    loc.heading =
                        getNearestHeading(res.links, loc.heading) +
                        randomInRange(-settings.headingDeviation, settings.headingDeviation);
                } else {
                    const arr = res.links.flatMap((link) => [
                        link.heading + settings.headingDeviation,
                        link.heading - settings.headingDeviation,
                    ]);

                    const newHeading = closest(arr, loc.heading);
                    loc.heading = newHeading;
                }
            }

            if (settings.adjustPitch) {
                loc.pitch = settings.pitchDeviation;
            }

            if (settings.fixMisplaced) {
                loc.lat = res.location.latLng.lat();
                loc.lng = res.location.latLng.lng();
            }

            if (settings.getLatestPano) {
                loc.panoId = res.time[res.time.length - 1].pano;
            }

            resolve(loc);
        };

        if (!loc.panoId) {
            await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, callback).catch(
                (e) => reject({ loc, reason: e.message })
            );
        } else {
            await SV.getPanoramaById(loc.panoId, callback).catch((e) => reject({ loc, reason: e.message }));
        }
    });
}
const randomSign = () => (Math.random() >= 0.5 ? 1 : -1);

const closest = (arr, num) => arr.reduce((a, b) => (Math.abs(b - num) < Math.abs(a - num) ? b : a));

const difference = (a, b) => {
    const d = Math.abs(a - b);
    return d > 180 ? 360 - d : d;
};

const getNearestHeading = (bs, a) => {
    const ds = bs.map((b) => difference(a, b.heading));
    return bs[ds.indexOf(Math.min.apply(null, ds))].heading;
};

const randomInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
