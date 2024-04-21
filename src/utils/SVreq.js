const SV = new google.maps.StreetViewService();

export default function SVreq(loc, settings) {
    return new Promise(async (resolve, reject) => {
        if (!loc.panoId) {
            await SV.getPanoramaByLocation(new google.maps.LatLng(loc.lat, loc.lng), settings.radius, checkPano).catch((e) =>
                reject({ loc, reason: e.message })
            );
        } else {
            await SV.getPanoramaById(loc.panoId, checkPano).catch((e) => reject({ loc, reason: e.message }));
        }

        function checkPano(res, status) {
            if (status != google.maps.StreetViewStatus.OK) return reject({ ...loc, reason: "SV_NOT_FOUND" });

            if (settings.rejectUnofficial) {
                if (res.location.pano.length != 22) return reject({ ...loc, reason: "UNOFFICIAL" });
                if (settings.rejectNoDescription && !res.location.description && !res.location.shortDescription)
                    return reject({ ...loc, reason: "NO_DESCRIPTION" });
            }

            const cameraGeneration = getCameraGeneration(res);
            const isPanoID = loc.panoId ? true : false;
            const isPanned = loc.heading !== 0;

            // Filter by gen
            if (!settings.filterByGen[cameraGeneration]) {
                return reject({ ...loc, reason: "WRONG_GENERATION" });
            }

            // Filter by date
            if (
                Date.parse(res.imageDate) < Date.parse(settings.filterByDate.from) ||
                Date.parse(res.imageDate) > Date.parse(settings.filterByDate.to)
            ) {
                return reject({ ...loc, reason: "OUT_OF_DATE_RANGE" });
            }

            // Filter by panorama links
            if (settings.rejectNoLinks && res.links.length === 0) {
                return reject({ ...loc, reason: "ISOLATED" });
            }
            if (settings.rejectNoLinksIfNoHeading && res.links.length === 0 && !isPanned) {
                return reject({ ...loc, reason: "ISOLATED" });
            }

            // Update coordinates
            if (settings.updateCoordinates) {
                loc.lat = res.location.latLng.lat();
                loc.lng = res.location.latLng.lng();
            }

            // Update to latest pano
            if (settings.updatePanoIDs) {
                loc.panoId = res.time[res.time.length - 1].pano;
            }

            if (
                res.links.length !== 0 &&
                ((settings.heading.filterBy.panoID && isPanoID) || (settings.heading.filterBy.nonPanoID && !isPanoID)) &&
                ((settings.heading.filterBy.panned && isPanned) || (settings.heading.filterBy.unpanned && !isPanned))
            ) {
                // Set heading
                let heading = 0;

                if (res.links.length === 1) {
                    heading = getHeading(settings.heading.directionBy["DEAD_END"], res);
                } else if (cameraGeneration) {
                    heading = getHeading(settings.heading.directionBy[cameraGeneration], res);
                }

                if (settings.heading.randomInRange) {
                    heading += randomInRange(settings.heading.range[0], settings.heading.range[1]);
                } else {
                    heading += Math.random() < 0.5 ? settings.heading.range[0] : settings.heading.range[1];
                }

                loc.heading = heading;

                // Set pitch
                if (settings.pitch.updatePitch) {
                    if (settings.pitch.randomInRange) {
                        loc.pitch = randomInRange(settings.pitch.range[0], settings.pitch.range[1]);
                    } else {
                        loc.pitch = Math.random() < 0.5 ? settings.pitch.range[0] : settings.pitch.range[1];
                    }
                }

                // Set zoom
                if (settings.zoom.updateZoom) {
                    if (settings.zoom.randomInRange) {
                        loc.zoom = randomInRange(settings.zoom.range[0], settings.zoom.range[1]);
                    } else {
                        loc.zoom = Math.random() < 0.5 ? settings.zoom.range[0] : settings.zoom.range[1];
                    }
                }
            }

            resolve(loc);
        }
    });
}

function getCameraGeneration(res) {
    const { worldSize } = res.tiles;
    switch (worldSize.height) {
        case 1664:
            return 1;
        case 6656:
            return 23;
        case 8192:
            return 4;
        default:
            return 0;
    }
}

function getHeading(direction, res) {
    const link = parseInt(res.links[0].heading);
    const forward = res.tiles.centerHeading;
    const backward = (res.tiles.centerHeading + 180) % 360;
    switch (direction) {
        case "link":
            return link;
        case "forward":
            return forward;
        case "backward":
            return backward;
        case "any":
            const randomInt = randomInRange(1, 3);
            return randomInt === 1 ? link : randomInt === 2 ? forward : backward;
    }
}

const randomInRange = (min, max) => Math.round((Math.random() * (max - min + 1) + min) * 100) / 100;

// const closest = (arr, num) => arr.reduce((a, b) => (Math.abs(b - num) < Math.abs(a - num) ? b : a));

// const difference = (a, b) => {
//     const d = Math.abs(a - b);
//     return d > 180 ? 360 - d : d;
// };

// const getNearestHeading = (bs, a) => {
//     const ds = bs.map((b) => difference(a, b.heading));
//     return bs[ds.indexOf(Math.min.apply(null, ds))].heading;
// };
